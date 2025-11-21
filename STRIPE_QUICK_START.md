# Stripe Integration - Quick Start Guide

## ✅ What's Already Done

All the code is ready! Here's what's been implemented:

### UI Components
- **Subscription Page** (`/subscribe`) - Beautiful pricing page with coupon support
- **Admin Coupons Page** (`/admin/coupons`) - Full coupon management system
- **Voice Agent Access Control** - Checks subscription before allowing access
- **Subscription Status Widget** - Shows in user profile with management button

### Backend
- **Database Schema** - All tables created (subscriptions, coupons, stripe_customers)
- **Edge Functions** - All 3 functions ready to deploy
- **Webhook Handler** - Keeps your database in sync with Stripe

## 🚀 Quick Setup (15 minutes)

### Step 1: Create Stripe Products

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/products)
2. Click **+ Add product**

**Monthly Plan:**
- Name: `Pranic Soil Voice Assistant (Monthly)`
- Price: `$29.99 USD`
- Billing: `Recurring - Monthly`
- Save and copy the **Price ID** (starts with `price_`)

**Annual Plan:**
- Name: `Pranic Soil Voice Assistant (Annual)`
- Price: `$299.00 USD`
- Billing: `Recurring - Yearly`
- Save and copy the **Price ID** (starts with `price_`)

### Step 2: Run the Setup Script

Open PowerShell in your project directory and run:

```powershell
cd PranicSoil_MVP
.\setup-stripe.ps1
```

The script will:
1. Ask for your Price IDs
2. Ask for your Webhook Secret (we'll get this in Step 3)
3. Set all Supabase secrets
4. Deploy database migrations
5. Deploy all Edge Functions

### Step 3: Configure Webhook

1. Go to [Stripe Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click **+ Add endpoint**
3. **Endpoint URL:** 
   ```
   https://zilrthstnuxncufdgiys.supabase.co/functions/v1/stripe-webhook
   ```
4. **Select events:**
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `checkout.session.completed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)
7. Re-run the setup script or manually set it:
   ```powershell
   supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_xxxxx"
   ```

### Step 4: Add Publishable Key to Frontend

Add this line to your `.env` file:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51SPvKAKYt2mzdtj0u5K3n7nl3ih8jj79OtVnTOz7da2rCzwJwvvtckunLq4rj0GDrN4IZE5Hgr0GyW8FsX9uhiPd00L4XpeWZT
```

### Step 5: Test!

1. Start your dev server:
   ```bash
   npm run dev
   ```

2. Sign in to your app

3. Try to use the Voice Assistant (authenticated version)
   - Should show "Subscription Required" modal

4. Click "View Subscription Plans"
   - Should see pricing page

5. Try a test subscription:
   - Use Stripe test card: `4242 4242 4242 4242`
   - Any future expiry date
   - Any CVC

6. Check your Supabase database:
   ```sql
   SELECT * FROM subscriptions;
   ```

## 🎫 Testing Coupons

### Create a Test Coupon

1. Go to `/admin/coupons`
2. Click **Create Coupon**
3. Example:
   - Code: `TESTOFF`
   - Discount: `50` (50% off)
   - Max Uses: `10`
   - Expires: (leave empty for no expiration)

### Test the Coupon

1. Go to `/subscribe`
2. Enter coupon code: `TESTOFF`
3. Click **Apply**
4. See the discount applied in the order summary

## 🔑 Your Stripe Keys

**Test Mode Keys** (configure in your environment):
- **Publishable Key:** `pk_test_...` (add your key from Stripe Dashboard)
- **Secret Key:** `sk_test_...` (add your key from Stripe Dashboard - keep this secret!)

**⚠️ For Production:** You'll need to create live keys and update all secrets.

## 📝 Testing Checklist

- [ ] Can see pricing page at `/subscribe`
- [ ] Can see "Subscription Required" modal when trying Voice Assistant
- [ ] Can apply coupon codes
- [ ] Can complete checkout with test card
- [ ] Subscription appears in database
- [ ] Can use Voice Assistant after subscribing
- [ ] Subscription status shows in profile
- [ ] Can open Customer Portal from profile
- [ ] Webhooks are firing (check Stripe dashboard)

## 🆘 Troubleshooting

### "Price ID not configured"
- Make sure you ran the setup script
- Verify secrets are set: `supabase secrets list`

### Webhook not firing
- Check the endpoint URL is correct
- Verify the signing secret matches
- Look at webhook logs in Stripe dashboard

### Can't connect to Voice Agent
- Check browser console for errors
- Verify ElevenLabs agent IDs are set
- Make sure subscription status is "active" or "trialing" in database

## 🎉 You're Done!

Your subscription system is now fully functional. Users can:
- Sign up for subscriptions with a 7-day free trial
- Apply coupon codes for discounts
- Manage subscriptions through Stripe Customer Portal
- Access premium Voice Assistant features

Need help? Check the console logs or Stripe dashboard for more details!

