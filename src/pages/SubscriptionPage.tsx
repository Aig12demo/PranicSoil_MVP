import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Tag, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface PricingPlan {
  id: string;
  type: 'monthly' | 'annual';
  name: string;
  price: number;
  originalPrice?: number;
  billingPeriod: string;
  savings?: string;
  features: string[];
  recommended?: boolean;
}

interface CouponValidation {
  valid: boolean;
  discount_percent: number;
  error_message: string | null;
}

export function SubscriptionPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidation | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSubscription, setHasSubscription] = useState(false);

  const plans: PricingPlan[] = [
    {
      id: 'monthly',
      type: 'monthly',
      name: 'Monthly Plan',
      price: 29.99,
      billingPeriod: 'per month',
      features: [
        'Unlimited Voice Assistant access',
        '7-day free trial',
        'Cancel anytime',
        'All voice features included',
      ],
    },
    {
      id: 'annual',
      type: 'annual',
      name: 'Annual Plan',
      price: 299,
      originalPrice: 359.88,
      billingPeriod: 'per year',
      savings: 'Save $60',
      recommended: true,
      features: [
        'Unlimited Voice Assistant access',
        '7-day free trial',
        'Save $60 per year',
        'All voice features included',
        'Priority support',
      ],
    },
  ];

  useEffect(() => {
    checkSubscriptionStatus();
  }, [profile]);

  const checkSubscriptionStatus = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .rpc('get_subscription_status', { user_id: profile.id });

    if (!error && data && data.length > 0) {
      const status = data[0];
      if (status.has_subscription && ['trialing', 'active'].includes(status.status)) {
        setHasSubscription(true);
      }
    }
  };

  const validateCoupon = async () => {
    if (!couponCode.trim()) {
      setAppliedCoupon(null);
      return;
    }

    setIsValidatingCoupon(true);
    setError(null);

    try {
      const { data, error } = await supabase.rpc('validate_coupon', {
        coupon_code_input: couponCode.toUpperCase(),
        user_id: profile?.id,
        plan_type_input: selectedPlan,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const result = data[0];
        if (result.valid) {
          setAppliedCoupon(result);
          setError(null);
        } else {
          setAppliedCoupon(null);
          setError(result.error_message);
        }
      }
    } catch (err) {
      console.error('Error validating coupon:', err);
      setError('Failed to validate coupon code');
      setAppliedCoupon(null);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const calculateDiscountedPrice = (originalPrice: number) => {
    if (!appliedCoupon || !appliedCoupon.valid) return originalPrice;
    const discount = (originalPrice * appliedCoupon.discount_percent) / 100;
    return originalPrice - discount;
  };

  const handleSubscribe = async () => {
    if (!profile) {
      navigate('/login');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Create Stripe Checkout session via Edge Function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            plan_type: selectedPlan,
            profile_id: profile.id,
            coupon_code: appliedCoupon?.valid ? couponCode.toUpperCase() : null,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { checkout_url } = await response.json();

      // Redirect to Stripe Checkout
      window.location.href = checkout_url;
    } catch (err) {
      console.error('Error creating checkout session:', err);
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
      setIsProcessing(false);
    }
  };

  if (hasSubscription) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">You're All Set!</h2>
          <p className="text-gray-600 mb-6">
            You already have an active subscription. Enjoy unlimited access to Voice Assistant!
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const selectedPlanData = plans.find(p => p.type === selectedPlan)!;
  const finalPrice = calculateDiscountedPrice(selectedPlanData.price);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-8 h-8 text-green-600" />
            <h1 className="text-4xl font-bold text-gray-900">Choose Your Plan</h1>
          </div>
          <p className="text-xl text-gray-600">
            Unlock unlimited access to Voice Assistant with a 7-day free trial
          </p>
        </div>

        {/* Error Message */}
        {error && !isValidatingCoupon && (
          <div className="max-w-4xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              onClick={() => setSelectedPlan(plan.type)}
              className={`relative bg-white rounded-2xl shadow-lg p-8 cursor-pointer transition-all duration-200 ${
                selectedPlan === plan.type
                  ? 'ring-4 ring-green-500 transform scale-105'
                  : 'hover:shadow-xl hover:scale-102'
              }`}
            >
              {plan.recommended && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-1 rounded-full text-sm font-medium shadow-lg">
                    Best Value
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                {selectedPlan === plan.type && (
                  <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>

              <div className="mb-6">
                {plan.savings && (
                  <div className="text-green-600 font-semibold mb-2">{plan.savings}</div>
                )}
                <div className="flex items-baseline gap-2">
                  {plan.originalPrice && (
                    <span className="text-xl text-gray-400 line-through">
                      ${plan.originalPrice.toFixed(2)}
                    </span>
                  )}
                  <span className="text-4xl font-bold text-gray-900">
                    ${plan.price.toFixed(2)}
                  </span>
                  <span className="text-gray-600">{plan.billingPeriod}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Coupon Code Section */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Tag className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Have a Coupon Code?</h3>
            </div>

            <div className="flex gap-3">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => {
                  setCouponCode(e.target.value.toUpperCase());
                  setAppliedCoupon(null);
                  setError(null);
                }}
                placeholder="Enter code (e.g., SAVE20)"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent uppercase"
                disabled={isValidatingCoupon || isProcessing}
              />
              <button
                onClick={validateCoupon}
                disabled={!couponCode.trim() || isValidatingCoupon || isProcessing}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
              >
                {isValidatingCoupon ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Validating...
                  </>
                ) : (
                  'Apply'
                )}
              </button>
            </div>

            {appliedCoupon?.valid && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-green-900 font-semibold">
                    Coupon Applied! {appliedCoupon.discount_percent}% Off
                  </p>
                  <p className="text-green-700 text-sm">
                    You're saving ${((selectedPlanData.price * appliedCoupon.discount_percent) / 100).toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Order Summary */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Order Summary</h3>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-gray-700">
                <span>{selectedPlanData.name}</span>
                <span>${selectedPlanData.price.toFixed(2)}</span>
              </div>

              {appliedCoupon?.valid && (
                <div className="flex justify-between text-green-600 font-semibold">
                  <span>Discount ({appliedCoupon.discount_percent}%)</span>
                  <span>-${((selectedPlanData.price * appliedCoupon.discount_percent) / 100).toFixed(2)}</span>
                </div>
              )}

              <div className="border-t border-gray-200 pt-3 flex justify-between text-xl font-bold text-gray-900">
                <span>Total</span>
                <span>${finalPrice.toFixed(2)}</span>
              </div>

              <p className="text-sm text-gray-600 text-center pt-2">
                7-day free trial • Cancel anytime
              </p>
            </div>

            <button
              onClick={handleSubscribe}
              disabled={isProcessing}
              className="w-full px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-bold text-lg shadow-lg flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Processing...
                </>
              ) : (
                'Start 7-Day Free Trial'
              )}
            </button>

            <p className="text-xs text-gray-500 text-center mt-4">
              By subscribing, you agree to our Terms of Service and Privacy Policy.
              You won't be charged until after your 7-day free trial ends.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

