# Stripe Subscription Deployment Checklist

## Before You Start

Make sure you have:
- ✅ Stripe test keys (provided)
- ✅ Supabase CLI installed
- ✅ Supabase project linked

## Step-by-Step Deployment

### 1. Create Stripe Products (5 minutes)

Go to: https://dashboard.stripe.com/test/products

**Create Monthly Product:**
```
Name: Pranic Soil Voice Assistant (Monthly)
Price: $29.99 USD
Billing: Recurring - Monthly
```
📋 Copy the **Price ID** → You'll need this for the setup script

**Create Annual Product:**
```
Name: Pranic Soil Voice Assistant (Annual)
Price: $299.00 USD
Billing: Recurring - Yearly
```
📋 Copy the **Price ID** → You'll need this for the setup script

---

### 2. Add Stripe Key to .env (1 minute)

Open your `.env` file and add:
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51SPvKAKYt2mzdtj0u5K3n7nl3ih8jj79OtVnTOz7da2rCzwJwvvtckunLq4rj0GDrN4IZE5Hgr0GyW8FsX9uhiPd00L4XpeWZT
```

✅ Save the file

---

### 3. Run Setup Script (5 minutes)

Open PowerShell and run:

```powershell
cd PranicSoil_MVP
.\setup-stripe.ps1
```

When prompted:
1. Enter your **Monthly Price ID** (from Step 1)
2. Enter your **Annual Price ID** (from Step 1)
3. For webhook secret, just press Enter for now (we'll set it in Step 4)

The script will:
- Set Supabase secrets
- Deploy database migrations
- Deploy 3 Edge Functions

---

### 4. Configure Stripe Webhook (3 minutes)

Go to: https://dashboard.stripe.com/test/webhooks

Click **+ Add endpoint**

**Endpoint URL:**
```
https://zilrthstnuxncufdgiys.supabase.co/functions/v1/stripe-webhook
```

**Select these events:**
- ✅ `customer.subscription.created`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`
- ✅ `invoice.payment_succeeded`
- ✅ `invoice.payment_failed`
- ✅ `checkout.session.completed`

Click **Add endpoint**

📋 Copy the **Signing Secret** (starts with `whsec_`)

Set the webhook secret:
```powershell
supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_YOUR_SECRET_HERE"
```

---

### 5. Test Everything (10 minutes)

#### Start Dev Server
```bash
npm run dev
```

#### Test Flow:
1. **Sign in** to your app
2. **Try Voice Assistant** (authenticated version)
   - Should show "Subscription Required" modal ✅
3. Click **"View Subscription Plans"**
   - Should see pricing page ✅
4. **Test subscription** with card: `4242 4242 4242 4242`
   - Use any future expiry and any CVC ✅
5. **Check database:**
   ```sql
   SELECT * FROM subscriptions;
   ```
   - Should see your subscription ✅
6. **Try Voice Assistant** again
   - Should work now! ✅
7. **Go to Profile**
   - Should see subscription status ✅
8. Click **"Manage Subscription"**
   - Should open Stripe Customer Portal ✅

#### Test Coupons:
1. Go to `/admin/coupons`
2. Create a coupon: `TEST50` with 50% discount
3. Go to `/subscribe`
4. Apply coupon code
5. Complete checkout with discount ✅

---

## Verification Checklist

Before going live, verify:

- [ ] Both products created in Stripe
- [ ] All 4 secrets set in Supabase (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_MONTHLY_PRICE_ID, STRIPE_ANNUAL_PRICE_ID)
- [ ] Publishable key in .env
- [ ] Database migrations applied
- [ ] All 3 Edge Functions deployed
- [ ] Webhook configured in Stripe
- [ ] Test subscription completed successfully
- [ ] Webhook received in Supabase (check logs)
- [ ] Voice Assistant requires subscription
- [ ] Coupon codes working
- [ ] Customer Portal opens

---

## Quick Commands Reference

**Deploy a single function:**
```bash
supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session
supabase functions deploy stripe-webhook
```

**Check secrets:**
```bash
supabase secrets list
```

**View function logs:**
```bash
supabase functions logs create-checkout-session
supabase functions logs stripe-webhook
```

**Push database migrations:**
```bash
supabase db push
```

---

## Stripe Test Cards

**Success:**
- `4242 4242 4242 4242` - Regular success
- `4000 0025 0000 3155` - 3D Secure required

**Failure:**
- `4000 0000 0000 9995` - Declined
- `4000 0000 0000 0002` - Declined (card_declined)

---

## Going to Production

When ready for production:

1. Switch to Stripe **Live Mode**
2. Create production products and get live Price IDs
3. Get live API keys (sk_live_... and pk_live_...)
4. Update all Supabase secrets with live keys
5. Update .env with live publishable key
6. Configure webhook with live endpoint
7. Test with real card (small amount)

---

## Support

If you run into issues:
- Check Stripe Dashboard > Developers > Events for webhook delivery
- Check Supabase Dashboard > Edge Functions > Logs
- Check browser console for frontend errors

Everything is ready to go! Just follow the steps above. 🚀

