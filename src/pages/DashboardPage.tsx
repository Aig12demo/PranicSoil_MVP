import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  User,
  FileText,
  CheckSquare,
  MessageSquare,
  LogOut,
  Upload,
  Calendar,
  DollarSign,
  Shield,
  Mic
} from 'lucide-react';
import { ChatInterface } from '../components/ChatInterface';
import { ProfileSection } from '../components/ProfileSection';
import { TodoList } from '../components/TodoList';
import { DocumentsList } from '../components/DocumentsList';
import { ServiceAgreements } from '../components/ServiceAgreements';
import { AdminCustomerList } from '../components/AdminCustomerList';
import { AdminCustomerView } from '../components/AdminCustomerView';
import { VoiceAgent } from '../components/VoiceAgent';

type TabType = 'overview' | 'profile' | 'documents' | 'todos' | 'chat' | 'agreements' | 'admin';

export function DashboardPage() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [viewingCustomerId, setViewingCustomerId] = useState<string | null>(null);
  const [showVoiceAgent, setShowVoiceAgent] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: Home },
    { id: 'profile' as TabType, label: 'Profile', icon: User },
    { id: 'documents' as TabType, label: 'Documents', icon: FileText },
    { id: 'todos' as TabType, label: 'To-Do List', icon: CheckSquare },
    { id: 'agreements' as TabType, label: 'Agreements', icon: DollarSign },
    { id: 'chat' as TabType, label: 'AI Assistant', icon: MessageSquare },
    ...(profile?.role === 'admin' ? [{ id: 'admin' as TabType, label: 'Admin', icon: Shield }] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-white shadow-lg">
        <div className="p-6">
          <img src="/PRANIC SOIL Logo.png" alt="Pranic Soil" className="h-10 mb-8" />

          <div className="mb-8">
            <p className="text-sm text-gray-600">Welcome back,</p>
            <p className="font-semibold text-gray-900">{profile?.full_name || 'User'}</p>
            <p className="text-xs text-green-600 capitalize mt-1">{profile?.role}</p>
          </div>

          <nav className="space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
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

        <div className="absolute bottom-0 w-64 p-6 border-t border-gray-200">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'overview' && (
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard Overview</h1>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckSquare className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Active Tasks</p>
                      <p className="text-2xl font-bold text-gray-900">0</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Documents</p>
                      <p className="text-2xl font-bold text-gray-900">0</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Upcoming</p>
                      <p className="text-2xl font-bold text-gray-900">0</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
                  <div className="space-y-3">
                    <button
                      onClick={() => setShowVoiceAgent(true)}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      <Mic className="w-5 h-5" />
                      Voice Consultation
                    </button>
                    <button
                      onClick={() => setActiveTab('chat')}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      <MessageSquare className="w-5 h-5" />
                      Chat with AI Assistant
                    </button>
                    <button
                      onClick={() => setActiveTab('documents')}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <Upload className="w-5 h-5" />
                      Upload Documents
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
                  <p className="text-gray-600">No recent activity to display.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'profile' && <ProfileSection />}
          {activeTab === 'documents' && <DocumentsList />}
          {activeTab === 'todos' && <TodoList />}
          {activeTab === 'agreements' && <ServiceAgreements />}
          {activeTab === 'chat' && <ChatInterface />}
          {activeTab === 'admin' && profile?.role === 'admin' && (
            viewingCustomerId ? (
              <AdminCustomerView
                customerId={viewingCustomerId}
                onBack={() => setViewingCustomerId(null)}
              />
            ) : (
              <AdminCustomerList
                onViewCustomer={(customerId) => setViewingCustomerId(customerId)}
              />
            )
          )}
        </div>
      </main>

      {showVoiceAgent && (
        <VoiceAgent
          onClose={() => setShowVoiceAgent(false)}
          contextType="authenticated"
          userId={profile?.user_id || null}
        />
      )}
    </div>
  );
}
