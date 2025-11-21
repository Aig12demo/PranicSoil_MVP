import { useState, useEffect } from 'react';
import { Users, RefreshCw, AlertTriangle, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Profile } from '../types/database';

interface AdminCustomerListProps {
  onCustomerClick?: (customerId: string) => void;
}

export function AdminCustomerList({ onCustomerClick }: AdminCustomerListProps) {
  const [customers, setCustomers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCustomers = async () => {
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('role', 'admin')
        .eq('status', 'active')  // Only show active customers
        .order('created_at', { ascending: false});

      if (error) throw error;
      setCustomers(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-green-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Customer Management</h2>
            <p className="text-gray-600 mt-1">View and manage all active customers</p>
          </div>
          <button
            onClick={fetchCustomers}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Customer Name</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Role</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Phone</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Created</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <button
                      onClick={() => onCustomerClick?.(customer.id)}
                      className="text-green-600 hover:text-green-700 font-medium hover:underline text-left"
                    >
                      {customer.full_name}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{customer.email}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      customer.role === 'farmer'
                        ? 'bg-blue-100 text-blue-700'
                        : customer.role === 'gardener'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {customer.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600 text-sm">
                    {customer.phone || '-'}
                  </td>
                  <td className="py-3 px-4 text-gray-600 text-sm">
                    {customer.created_at ? new Date(customer.created_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => onCustomerClick?.(customer.id)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View Dashboard
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {customers.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No customers found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
