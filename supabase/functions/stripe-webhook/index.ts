import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import Stripe from "npm:stripe@14.14.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

console.log("Stripe webhook handler initialized");

Deno.serve(async (request) => {
  const signature = request.headers.get("Stripe-Signature");

  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  const body = await request.text();
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not set");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  console.log(`Processing event: ${event.type} (${event.id})`);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Log the event
  try {
    await supabase.from("stripe_events").insert({
      stripe_event_id: event.id,
      event_type: event.type,
      data: event.data as any,
      processed: false,
    });
  } catch (insertError) {
    console.error("Error logging event:", insertError);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(supabase, session);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(supabase, subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabase, subscription);
        break;
      }

      case "customer.subscription.trial_will_end": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleTrialWillEnd(supabase, subscription);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(supabase, invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(supabase, invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Mark event as processed
    await supabase
      .from("stripe_events")
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq("stripe_event_id", event.id);

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

// ============================================================================
// HANDLER FUNCTIONS
// ============================================================================

async function handleCheckoutCompleted(
  supabase: any,
  session: Stripe.Checkout.Session
) {
  console.log("Processing checkout.session.completed");

  const { customer, subscription: subscriptionId, metadata } = session;

  if (!customer || !subscriptionId || !metadata?.profile_id) {
    console.error("Missing required data in checkout session");
    return;
  }

  // Fetch the full subscription from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId as string);

  console.log(`Creating subscription for profile: ${metadata.profile_id}`);

  await upsertSubscription(supabase, subscription, metadata.profile_id);
  
  // Log history
  await supabase.from("subscription_history").insert({
    profile_id: metadata.profile_id,
    action: "created",
    new_status: subscription.status,
    notes: `Subscription created via checkout (${session.id})`,
  });
}

async function handleSubscriptionUpdate(
  supabase: any,
  subscription: Stripe.Subscription
) {
  console.log("Processing subscription update:", subscription.id);

  // Get the profile_id from subscription metadata
  const profileId = subscription.metadata.profile_id;

  if (!profileId) {
    console.error("No profile_id in subscription metadata");
    return;
  }

  // Get old subscription data for history
  const { data: oldSub } = await supabase
    .from("subscriptions")
    .select("status, plan_type")
    .eq("stripe_subscription_id", subscription.id)
    .single();

  await upsertSubscription(supabase, subscription, profileId);

  // Log history
  if (oldSub) {
    await supabase.from("subscription_history").insert({
      profile_id: profileId,
      action: "updated",
      old_status: oldSub.status,
      new_status: subscription.status,
      old_plan_type: oldSub.plan_type,
      notes: `Subscription updated`,
    });
  }
}

async function handleSubscriptionDeleted(
  supabase: any,
  subscription: Stripe.Subscription
) {
  console.log("Processing subscription deletion:", subscription.id);

  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("stripe_subscription_id", subscription.id)
    .single();

  if (!existingSub) {
    console.error("Subscription not found in database");
    return;
  }

  await supabase
    .from("subscriptions")
    .update({
      status: "canceled",
      canceled_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);

  // Log history
  await supabase.from("subscription_history").insert({
    subscription_id: existingSub.id,
    profile_id: existingSub.profile_id,
    action: "canceled",
    old_status: existingSub.status,
    new_status: "canceled",
    notes: "Subscription canceled",
  });

  console.log("Subscription canceled in database");
}

async function handleTrialWillEnd(
  supabase: any,
  subscription: Stripe.Subscription
) {
  console.log("Trial will end soon:", subscription.id);

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("profile_id, profiles!inner(email, full_name)")
    .eq("stripe_subscription_id", subscription.id)
    .single();

  if (sub) {
    console.log(`Notify user ${sub.profiles.email} that trial ends soon`);
    // TODO: Send email notification
  }
}

async function handleInvoicePaid(supabase: any, invoice: Stripe.Invoice) {
  console.log("Invoice paid:", invoice.id);

  if (!invoice.subscription) return;

  const subscription = await stripe.subscriptions.retrieve(
    invoice.subscription as string
  );

  const profileId = subscription.metadata.profile_id;
  if (!profileId) return;

  await upsertSubscription(supabase, subscription, profileId);

  // Log history
  await supabase.from("subscription_history").insert({
    profile_id: profileId,
    action: "renewed",
    new_status: subscription.status,
    notes: `Payment received ($${(invoice.amount_paid / 100).toFixed(2)})`,
  });
}

async function handlePaymentFailed(supabase: any, invoice: Stripe.Invoice) {
  console.log("Payment failed:", invoice.id);

  if (!invoice.subscription) return;

  const subscription = await stripe.subscriptions.retrieve(
    invoice.subscription as string
  );

  const profileId = subscription.metadata.profile_id;
  if (!profileId) return;

  // Update subscription status
  await supabase
    .from("subscriptions")
    .update({ status: "past_due" })
    .eq("stripe_subscription_id", subscription.id);

  // Log history
  await supabase.from("subscription_history").insert({
    profile_id: profileId,
    action: "payment_failed",
    new_status: "past_due",
    notes: `Payment failed for invoice ${invoice.id}`,
  });

  console.log("Subscription marked as past_due");
  // TODO: Send email notification
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function upsertSubscription(
  supabase: any,
  subscription: Stripe.Subscription,
  profileId: string
) {
  const priceId = subscription.items.data[0]?.price.id;
  const planType = getPlanTypeFromPrice(priceId);

  const subscriptionData = {
    profile_id: profileId,
    stripe_customer_id: subscription.customer as string,
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    plan_type: planType,
    status: subscription.status,
    amount_cents: subscription.items.data[0]?.price.unit_amount || 0,
    currency: subscription.items.data[0]?.price.currency || "usd",
    trial_ends_at: subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    canceled_at: subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000).toISOString()
      : null,
  };

  const { error } = await supabase
    .from("subscriptions")
    .upsert(subscriptionData, {
      onConflict: "stripe_subscription_id",
    });

  if (error) {
    console.error("Error upserting subscription:", error);
    throw error;
  }

  console.log(`Subscription ${subscription.id} upserted successfully`);
}

function getPlanTypeFromPrice(priceId: string): string {
  const monthlyPriceId = Deno.env.get("STRIPE_MONTHLY_PRICE_ID");
  const annualPriceId = Deno.env.get("STRIPE_ANNUAL_PRICE_ID");

  if (priceId === monthlyPriceId) return "monthly";
  if (priceId === annualPriceId) return "annual";

  // Fallback: check if price ID contains keywords
  if (priceId.includes("month")) return "monthly";
  if (priceId.includes("year") || priceId.includes("annual")) return "annual";

  console.warn(`Unknown price ID: ${priceId}, defaulting to monthly`);
  return "monthly";
}

