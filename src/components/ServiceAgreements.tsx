import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ServiceAgreement, Invoice } from '../types/database';
import { FileText, DollarSign, Calendar, Loader2, Plus, Edit, Trash2 } from 'lucide-react';

interface ServiceAgreementsProps {
  profileId?: string;
  isAdminView?: boolean;
}

export function ServiceAgreements({ profileId, isAdminView }: ServiceAgreementsProps = {}) {
  const { profile } = useAuth();
  const targetProfileId = profileId || profile?.id;
  const [agreements, setAgreements] = useState<ServiceAgreement[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewAgreement, setShowNewAgreement] = useState(false);
  const [editingAgreement, setEditingAgreement] = useState<string | null>(null);
  const [newAgreement, setNewAgreement] = useState({
    agreement_type: '',
    status: 'pending' as 'active' | 'pending' | 'completed' | 'cancelled',
    start_date: '',
    end_date: '',
    total_amount: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, [targetProfileId]);

  const loadData = async () => {
    if (!targetProfileId) return;

    const [agreementsResponse, invoicesResponse] = await Promise.all([
      supabase
        .from('service_agreements')
        .select('*')
        .eq('profile_id', targetProfileId)
        .order('created_at', { ascending: false }),
      supabase
        .from('invoices')
        .select('*')
        .eq('profile_id', targetProfileId)
        .order('created_at', { ascending: false }),
    ]);

    if (!agreementsResponse.error && agreementsResponse.data) {
      setAgreements(agreementsResponse.data);
    }

    if (!invoicesResponse.error && invoicesResponse.data) {
      setInvoices(invoicesResponse.data);
    }

    setLoading(false);
  };

  const handleCreateAgreement = async () => {
    if (!targetProfileId || !newAgreement.agreement_type.trim()) return;

    const { error } = await supabase.from('service_agreements').insert({
      profile_id: targetProfileId,
      agreement_type: newAgreement.agreement_type,
      status: newAgreement.status,
      start_date: newAgreement.start_date || null,
      end_date: newAgreement.end_date || null,
      total_amount: newAgreement.total_amount ? parseFloat(newAgreement.total_amount) : null,
      notes: newAgreement.notes || null,
    });

    if (!error) {
      setNewAgreement({
        agreement_type: '',
        status: 'pending',
        start_date: '',
        end_date: '',
        total_amount: '',
        notes: '',
      });
      setShowNewAgreement(false);
      loadData();
    }
  };

  const handleUpdateAgreement = async (id: string, updates: Partial<ServiceAgreement>) => {
    const { error } = await supabase
      .from('service_agreements')
      .update(updates)
      .eq('id', id);

    if (!error) {
      setEditingAgreement(null);
      loadData();
    }
  };

  const handleDeleteAgreement = async (id: string) => {
    if (!confirm('Are you sure you want to delete this agreement?')) return;

    const { error } = await supabase.from('service_agreements').delete().eq('id', id);

    if (!error) {
      loadData();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'completed':
        return 'bg-blue-100 text-blue-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      case 'paid':
        return 'bg-green-100 text-green-700';
      case 'overdue':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Service Agreements & Invoices</h1>
        {isAdminView && (
          <button
            onClick={() => setShowNewAgreement(!showNewAgreement)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Agreement
          </button>
        )}
      </div>

      {showNewAgreement && isAdminView && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Create New Agreement</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Agreement Type</label>
              <input
                type="text"
                value={newAgreement.agreement_type}
                onChange={(e) => setNewAgreement({ ...newAgreement, agreement_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="e.g., Soil Consultation"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={newAgreement.status}
                  onChange={(e) => setNewAgreement({ ...newAgreement, status: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Total Amount</label>
                <input
                  type="number"
                  value={newAgreement.total_amount}
                  onChange={(e) => setNewAgreement({ ...newAgreement, total_amount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={newAgreement.start_date}
                  onChange={(e) => setNewAgreement({ ...newAgreement, start_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={newAgreement.end_date}
                  onChange={(e) => setNewAgreement({ ...newAgreement, end_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                value={newAgreement.notes}
                onChange={(e) => setNewAgreement({ ...newAgreement, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowNewAgreement(false);
                  setNewAgreement({
                    agreement_type: '',
                    status: 'pending',
                    start_date: '',
                    end_date: '',
                    total_amount: '',
                    notes: '',
                  });
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAgreement}
                disabled={!newAgreement.agreement_type.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Agreement
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-12">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Service Agreements</h2>
        <div className="space-y-4">
          {agreements.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No service agreements yet.</p>
            </div>
          ) : (
            agreements.map((agreement) => (
              <div key={agreement.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {agreement.agreement_type}
                      </h3>
                      {isAdminView && editingAgreement === agreement.id ? (
                        <select
                          value={agreement.status}
                          onChange={(e) => handleUpdateAgreement(agreement.id, { status: e.target.value as any })}
                          className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="pending">Pending</option>
                          <option value="active">Active</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      ) : (
                        <span
                          className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(
                            agreement.status
                          )}`}
                        >
                          {agreement.status}
                        </span>
                      )}
                    </div>
                    {agreement.notes && (
                      <p className="text-gray-600 mb-3">{agreement.notes}</p>
                    )}
                    <div className="flex gap-6 text-sm text-gray-500">
                      {agreement.start_date && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Start: {new Date(agreement.start_date).toLocaleDateString()}
                        </div>
                      )}
                      {agreement.end_date && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          End: {new Date(agreement.end_date).toLocaleDateString()}
                        </div>
                      )}
                      {agreement.total_amount && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          ${Number(agreement.total_amount).toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                  {isAdminView && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingAgreement(editingAgreement === agreement.id ? null : agreement.id)}
                        className="text-gray-400 hover:text-blue-600"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteAgreement(agreement.id)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Invoices</h2>
        <div className="space-y-4">
          {invoices.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No invoices yet.</p>
            </div>
          ) : (
            invoices.map((invoice) => (
              <div key={invoice.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">
                        Invoice #{invoice.invoice_number}
                      </h3>
                      <span
                        className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(
                          invoice.status
                        )}`}
                      >
                        {invoice.status}
                      </span>
                    </div>
                    {invoice.description && (
                      <p className="text-gray-600 mb-3">{invoice.description}</p>
                    )}
                    <div className="flex gap-6 text-sm">
                      <div className="flex items-center gap-2 text-gray-900 font-semibold">
                        <DollarSign className="w-5 h-5" />
                        ${Number(invoice.amount).toFixed(2)}
                      </div>
                      {invoice.due_date && (
                        <div className="flex items-center gap-2 text-gray-500">
                          <Calendar className="w-4 h-4" />
                          Due: {new Date(invoice.due_date).toLocaleDateString()}
                        </div>
                      )}
                      {invoice.payment_date && (
                        <div className="flex items-center gap-2 text-green-600">
                          <Calendar className="w-4 h-4" />
                          Paid: {new Date(invoice.payment_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    disabled={invoice.status === 'paid'}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {invoice.status === 'paid' ? 'Paid' : 'Pay Now'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {invoices.some((inv) => inv.status !== 'paid') && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>Note:</strong> Payment processing will be available soon. For now, please
            contact support to arrange payment.
          </p>
        </div>
      )}
    </div>
  );
}
