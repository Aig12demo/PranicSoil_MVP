import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Home,
  User,
  FileText,
  CheckSquare,
  LogOut,
  DollarSign,
  Mic,
  Sprout,
  X,
  TestTube
} from 'lucide-react';
import { ProfileSection } from '../components/ProfileSection';
import { TodoList } from '../components/TodoList';
import { DocumentsList } from '../components/DocumentsList';
import { ServiceAgreements } from '../components/ServiceAgreements';
import { AdminCustomerList } from '../components/AdminCustomerList';
import { AdminCustomerView } from '../components/AdminCustomerView';
import { VoiceAgent } from '../components/VoiceAgent';
import { DashboardOverview } from '../components/DashboardOverview';
import { CropManagement } from '../components/CropManagement';
import { SoilTestUpload } from '../components/SoilTestUpload';
import { SoilTestReports } from '../components/SoilTestReports';

type TabType = 'overview' | 'profile' | 'documents' | 'todos' | 'agreements' | 'crops' | 'soil-tests' | 'admin';

export function DashboardPage() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [viewingCustomerId, setViewingCustomerId] = useState<string | null>(null);
  const [showVoiceAgent, setShowVoiceAgent] = useState(false);
  const [soilTestsRefreshTrigger, setSoilTestsRefreshTrigger] = useState(0);

  // If admin, check if viewing a specific customer
  useEffect(() => {
    const customerId = searchParams.get('customer');
    if (customerId && profile?.role === 'admin') {
      setViewingCustomerId(customerId);
      setActiveTab('admin');
    }
  }, [searchParams, profile]);

  // Set default tab based on role
  useEffect(() => {
    if (profile?.role === 'admin' && !viewingCustomerId) {
      setActiveTab('admin'); // Admin sees customer list by default
    }
  }, [profile, viewingCustomerId]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleCustomerClick = (customerId: string) => {
    setViewingCustomerId(customerId);
    navigate(`/dashboard?customer=${customerId}`);
  };

  const handleBackToCustomers = () => {
    setViewingCustomerId(null);
    navigate('/dashboard');
    setActiveTab('admin');
  };

  // Define tabs based on user role
  const getTabsForRole = () => {
    const baseTabs = [
      { id: 'overview' as TabType, label: 'Overview', icon: Home },
      { id: 'crops' as TabType, label: 'Crops', icon: Sprout },
      { id: 'soil-tests' as TabType, label: 'Soil Tests', icon: TestTube },
      { id: 'todos' as TabType, label: 'To-Do List', icon: CheckSquare },
      { id: 'documents' as TabType, label: 'Documents', icon: FileText },
      { id: 'agreements' as TabType, label: 'Agreements', icon: DollarSign },
      { id: 'profile' as TabType, label: 'Profile', icon: User },
    ];

    // Don't show "Admin" in sidebar - it's the default view
    return baseTabs;
  };

  const tabs = getTabsForRole();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg flex flex-col">
        <div className="flex-1 p-6">
          <img src="/PRANIC SOIL Logo.png" alt="Pranic Soil" className="h-10 mb-8" />

          {/* User Info with Voice Agent */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm text-gray-600">Welcome back,</p>
                <p className="font-semibold text-gray-900">{profile?.full_name || 'User'}</p>
                <p className="text-xs text-green-600 capitalize mt-1">{profile?.role}</p>
              </div>
              {/* Voice Agent Button - Top Left */}
              <button
                onClick={() => setShowVoiceAgent(true)}
                className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center hover:bg-green-700 transition-colors shadow-lg"
                title="Voice Assistant"
              >
                <Mic className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-2">
            {/* Show Customer List as first item for admin when not viewing a customer */}
            {profile?.role === 'admin' && !viewingCustomerId && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === 'admin'
                    ? 'bg-green-50 text-green-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <User className="w-5 h-5" />
                Customers
              </button>
            )}

            {/* Regular tabs */}
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (viewingCustomerId) {
                      // Stay on customer view but change tab
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-green-50 text-green-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sign Out at bottom */}
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Back to Customers Button for Admin */}
          {profile?.role === 'admin' && viewingCustomerId && (
            <button
              onClick={handleBackToCustomers}
              className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <X className="w-4 h-4" />
              Back to Customers
            </button>
          )}

          {/* Admin View - Customer List or Customer Details */}
          {profile?.role === 'admin' && activeTab === 'admin' && !viewingCustomerId && (
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-8">Customer Management</h1>
              <AdminCustomerList onCustomerClick={handleCustomerClick} />
            </div>
          )}

          {/* Admin viewing specific customer */}
          {profile?.role === 'admin' && viewingCustomerId && (
            <AdminCustomerView customerId={viewingCustomerId} activeTab={activeTab} />
          )}

          {/* Regular User Views */}
          {(!viewingCustomerId || profile?.role !== 'admin') && (
            <>
              {activeTab === 'overview' && profile?.role !== 'admin' && <DashboardOverview />}
              {activeTab === 'crops' && <CropManagement profileId={viewingCustomerId || undefined} isAdminView={!!viewingCustomerId} />}
              {activeTab === 'soil-tests' && (
                <div className="space-y-6">
                  <SoilTestUpload 
                    profileId={viewingCustomerId || undefined} 
                    isAdminView={!!viewingCustomerId}
                    onRefreshReports={() => setSoilTestsRefreshTrigger(Date.now())}
                  />
                  <SoilTestReports 
                    profileId={viewingCustomerId || undefined} 
                    isAdminView={!!viewingCustomerId}
                    refreshTrigger={soilTestsRefreshTrigger}
                  />
                </div>
              )}
              {activeTab === 'profile' && <ProfileSection profileId={viewingCustomerId || undefined} isAdminView={!!viewingCustomerId} />}
              {activeTab === 'documents' && <DocumentsList profileId={viewingCustomerId || undefined} isAdminView={!!viewingCustomerId} />}
              {activeTab === 'todos' && <TodoList profileId={viewingCustomerId || undefined} isAdminView={!!viewingCustomerId} />}
              {activeTab === 'agreements' && <ServiceAgreements profileId={viewingCustomerId || undefined} />}
            </>
          )}
        </div>
      </main>

      {/* Voice Agent Modal */}
      {showVoiceAgent && (
        <VoiceAgent
          onClose={() => setShowVoiceAgent(false)}
          contextType="authenticated"
          userId={profile?.id || null}
        />
      )}
    </div>
  );
}

