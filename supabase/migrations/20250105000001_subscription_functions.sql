-- Function to get user's subscription status
CREATE OR REPLACE FUNCTION get_subscription_status(user_id UUID)
RETURNS TABLE (
  has_subscription BOOLEAN,
  status subscription_status,
  plan_type TEXT,
  current_period_end TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    TRUE as has_subscription,
    s.status,
    CASE
      WHEN s.stripe_price_id = current_setting('app.stripe_monthly_price_id', true) THEN 'monthly'
      WHEN s.stripe_price_id = current_setting('app.stripe_annual_price_id', true) THEN 'annual'
      ELSE 'unknown'
    END as plan_type,
    s.current_period_end,
    s.trial_end,
    s.cancel_at_period_end
  FROM subscriptions s
  WHERE s.user_id = get_subscription_status.user_id
    AND s.status IN ('trialing', 'active', 'past_due')
  ORDER BY s.created_at DESC
  LIMIT 1;

  -- If no active subscription found, return a row with has_subscription = false
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      FALSE as has_subscription,
      NULL::subscription_status as status,
      NULL::TEXT as plan_type,
      NULL::TIMESTAMP WITH TIME ZONE as current_period_end,
      NULL::TIMESTAMP WITH TIME ZONE as trial_end,
      FALSE as cancel_at_period_end;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate coupon code
CREATE OR REPLACE FUNCTION validate_coupon(
  coupon_code_input TEXT,
  user_id UUID,
  plan_type_input TEXT
)
RETURNS TABLE (
  valid BOOLEAN,
  discount_percent NUMERIC,
  error_message TEXT
) AS $$
DECLARE
  coupon_record RECORD;
  usage_count INT;
BEGIN
  -- Find the coupon
  SELECT * INTO coupon_record
  FROM coupons
  WHERE code = UPPER(coupon_code_input);

  -- Check if coupon exists
  IF coupon_record IS NULL THEN
    RETURN QUERY SELECT FALSE, 0::NUMERIC, 'Invalid coupon code'::TEXT;
    RETURN;
  END IF;

  -- Check if coupon has expired
  IF coupon_record.expires_at IS NOT NULL AND coupon_record.expires_at < NOW() THEN
    RETURN QUERY SELECT FALSE, 0::NUMERIC, 'Coupon has expired'::TEXT;
    RETURN;
  END IF;

  -- Check if coupon has reached max uses
  IF coupon_record.max_uses IS NOT NULL AND coupon_record.uses_count >= coupon_record.max_uses THEN
    RETURN QUERY SELECT FALSE, 0::NUMERIC, 'Coupon has reached maximum uses'::TEXT;
    RETURN;
  END IF;

  -- Check if user has already used this coupon
  SELECT COUNT(*) INTO usage_count
  FROM user_coupon_usage
  WHERE user_coupon_usage.user_id = validate_coupon.user_id
    AND user_coupon_usage.coupon_id = coupon_record.id;

  IF usage_count > 0 THEN
    RETURN QUERY SELECT FALSE, 0::NUMERIC, 'You have already used this coupon'::TEXT;
    RETURN;
  END IF;

  -- Coupon is valid
  RETURN QUERY SELECT TRUE, coupon_record.discount_percentage, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record coupon usage
CREATE OR REPLACE FUNCTION record_coupon_usage(
  coupon_code_input TEXT,
  user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  coupon_id_var UUID;
BEGIN
  -- Get coupon ID
  SELECT id INTO coupon_id_var
  FROM coupons
  WHERE code = UPPER(coupon_code_input);

  IF coupon_id_var IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Record usage
  INSERT INTO user_coupon_usage (user_id, coupon_id)
  VALUES (record_coupon_usage.user_id, coupon_id_var)
  ON CONFLICT (user_id, coupon_id) DO NOTHING;

  -- Increment uses count
  UPDATE coupons
  SET uses_count = uses_count + 1
  WHERE id = coupon_id_var;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_subscription_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_coupon(TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION record_coupon_usage(TEXT, UUID) TO authenticated;

