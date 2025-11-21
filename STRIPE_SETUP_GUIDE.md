# Stripe Setup Guide for Subscription System

## Overview
This guide will help you set up Stripe for the Pranic Soil subscription system.

---

## Step 1: Create Stripe Account

1. Go to https://stripe.com
2. Click "Start now" or "Sign up"
3. Create your account
4. Complete business verification (can take 1-2 days)

---

## Step 2: Get API Keys

### Development Keys (Test Mode)
1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy your keys:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`)

### Production Keys (Live Mode) - DO THIS LATER
1. Go to https://dashboard.stripe.com/apikeys
2. Copy your keys:
   - **Publishable key** (starts with `pk_live_`)
   - **Secret key** (starts with `sk_live_`)

---

## Step 3: Create Products in Stripe

### Create Monthly Plan
1. Go to https://dashboard.stripe.com/test/products
2. Click "+ Add product"
3. Fill in:
   - **Name:** Voice Access - Monthly
   - **Description:** Monthly access to Voice Assistant
   - **Pricing model:** Recurring
   - **Price:** $29.99
   - **Billing period:** Monthly
   - **Currency:** USD
   - **Free trial:** 7 days
4. Click "Save product"
5. **Copy the Price ID** (starts with `price_`)

### Create Annual Plan
1. Click "+ Add product" again
2. Fill in:
   - **Name:** Voice Access - Annual
   - **Description:** Annual access to Voice Assistant (Save $60)
   - **Pricing model:** Recurring
   - **Price:** $299.00
   - **Billing period:** Yearly
   - **Currency:** USD
   - **Free trial:** 7 days
3. Click "Save product"
4. **Copy the Price ID** (starts with `price_`)

---

## Step 4: Set Up Webhook

### Create Webhook Endpoint
1. Go to https://dashboard.stripe.com/test/webhooks
2. Click "+ Add endpoint"
3. **Endpoint URL:** `https://[YOUR-PROJECT-ID].supabase.co/functions/v1/stripe-webhook`
4. **Description:** Pranic Soil Subscription Webhook
5. **Events to send:** Select these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `customer.subscription.trial_will_end`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `checkout.session.completed`
6. Click "Add endpoint"
7. **Copy the Signing Secret** (starts with `whsec_`)

---

## Step 5: Configure Supabase Secrets

Run these commands in PowerShell (replace with your actual keys):

```powershell
# Stripe API Keys
supabase secrets set STRIPE_SECRET_KEY="sk_test_your_secret_key_here"
supabase secrets set STRIPE_PUBLISHABLE_KEY="pk_test_your_publishable_key_here"
supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret_here"

# Stripe Price IDs
supabase secrets set STRIPE_MONTHLY_PRICE_ID="price_monthly_id_here"
supabase secrets set STRIPE_ANNUAL_PRICE_ID="price_annual_id_here"
```

---

## Step 6: Create .env.local File

Create `PranicSoil_MVP/.env.local` with:

```env
# Stripe Publishable Keys (safe to expose in frontend)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here

# Price IDs
VITE_STRIPE_MONTHLY_PRICE_ID=price_monthly_id_here
VITE_STRIPE_ANNUAL_PRICE_ID=price_annual_id_here
```

**⚠️ NEVER commit .env.local to git!**

---

## Step 7: Run Database Migration

```powershell
cd PranicSoil_MVP
supabase db push
```

This will create all the subscription tables.

---

## Step 8: Update Pricing Config (Optional)

If you need to update the Stripe Price IDs in the database:

```sql
UPDATE public.pricing_config
SET stripe_price_id = 'price_monthly_id_here'
WHERE plan_type = 'monthly';

UPDATE public.pricing_config
SET stripe_price_id = 'price_annual_id_here'
WHERE plan_type = 'annual';
```

---

## Step 9: Deploy Edge Function

```powershell
supabase functions deploy stripe-webhook
```

---

## Testing

### Test Card Numbers (Test Mode Only)
- **Success:** 4242 4242 4242 4242
- **Decline:** 4000 0000 0000 0002
- **Requires 3D Secure:** 4000 0025 0000 3155

**Any future expiry date and any 3-digit CVC will work.**

### Test Subscription Flow
1. Sign up as a new user
2. Try to access Voice Agent → Should show subscription required
3. Go to subscription page
4. Enter test card: 4242 4242 4242 4242
5. Complete checkout
6. Wait for webhook to process (check logs)
7. Try Voice Agent again → Should work!

---

## Monitoring

### View Stripe Events
1. Go to https://dashboard.stripe.com/test/events
2. See all webhook events and their status

### View Supabase Logs
```powershell
supabase functions logs stripe-webhook --project-ref [YOUR-PROJECT-ID]
```

### Check Database
```sql
-- View all subscriptions
SELECT * FROM public.subscriptions;

-- View webhook events
SELECT * FROM public.stripe_events ORDER BY created_at DESC LIMIT 10;

-- View active subscriptions
SELECT 
  p.full_name,
  p.email,
  s.plan_type,
  s.status,
  s.current_period_end
FROM public.subscriptions s
JOIN public.profiles p ON s.profile_id = p.id
WHERE s.status IN ('trialing', 'active');
```

---

## Going Live

When ready to accept real payments:

1. Complete Stripe account verification
2. Create products in **Live Mode** (same as test mode)
3. Get **Live API keys**
4. Update Supabase secrets with live keys
5. Update `.env.local` with live publishable key
6. Create webhook in **Live Mode**
7. Test with real card
8. 🎉 You're live!

---

## Troubleshooting

### Webhook Not Working
1. Check webhook URL is correct
2. Verify webhook secret is set in Supabase
3. Check Supabase function logs for errors
4. Make sure all required events are selected

### Subscription Not Updating
1. Check Stripe dashboard → Events
2. Look for failed webhook deliveries
3. Check `public.stripe_events` table
4. Manually trigger webhook retry in Stripe

### Trial Not Working
1. Verify trial period is set on Stripe product
2. Check `trial_ends_at` in subscriptions table
3. Ensure `has_active_subscription` function includes 'trialing' status

---

## Support

- Stripe Docs: https://stripe.com/docs
- Supabase Docs: https://supabase.com/docs
- Stripe Support: https://support.stripe.com

---

## Quick Reference

### Important URLs
- Test Dashboard: https://dashboard.stripe.com/test/dashboard
- Live Dashboard: https://dashboard.stripe.com/dashboard
- API Keys: https://dashboard.stripe.com/test/apikeys
- Products: https://dashboard.stripe.com/test/products
- Webhooks: https://dashboard.stripe.com/test/webhooks
- Events: https://dashboard.stripe.com/test/events

### Supabase Commands
```powershell
# List secrets
supabase secrets list

# Set secret
supabase secrets set KEY="value"

# Deploy function
supabase functions deploy stripe-webhook

# View logs
supabase functions logs stripe-webhook

# Push database changes
supabase db push
```

---

**Next Steps:** Continue to the implementation files to complete the integration!

