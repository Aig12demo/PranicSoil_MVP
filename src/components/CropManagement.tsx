import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2, Loader2, Sprout } from 'lucide-react';

interface LandAllocation {
  id: string;
  profile_id: string;
  farm_id: string | null;
  crop_name: string;
  acreage: number;
  status: 'planted' | 'growing' | 'harvested' | 'unfarmed';
  planting_date: string | null;
  expected_harvest_date: string | null;
  notes: string | null;
  created_at: string;
}

interface Farm {
  id: string;
  farm_name: string;
  acreage: number;
}

interface CropManagementProps {
  profileId?: string;
  isAdminView?: boolean;
}

export function CropManagement({ profileId, isAdminView }: CropManagementProps = {}) {
  const { profile } = useAuth();
  const targetProfileId = profileId || profile?.id;
  const [allocations, setAllocations] = useState<LandAllocation[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    crop_name: '',
    acreage: '',
    status: 'planted' as LandAllocation['status'],
    farm_id: '',
    planting_date: '',
    expected_harvest_date: '',
    notes: '',
  });

  const [totalAcreage, setTotalAcreage] = useState(0);
  const [allocatedAcreage, setAllocatedAcreage] = useState(0);

  useEffect(() => {
    loadData();
  }, [targetProfileId]);

  const loadData = async () => {
    if (!targetProfileId) return;

    setLoading(true);

    // Load farms
    const { data: farmsData } = await supabase
      .from('farms')
      .select('id, farm_name, acreage')
      .eq('profile_id', targetProfileId);

    if (farmsData) {
      setFarms(farmsData);
      const total = farmsData.reduce((sum, farm) => sum + (farm.acreage || 0), 0);
      setTotalAcreage(total);
    }

    // Load allocations
    const { data: allocationsData } = await supabase
      .from('land_allocations')
      .select('*')
      .eq('profile_id', targetProfileId)
      .order('created_at', { ascending: false });

    if (allocationsData) {
      setAllocations(allocationsData);
      const allocated = allocationsData.reduce((sum, alloc) => sum + (alloc.acreage || 0), 0);
      setAllocatedAcreage(allocated);
    }

    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!targetProfileId || !formData.crop_name.trim() || !formData.acreage) return;

    console.log('Submitting crop allocation...');

    const data = {
      profile_id: targetProfileId,
      farm_id: formData.farm_id || null,
      crop_name: formData.crop_name,
      acreage: parseFloat(formData.acreage),
      status: formData.status,
      planting_date: formData.planting_date || null,
      expected_harvest_date: formData.expected_harvest_date || null,
      notes: formData.notes || null,
    };

    if (editingId) {
      const { error } = await supabase
        .from('land_allocations')
        .update(data)
        .eq('id', editingId);

      if (error) {
        console.error('Error updating allocation:', error);
        alert('Failed to update crop allocation');
        return;
      }
    } else {
      const { error } = await supabase
        .from('land_allocations')
        .insert(data);

      if (error) {
        console.error('Error creating allocation:', error);
        alert('Failed to create crop allocation');
        return;
      }
    }

    resetForm();
    loadData();
  };

  const handleEdit = (allocation: LandAllocation) => {
    setEditingId(allocation.id);
    setFormData({
      crop_name: allocation.crop_name,
      acreage: allocation.acreage.toString(),
      status: allocation.status,
      farm_id: allocation.farm_id || '',
      planting_date: allocation.planting_date || '',
      expected_harvest_date: allocation.expected_harvest_date || '',
      notes: allocation.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this crop allocation?')) return;

    const { error } = await supabase
      .from('land_allocations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting allocation:', error);
      alert('Failed to delete crop allocation');
    } else {
      loadData();
    }
  };

  const resetForm = () => {
    setFormData({
      crop_name: '',
      acreage: '',
      status: 'planted',
      farm_id: '',
      planting_date: '',
      expected_harvest_date: '',
      notes: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planted': return 'bg-blue-100 text-blue-800';
      case 'growing': return 'bg-green-100 text-green-800';
      case 'harvested': return 'bg-yellow-100 text-yellow-800';
      case 'unfarmed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  const unallocatedAcreage = totalAcreage - allocatedAcreage;

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Acreage</p>
              <p className="text-3xl font-bold text-gray-900">{totalAcreage.toFixed(1)}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Sprout className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Allocated</p>
              <p className="text-3xl font-bold text-green-900">{allocatedAcreage.toFixed(1)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Sprout className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Unallocated</p>
              <p className="text-3xl font-bold text-orange-900">{unallocatedAcreage.toFixed(1)}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Sprout className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Crop Allocations</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Crop
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            {editingId ? 'Edit Crop Allocation' : 'Add New Crop'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Crop Name *
              </label>
              <input
                type="text"
                value={formData.crop_name}
                onChange={(e) => setFormData({ ...formData, crop_name: e.target.value })}
                placeholder="e.g., Tomatoes, Corn, Wheat"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Acreage *
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formData.acreage}
                onChange={(e) => setFormData({ ...formData, acreage: e.target.value })}
                placeholder="50.5"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {farms.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Farm (Optional)
                </label>
                <select
                  value={formData.farm_id}
                  onChange={(e) => setFormData({ ...formData, farm_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Select a farm</option>
                  {farms.map((farm) => (
                    <option key={farm.id} value={farm.id}>
                      {farm.farm_name} ({farm.acreage} acres)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as LandAllocation['status'] })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="planted">Planted</option>
                <option value="growing">Growing</option>
                <option value="harvested">Harvested</option>
                <option value="unfarmed">Unfarmed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Planting Date
              </label>
              <input
                type="date"
                value={formData.planting_date}
                onChange={(e) => setFormData({ ...formData, planting_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expected Harvest
              </label>
              <input
                type="date"
                value={formData.expected_harvest_date}
                onChange={(e) => setFormData({ ...formData, expected_harvest_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Additional notes..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={resetForm}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!formData.crop_name.trim() || !formData.acreage}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {editingId ? 'Update' : 'Add'} Crop
            </button>
          </div>
        </div>
      )}

      {/* Allocations List */}
      <div className="space-y-4">
        {allocations.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Sprout className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              No crop allocations yet. Add your first crop to get started!
            </p>
          </div>
        ) : (
          allocations.map((allocation) => (
            <div key={allocation.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">{allocation.crop_name}</h3>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(allocation.status)}`}>
                      {allocation.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Acreage:</span> {allocation.acreage} acres
                    </div>
                    {allocation.planting_date && (
                      <div>
                        <span className="font-medium">Planted:</span> {new Date(allocation.planting_date).toLocaleDateString()}
                      </div>
                    )}
                    {allocation.expected_harvest_date && (
                      <div>
                        <span className="font-medium">Harvest:</span> {new Date(allocation.expected_harvest_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  {allocation.notes && (
                    <p className="text-sm text-gray-600 mt-2">{allocation.notes}</p>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(allocation)}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(allocation.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

