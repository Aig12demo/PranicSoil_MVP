# Stripe Setup Script for Pranic Soil MVP
# This script sets up Stripe secrets and deploys Edge Functions

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "   Stripe Setup for Pranic Soil" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Your Stripe Keys - Get these from https://dashboard.stripe.com/test/apikeys
Write-Host "📋 Enter your Stripe API Keys:" -ForegroundColor Green
$STRIPE_SECRET_KEY = Read-Host "   Secret Key (sk_test_...)"
$STRIPE_PUBLISHABLE_KEY = Read-Host "   Publishable Key (pk_test_...)"

Write-Host "⚠️  IMPORTANT: Before running this script, you must:" -ForegroundColor Yellow
Write-Host "   1. Create two products in Stripe Dashboard" -ForegroundColor Yellow
Write-Host "      - Monthly Plan: `$29.99/month (recurring)" -ForegroundColor Yellow
Write-Host "      - Annual Plan: `$299/year (recurring)" -ForegroundColor Yellow
Write-Host "   2. Copy the Price IDs for each plan" -ForegroundColor Yellow
Write-Host "   3. Set up a webhook endpoint in Stripe" -ForegroundColor Yellow
Write-Host ""

# Prompt for Price IDs
Write-Host "📋 Enter your Stripe Price IDs:" -ForegroundColor Green
$STRIPE_MONTHLY_PRICE_ID = Read-Host "   Monthly Price ID (e.g., price_xxxxx)"
$STRIPE_ANNUAL_PRICE_ID = Read-Host "   Annual Price ID (e.g., price_yyyyy)"

Write-Host ""
Write-Host "📋 Enter your Stripe Webhook Secret:" -ForegroundColor Green
Write-Host "   (Found in Stripe Dashboard > Developers > Webhooks > Your Endpoint > Signing Secret)" -ForegroundColor Gray
$STRIPE_WEBHOOK_SECRET = Read-Host "   Webhook Secret (e.g., whsec_xxxxx)"

Write-Host ""
Write-Host "🔐 Setting Supabase secrets..." -ForegroundColor Cyan

# Set Stripe Secret Key
Write-Host "   Setting STRIPE_SECRET_KEY..." -ForegroundColor Gray
supabase secrets set STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY"

# Set Webhook Secret
Write-Host "   Setting STRIPE_WEBHOOK_SECRET..." -ForegroundColor Gray
supabase secrets set STRIPE_WEBHOOK_SECRET="$STRIPE_WEBHOOK_SECRET"

# Set Price IDs
Write-Host "   Setting STRIPE_MONTHLY_PRICE_ID..." -ForegroundColor Gray
supabase secrets set STRIPE_MONTHLY_PRICE_ID="$STRIPE_MONTHLY_PRICE_ID"

Write-Host "   Setting STRIPE_ANNUAL_PRICE_ID..." -ForegroundColor Gray
supabase secrets set STRIPE_ANNUAL_PRICE_ID="$STRIPE_ANNUAL_PRICE_ID"

Write-Host ""
Write-Host "✅ Secrets set successfully!" -ForegroundColor Green

Write-Host ""
Write-Host "📦 Pushing database migrations..." -ForegroundColor Cyan
supabase db push

Write-Host ""
Write-Host "🚀 Deploying Edge Functions..." -ForegroundColor Cyan

Write-Host "   Deploying create-checkout-session..." -ForegroundColor Gray
supabase functions deploy create-checkout-session

Write-Host "   Deploying create-portal-session..." -ForegroundColor Gray
supabase functions deploy create-portal-session

Write-Host "   Deploying stripe-webhook..." -ForegroundColor Gray
supabase functions deploy stripe-webhook

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "   ✅ Setup Complete!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📝 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Add the Publishable Key to your .env file:" -ForegroundColor White
Write-Host "      VITE_STRIPE_PUBLISHABLE_KEY=$STRIPE_PUBLISHABLE_KEY" -ForegroundColor Gray
Write-Host ""
Write-Host "   2. Configure your Stripe webhook endpoint to:" -ForegroundColor White
Write-Host "      https://zilrthstnuxncufdgiys.supabase.co/functions/v1/stripe-webhook" -ForegroundColor Gray
Write-Host ""
Write-Host "   3. Select these events in Stripe webhook settings:" -ForegroundColor White
Write-Host "      - customer.subscription.created" -ForegroundColor Gray
Write-Host "      - customer.subscription.updated" -ForegroundColor Gray
Write-Host "      - customer.subscription.deleted" -ForegroundColor Gray
Write-Host "      - invoice.payment_succeeded" -ForegroundColor Gray
Write-Host "      - invoice.payment_failed" -ForegroundColor Gray
Write-Host "      - checkout.session.completed" -ForegroundColor Gray
Write-Host ""
Write-Host "   4. Test the subscription flow!" -ForegroundColor White
Write-Host ""

