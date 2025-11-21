import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Sprout, CheckSquare, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TodoSummary {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  due_date: string | null;
}

interface CropSummary {
  crop_name: string;
  total_acreage: number;
  status: string;
}

interface DashboardStats {
  total_acreage: number;
  allocated_acreage: number;
  pending_todos: number;
  in_progress_todos: number;
  completed_todos: number;
}

export function DashboardOverview() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    total_acreage: 0,
    allocated_acreage: 0,
    pending_todos: 0,
    in_progress_todos: 0,
    completed_todos: 0,
  });
  const [crops, setCrops] = useState<CropSummary[]>([]);
  const [recentTodos, setRecentTodos] = useState<TodoSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [profile]);

  const loadDashboardData = async () => {
    if (!profile?.id) return;

    // Load farm stats
    const { data: farms } = await supabase
      .from('farms')
      .select('acreage')
      .eq('profile_id', profile.id);

    const totalAcreage = farms?.reduce((sum, farm) => sum + (farm.acreage || 0), 0) || 0;

    // Load crop allocations
    const { data: allocations } = await supabase
      .from('land_allocations')
      .select('crop_name, acreage, status')
      .eq('profile_id', profile.id);

    const allocatedAcreage = allocations?.reduce((sum, alloc) => sum + (alloc.acreage || 0), 0) || 0;

    // Group crops
    const cropMap = new Map<string, { total_acreage: number; status: string }>();
    allocations?.forEach((alloc) => {
      const existing = cropMap.get(alloc.crop_name) || { total_acreage: 0, status: alloc.status };
      existing.total_acreage += alloc.acreage;
      cropMap.set(alloc.crop_name, existing);
    });

    const cropSummary = Array.from(cropMap.entries()).map(([crop_name, data]) => ({
      crop_name,
      total_acreage: data.total_acreage,
      status: data.status,
    }));

    setCrops(cropSummary);

    // Load todos
    const { data: todos } = await supabase
      .from('shared_todos')
      .select('id, title, priority, status, due_date')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(5);

    setRecentTodos(todos || []);

    // Calculate todo stats
    const pending = todos?.filter((t) => t.status === 'pending').length || 0;
    const inProgress = todos?.filter((t) => t.status === 'in_progress').length || 0;
    const completed = todos?.filter((t) => t.status === 'completed').length || 0;

    setStats({
      total_acreage: totalAcreage,
      allocated_acreage: allocatedAcreage,
      pending_todos: pending,
      in_progress_todos: inProgress,
      completed_todos: completed,
    });

    setLoading(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'in_progress': return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'pending': return <AlertCircle className="w-5 h-5 text-red-600" />;
      default: return <CheckSquare className="w-5 h-5 text-gray-600" />;
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  const unallocatedAcreage = stats.total_acreage - stats.allocated_acreage;

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Total Acreage</h3>
            <Sprout className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.total_acreage.toFixed(1)}</p>
          <p className="text-xs text-gray-500 mt-1">acres</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Allocated</h3>
            <Sprout className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-900">{stats.allocated_acreage.toFixed(1)}</p>
          <p className="text-xs text-gray-500 mt-1">acres in use</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Unallocated</h3>
            <Sprout className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-3xl font-bold text-orange-900">{unallocatedAcreage.toFixed(1)}</p>
          <p className="text-xs text-gray-500 mt-1">acres available</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Active Tasks</h3>
            <CheckSquare className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.pending_todos + stats.in_progress_todos}</p>
          <p className="text-xs text-gray-500 mt-1">{stats.completed_todos} completed</p>
        </div>
      </div>

      {/* Crop Summary & Recent Todos Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Crop Summary */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Crop Summary</h2>
          {crops.length === 0 ? (
            <div className="text-center py-8">
              <Sprout className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No crops allocated yet</p>
              <button
                onClick={() => navigate('/dashboard')}
                className="mt-4 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Add Your First Crop
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {crops.slice(0, 5).map((crop, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Sprout className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-gray-900">{crop.crop_name}</p>
                      <p className="text-sm text-gray-600">{crop.total_acreage} acres</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    crop.status === 'planted' ? 'bg-blue-100 text-blue-800' :
                    crop.status === 'growing' ? 'bg-green-100 text-green-800' :
                    crop.status === 'harvested' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {crop.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Todos with Color Coding */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Tasks</h2>
          {recentTodos.length === 0 ? (
            <div className="text-center py-8">
              <CheckSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No tasks yet</p>
              <button
                onClick={() => navigate('/dashboard')}
                className="mt-4 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Create Your First Task
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTodos.map((todo) => (
                <div 
                  key={todo.id} 
                  className={`flex items-start gap-3 p-3 border-l-4 rounded-r-lg ${getPriorityColor(todo.priority)}`}
                >
                  {getStatusIcon(todo.status)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{todo.title}</p>
                    {todo.due_date && (
                      <p className="text-xs text-gray-600 mt-1">
                        Due: {new Date(todo.due_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <span className="text-xs font-medium uppercase">
                    {todo.priority}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Progress Summary */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg shadow p-6 border border-green-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Progress</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-2">
              <span className="text-2xl font-bold text-red-600">{stats.pending_todos}</span>
            </div>
            <p className="text-sm font-medium text-gray-700">Pending</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-yellow-100 rounded-full flex items-center justify-center mb-2">
              <span className="text-2xl font-bold text-yellow-600">{stats.in_progress_todos}</span>
            </div>
            <p className="text-sm font-medium text-gray-700">In Progress</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-2">
              <span className="text-2xl font-bold text-green-600">{stats.completed_todos}</span>
            </div>
            <p className="text-sm font-medium text-gray-700">Completed</p>
          </div>
        </div>
      </div>
    </div>
  );
}

