import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, AlertCircle, Calendar, CreditCard, X, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface SubscriptionData {
  has_subscription: boolean;
  status: string | null;
  plan_type: string | null;
  current_period_end: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean | null;
}

export function SubscriptionStatus() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, [profile]);

  const fetchSubscriptionStatus = async () => {
    if (!profile) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_subscription_status', {
        user_id: profile.id,
      });

      if (error) {
        console.error('Error fetching subscription:', error);
      } else if (data && data.length > 0) {
        setSubscription(data[0]);
      } else {
        setSubscription({
          has_subscription: false,
          status: null,
          plan_type: null,
          current_period_end: null,
          trial_end: null,
          cancel_at_period_end: null,
        });
      }
    } catch (err) {
      console.error('Error fetching subscription:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getPlanName = (planType: string | null) => {
    if (planType === 'monthly') return 'Monthly Plan';
    if (planType === 'annual') return 'Annual Plan';
    return 'N/A';
  };

  const handleManageSubscription = async () => {
    setIsLoadingPortal(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-portal-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create portal session');
      }

      const { portal_url } = await response.json();
      window.location.href = portal_url;
    } catch (err) {
      console.error('Error opening customer portal:', err);
      alert('Failed to open subscription management. Please try again.');
    } finally {
      setIsLoadingPortal(false);
    }
  };

  const getStatusBadge = (status: string | null, cancelAtPeriodEnd: boolean | null) => {
    if (status === 'trialing') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
          Free Trial
        </span>
      );
    }
    if (status === 'active' && !cancelAtPeriodEnd) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
          Active
        </span>
      );
    }
    if (status === 'active' && cancelAtPeriodEnd) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
          Canceling
        </span>
      );
    }
    if (status === 'past_due') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
          Past Due
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
        {status || 'Inactive'}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!subscription?.has_subscription) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow p-6 border-2 border-green-200">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Unlock Voice Assistant
            </h3>
            <p className="text-gray-700 mb-4">
              Subscribe to get unlimited access to our AI-powered Voice Assistant with a 7-day free trial.
            </p>
            <button
              onClick={() => navigate('/subscribe')}
              className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-medium"
            >
              View Plans
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Subscription Status</h3>
        {getStatusBadge(subscription.status, subscription.cancel_at_period_end)}
      </div>

      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-gray-900">Plan</p>
            <p className="text-sm text-gray-600">{getPlanName(subscription.plan_type)}</p>
          </div>
        </div>

        {subscription.trial_end && subscription.status === 'trialing' && (
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">Trial Ends</p>
              <p className="text-sm text-gray-600">{formatDate(subscription.trial_end)}</p>
            </div>
          </div>
        )}

        {subscription.status === 'active' && subscription.current_period_end && (
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                {subscription.cancel_at_period_end ? 'Access Until' : 'Next Billing Date'}
              </p>
              <p className="text-sm text-gray-600">{formatDate(subscription.current_period_end)}</p>
            </div>
          </div>
        )}

        {subscription.cancel_at_period_end && (
          <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-900">Subscription Canceling</p>
              <p className="text-sm text-yellow-700">
                Your subscription will end on {formatDate(subscription.current_period_end)}.
                You'll still have access until then.
              </p>
            </div>
          </div>
        )}

        {subscription.status === 'past_due' && (
          <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
            <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">Payment Issue</p>
              <p className="text-sm text-red-700">
                Please update your payment method to continue using Voice Assistant.
              </p>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-3">
            Manage your subscription through your Stripe Customer Portal
          </p>
          <button
            onClick={handleManageSubscription}
            disabled={isLoadingPortal}
            className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            {isLoadingPortal ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Opening Portal...
              </>
            ) : (
              'Manage Subscription'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

