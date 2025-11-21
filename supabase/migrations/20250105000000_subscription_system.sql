-- Subscription System Migration
-- Created: 2025-01-05
-- Purpose: Add subscription management with Stripe integration and coupon system

-- ============================================================================
-- 1. SUBSCRIPTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Stripe data
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  
  -- Subscription details
  plan_type TEXT NOT NULL CHECK (plan_type IN ('monthly', 'annual')),
  status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid')),
  
  -- Pricing
  amount_cents INTEGER NOT NULL, -- Store in cents to avoid floating point issues
  currency TEXT NOT NULL DEFAULT 'usd',
  
  -- Dates
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  canceled_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_active_subscription_per_user UNIQUE (profile_id)
);

-- Index for faster lookups
CREATE INDEX idx_subscriptions_profile_id ON public.subscriptions(profile_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);

-- ============================================================================
-- 2. COUPON CODES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.coupon_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Coupon details
  code TEXT NOT NULL UNIQUE,
  discount_percent INTEGER NOT NULL CHECK (discount_percent >= 1 AND discount_percent <= 100),
  
  -- Limitations
  max_uses INTEGER, -- NULL = unlimited
  current_uses INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  
  -- Restrictions
  valid_for_plans TEXT[] DEFAULT ARRAY['monthly', 'annual']::TEXT[],
  first_payment_only BOOLEAN NOT NULL DEFAULT true, -- Apply only to first payment
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Metadata
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT, -- Admin notes about the coupon
  
  -- Constraints
  CHECK (code = UPPER(code)) -- Enforce uppercase codes
);

-- Index for fast code lookups
CREATE INDEX idx_coupon_codes_code ON public.coupon_codes(code) WHERE is_active = true;
CREATE INDEX idx_coupon_codes_active ON public.coupon_codes(is_active);

-- ============================================================================
-- 3. COUPON REDEMPTIONS TABLE (Track who used which coupon)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  coupon_id UUID NOT NULL REFERENCES public.coupon_codes(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  
  -- Redemption details
  discount_percent INTEGER NOT NULL,
  original_amount_cents INTEGER NOT NULL,
  discounted_amount_cents INTEGER NOT NULL,
  
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate redemptions
  CONSTRAINT unique_coupon_per_user UNIQUE (coupon_id, profile_id)
);

-- Index for lookups
CREATE INDEX idx_coupon_redemptions_profile_id ON public.coupon_redemptions(profile_id);
CREATE INDEX idx_coupon_redemptions_coupon_id ON public.coupon_redemptions(coupon_id);

-- ============================================================================
-- 4. STRIPE EVENTS TABLE (Webhook event log)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.stripe_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  
  -- Event data
  data JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Index for event processing
CREATE INDEX idx_stripe_events_processed ON public.stripe_events(processed);
CREATE INDEX idx_stripe_events_type ON public.stripe_events(event_type);

