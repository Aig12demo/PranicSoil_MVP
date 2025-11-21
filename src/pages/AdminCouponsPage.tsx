import { useState, useEffect } from 'react';
import { Tag, Plus, Trash2, Edit, X, Loader2, AlertCircle, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Coupon {
  id: string;
  code: string;
  discount_percentage: number;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  created_at: string;
}

export function AdminCouponsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    discount_percentage: '',
    max_uses: '',
    expires_at: '',
  });

  useEffect(() => {
    checkAdminAccess();
    fetchCoupons();
  }, [profile]);

  const checkAdminAccess = async () => {
    if (!profile) {
      navigate('/login');
      return;
    }

    // Check if user is admin (you can add admin role check here)
    // For now, we'll assume any authenticated user can access
    // In production, you'd check profile.role === 'admin'
  };

  const fetchCoupons = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCoupons(data || []);
    } catch (err) {
      console.error('Error fetching coupons:', err);
      setError('Failed to load coupons');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const couponData: any = {
        code: formData.code.toUpperCase(),
        discount_percentage: parseFloat(formData.discount_percentage),
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        expires_at: formData.expires_at || null,
      };

      const { error } = await supabase
        .from('coupons')
        .insert([couponData]);

      if (error) throw error;

      setSuccess('Coupon created successfully!');
      setShowCreateModal(false);
      setFormData({
        code: '',
        discount_percentage: '',
        max_uses: '',
        expires_at: '',
      });
      fetchCoupons();
    } catch (err: any) {
      console.error('Error creating coupon:', err);
      if (err.code === '23505') {
        setError('Coupon code already exists');
      } else {
        setError(err.message || 'Failed to create coupon');
      }
    }
  };

  const handleDeleteCoupon = async (couponId: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;

    try {
      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', couponId);

      if (error) throw error;

      setSuccess('Coupon deleted successfully!');
      fetchCoupons();
    } catch (err) {
      console.error('Error deleting coupon:', err);
      setError('Failed to delete coupon');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isExpired = (dateString: string | null) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date();
  };

  const isMaxedOut = (coupon: Coupon) => {
    return coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Tag className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Coupon Management</h1>
                <p className="text-gray-600">Create and manage discount coupons</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Coupon
            </button>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-green-800">{success}</p>
            </div>
            <button onClick={() => setSuccess(null)} className="text-green-600 hover:text-green-800">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Coupons List */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            </div>
          ) : coupons.length === 0 ? (
            <div className="text-center py-12">
              <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No coupons created yet</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Create Your First Coupon
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Code</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Discount</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Usage</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Expires</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {coupons.map((coupon) => {
                    const expired = isExpired(coupon.expires_at);
                    const maxed = isMaxedOut(coupon);
                    const inactive = expired || maxed;

                    return (
                      <tr key={coupon.id} className={inactive ? 'bg-gray-50' : ''}>
                        <td className="px-6 py-4">
                          <span className="font-mono font-semibold text-gray-900">{coupon.code}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-green-600 font-semibold">{coupon.discount_percentage}% OFF</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-gray-700">
                            {coupon.uses_count} {coupon.max_uses ? `/ ${coupon.max_uses}` : ''}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={expired ? 'text-red-600' : 'text-gray-700'}>
                            {formatDate(coupon.expires_at)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {inactive ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {expired ? 'Expired' : 'Max Uses'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDeleteCoupon(coupon.id)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Delete coupon"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Coupon Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Create New Coupon</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Coupon Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., SAVE20"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent uppercase font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Discount Percentage (1-100) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  step="0.01"
                  value={formData.discount_percentage}
                  onChange={(e) => setFormData({ ...formData, discount_percentage: e.target.value })}
                  placeholder="e.g., 20"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Uses (Optional)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.max_uses}
                  onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                  placeholder="Leave empty for unlimited"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expiration Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Create Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

