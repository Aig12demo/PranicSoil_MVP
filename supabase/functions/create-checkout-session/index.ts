import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import Stripe from "npm:stripe@16.2.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-04-10",
      typescript: true,
    });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        auth: {
          persistSession: false,
        },
      },
    );

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const { plan_type, profile_id, coupon_code } = await req.json();

    if (!plan_type || !profile_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get or create Stripe customer
    let stripeCustomerId: string;
    
    const { data: existingCustomer } = await supabaseAdmin
      .from("stripe_customers")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    if (existingCustomer?.stripe_customer_id) {
      stripeCustomerId = existingCustomer.stripe_customer_id;
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabaseUserId: user.id,
        },
      });

      stripeCustomerId = customer.id;

      // Save to database
      await supabaseAdmin
        .from("stripe_customers")
        .upsert({ id: user.id, stripe_customer_id: stripeCustomerId });
    }

    // Determine price ID
    const priceId = plan_type === "monthly"
      ? Deno.env.get("STRIPE_MONTHLY_PRICE_ID")
      : Deno.env.get("STRIPE_ANNUAL_PRICE_ID");

    if (!priceId) {
      return new Response(JSON.stringify({ error: "Price ID not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle coupon validation and discount
    let discountCoupon: string | undefined;
    if (coupon_code) {
      const { data: couponData } = await supabaseAdmin.rpc("validate_coupon", {
        coupon_code_input: coupon_code,
        user_id: user.id,
        plan_type_input: plan_type,
      });

      if (couponData && couponData.length > 0 && couponData[0].valid) {
        // Create Stripe coupon if it doesn't exist
        const couponId = coupon_code.toUpperCase();
        try {
          await stripe.coupons.retrieve(couponId);
        } catch (err) {
          // Coupon doesn't exist in Stripe, create it
          await stripe.coupons.create({
            id: couponId,
            percent_off: couponData[0].discount_percent,
            duration: "once",
          });
        }
        discountCoupon = couponId;

        // Record coupon usage
        await supabaseAdmin.rpc("record_coupon_usage", {
          coupon_code_input: coupon_code,
          user_id: user.id,
        });
      }
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          supabaseUserId: user.id,
        },
      },
      discounts: discountCoupon ? [{ coupon: discountCoupon }] : undefined,
      success_url: `${req.headers.get("origin")}/dashboard?subscription=success`,
      cancel_url: `${req.headers.get("origin")}/subscribe?canceled=true`,
      metadata: {
        supabaseUserId: user.id,
      },
    });

    return new Response(
      JSON.stringify({ checkout_url: session.url }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