-- ============================================================================
-- 5. SUBSCRIPTION HISTORY TABLE (Audit trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Change details
  action TEXT NOT NULL, -- 'created', 'upgraded', 'downgraded', 'renewed', 'canceled', 'expired'
  old_status TEXT,
  new_status TEXT,
  old_plan_type TEXT,
  new_plan_type TEXT,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for history lookups
CREATE INDEX idx_subscription_history_subscription_id ON public.subscription_history(subscription_id);
CREATE INDEX idx_subscription_history_profile_id ON public.subscription_history(profile_id);

-- ============================================================================
-- 6. FUNCTIONS
-- ============================================================================

-- Function to check if user has active subscription
CREATE OR REPLACE FUNCTION public.has_active_subscription(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.subscriptions
    WHERE profile_id = user_id
    AND status IN ('trialing', 'active')
    AND current_period_end > NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get subscription status
CREATE OR REPLACE FUNCTION public.get_subscription_status(user_id UUID)
RETURNS TABLE (
  has_subscription BOOLEAN,
  status TEXT,
  plan_type TEXT,
  trial_ends_at TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  is_trial BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    true AS has_subscription,
    s.status,
    s.plan_type,
    s.trial_ends_at,
    s.current_period_end,
    (s.status = 'trialing' AND s.trial_ends_at > NOW()) AS is_trial
  FROM public.subscriptions s
  WHERE s.profile_id = user_id
  AND s.status IN ('trialing', 'active', 'past_due')
  LIMIT 1;
  
  -- If no subscription found, return default
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      false AS has_subscription,
      'none'::TEXT AS status,
      NULL::TEXT AS plan_type,
      NULL::TIMESTAMPTZ AS trial_ends_at,
      NULL::TIMESTAMPTZ AS current_period_end,
      false AS is_trial;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate and apply coupon
CREATE OR REPLACE FUNCTION public.validate_coupon(
  coupon_code_input TEXT,
  user_id UUID,
  plan_type_input TEXT
)
RETURNS TABLE (
  valid BOOLEAN,
  discount_percent INTEGER,
  error_message TEXT
) AS $$
DECLARE
  coupon_record RECORD;
  already_used BOOLEAN;
BEGIN
  -- Check if coupon exists and is active
  SELECT * INTO coupon_record
  FROM public.coupon_codes
  WHERE code = UPPER(coupon_code_input)
  AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 'Invalid coupon code';
    RETURN;
  END IF;
  
  -- Check if expired
  IF coupon_record.expires_at IS NOT NULL AND coupon_record.expires_at < NOW() THEN
    RETURN QUERY SELECT false, 0, 'Coupon has expired';
    RETURN;
  END IF;
  
  -- Check if max uses reached
  IF coupon_record.max_uses IS NOT NULL AND coupon_record.current_uses >= coupon_record.max_uses THEN
    RETURN QUERY SELECT false, 0, 'Coupon has reached maximum uses';
    RETURN;
  END IF;
  
  -- Check if user already used this coupon
  SELECT EXISTS(
    SELECT 1 FROM public.coupon_redemptions
    WHERE coupon_id = coupon_record.id
    AND profile_id = user_id
  ) INTO already_used;
  
  IF already_used THEN
    RETURN QUERY SELECT false, 0, 'You have already used this coupon';
    RETURN;
  END IF;
  
  -- Check if valid for selected plan
  IF NOT (plan_type_input = ANY(coupon_record.valid_for_plans)) THEN
    RETURN QUERY SELECT false, 0, 'Coupon not valid for selected plan';
    RETURN;
  END IF;
  
  -- Coupon is valid!
  RETURN QUERY SELECT true, coupon_record.discount_percent, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment coupon usage
CREATE OR REPLACE FUNCTION public.increment_coupon_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.coupon_codes
  SET current_uses = current_uses + 1
  WHERE id = NEW.coupon_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-increment coupon usage
CREATE TRIGGER trigger_increment_coupon_usage
AFTER INSERT ON public.coupon_redemptions
FOR EACH ROW
EXECUTE FUNCTION public.increment_coupon_usage();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;

-- Subscriptions: Users can view their own
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = profile_id));

-- Subscriptions: Admins can view all
CREATE POLICY "Admins can view all subscriptions"
  ON public.subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Coupon Codes: Anyone can SELECT to validate (function handles actual validation)
CREATE POLICY "Anyone can validate coupons"
  ON public.coupon_codes FOR SELECT
  USING (is_active = true);

-- Coupon Codes: Only admins can INSERT/UPDATE/DELETE
CREATE POLICY "Admins can manage coupons"
  ON public.coupon_codes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Coupon Redemptions: Users can view their own
CREATE POLICY "Users can view own redemptions"
  ON public.coupon_redemptions FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = profile_id));

-- Coupon Redemptions: Admins can view all
CREATE POLICY "Admins can view all redemptions"
  ON public.coupon_redemptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Stripe Events: Only service role can access
CREATE POLICY "Service role only for stripe events"
  ON public.stripe_events FOR ALL
  USING (auth.role() = 'service_role');

-- Subscription History: Users can view their own
CREATE POLICY "Users can view own history"
  ON public.subscription_history FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = profile_id));

-- Subscription History: Admins can view all
CREATE POLICY "Admins can view all history"
  ON public.subscription_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- ============================================================================
-- 8. INITIAL DATA (Optional pricing configuration)
-- ============================================================================

-- Create a pricing configuration table for flexibility
CREATE TABLE IF NOT EXISTS public.pricing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type TEXT NOT NULL UNIQUE CHECK (plan_type IN ('monthly', 'annual')),
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  stripe_price_id TEXT, -- Will be set when Stripe products are created
  description TEXT,
  features JSONB, -- Store plan features as JSON
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.pricing_config ENABLE ROW LEVEL SECURITY;

-- Anyone can view pricing
CREATE POLICY "Anyone can view pricing"
  ON public.pricing_config FOR SELECT
  USING (is_active = true);

-- Only admins can modify pricing
CREATE POLICY "Admins can manage pricing"
  ON public.pricing_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Insert initial pricing
INSERT INTO public.pricing_config (plan_type, amount_cents, description, features)
VALUES 
  ('monthly', 2999, 'Monthly Voice Access', '{"trial_days": 7, "billing_period": "month", "voice_access": true}'::jsonb),
  ('annual', 29900, 'Annual Voice Access - Save $60', '{"trial_days": 7, "billing_period": "year", "voice_access": true, "savings": 6000}'::jsonb)
ON CONFLICT (plan_type) DO NOTHING;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON TABLE public.subscriptions IS 'Stores user subscription data synced with Stripe';
COMMENT ON TABLE public.coupon_codes IS 'Admin-created discount coupons';
COMMENT ON TABLE public.coupon_redemptions IS 'Tracks which users redeemed which coupons';
COMMENT ON TABLE public.stripe_events IS 'Webhook event log from Stripe';
COMMENT ON TABLE public.subscription_history IS 'Audit trail of subscription changes';
COMMENT ON TABLE public.pricing_config IS 'Configurable pricing plans';

