import { useState, useEffect } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Profile } from '../types/database';
import { ProfileSection } from './ProfileSection';
import { ServiceAgreements } from './ServiceAgreements';
import { TodoList } from './TodoList';
import { DocumentsList } from './DocumentsList';
import { CropManagement } from './CropManagement';
import { SoilTestUpload } from './SoilTestUpload';
import { SoilTestReports } from './SoilTestReports';

interface AdminCustomerViewProps {
  customerId: string;
  activeTab: string;
}

export function AdminCustomerView({ customerId, activeTab }: AdminCustomerViewProps) {
  const [customer, setCustomer] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [soilTestsRefreshTrigger, setSoilTestsRefreshTrigger] = useState(0);

  const fetchCustomer = async () => {
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', customerId)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Customer not found');

      setCustomer(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customer');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomer();
  }, [customerId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-red-900">Error Loading Customer</h3>
          <p className="text-red-700 text-sm mt-1">{error || 'Customer not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Customer Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{customer.full_name}</h1>
            <div className="flex items-center gap-4 mt-2">
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                customer.role === 'farmer'
                  ? 'bg-blue-100 text-blue-700'
                  : customer.role === 'gardener'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-orange-100 text-orange-700'
              }`}>
                {customer.role}
              </span>
              <span className="text-gray-600">{customer.email}</span>
              {customer.phone && <span className="text-gray-600">{customer.phone}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Render content based on active tab */}
      {activeTab === 'overview' && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Customer Overview</h2>
          <p className="text-gray-600 mb-4">View customer dashboard data here.</p>
          {/* You can add a customer-specific overview here */}
        </div>
      )}
      {activeTab === 'crops' && <CropManagement profileId={customerId} isAdminView={true} />}
      {activeTab === 'soil-tests' && (
        <div className="space-y-6">
          <SoilTestUpload 
            profileId={customerId} 
            isAdminView={true}
            onRefreshReports={() => setSoilTestsRefreshTrigger(Date.now())}
          />
          <SoilTestReports 
            profileId={customerId} 
            isAdminView={true}
            refreshTrigger={soilTestsRefreshTrigger}
          />
        </div>
      )}
      {activeTab === 'profile' && <ProfileSection profileId={customerId} isAdminView={true} />}
      {activeTab === 'documents' && <DocumentsList profileId={customerId} isAdminView={true} />}
      {activeTab === 'todos' && <TodoList profileId={customerId} isAdminView={true} />}
      {activeTab === 'agreements' && <ServiceAgreements profileId={customerId} />}
    </div>
  );
}

