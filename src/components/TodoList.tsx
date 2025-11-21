import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { SharedTodo } from '../types/database';
import { Plus, CheckCircle, Circle, Clock, Loader2, Trash2 } from 'lucide-react';

interface TodoListProps {
  profileId?: string;
  isAdminView?: boolean;
}

export function TodoList({ profileId, isAdminView }: TodoListProps = {}) {
  const { profile } = useAuth();
  const targetProfileId = profileId || profile?.id;
  const [todos, setTodos] = useState<SharedTodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTodo, setShowNewTodo] = useState(false);
  const [newTodo, setNewTodo] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    due_date: '',
  });

  useEffect(() => {
    loadTodos();
  }, [targetProfileId]);

  const loadTodos = async () => {
    if (!targetProfileId) return;

    const { data, error } = await supabase
      .from('shared_todos')
      .select('*')
      .eq('profile_id', targetProfileId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTodos(data);
    }
    setLoading(false);
  };

  const createTodo = async () => {
    console.log('createTodo called');
    if (!targetProfileId || !newTodo.title.trim()) {
      console.log('Validation failed', { targetProfileId, title: newTodo.title });
      return;
    }

    console.log('Creating todo...');
    const { error } = await supabase.from('shared_todos').insert({
      profile_id: targetProfileId,
      created_by: targetProfileId,
      title: newTodo.title,
      description: newTodo.description,
      priority: newTodo.priority,
      due_date: newTodo.due_date || null,
      status: 'pending',
    });

    if (error) {
      console.error('Error creating todo:', error);
    } else {
      console.log('Todo created successfully');
      setNewTodo({ title: '', description: '', priority: 'medium', due_date: '' });
      setShowNewTodo(false);
      loadTodos();
    }
  };

  const deleteTodo = async (todoId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    console.log('Deleting todo:', todoId);
    const { error } = await supabase.from('shared_todos').delete().eq('id', todoId);

    if (error) {
      console.error('Error deleting todo:', error);
      alert('Failed to delete task. Please try again.');
    } else {
      console.log('Todo deleted successfully');
      loadTodos();
    }
  };

  const updateTodoStatus = async (todoId: string, newStatus: SharedTodo['status']) => {
    console.log('Updating todo status:', { todoId, newStatus });
    const { error } = await supabase
      .from('shared_todos')
      .update({
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
      })
      .eq('id', todoId);

    if (error) {
      console.error('Error updating todo status:', error);
      alert('Failed to update task status. Please try again.');
    } else {
      console.log('Todo status updated successfully');
      loadTodos();
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
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
        <h1 className="text-3xl font-bold text-gray-900">To-Do List</h1>
        {(isAdminView || !isAdminView) && (
          <button
            onClick={() => setShowNewTodo(!showNewTodo)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Task
          </button>
        )}
      </div>

      {showNewTodo && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Create New Task</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
              <input
                type="text"
                value={newTodo.title}
                onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter task title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={newTodo.description}
                onChange={(e) => setNewTodo({ ...newTodo, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter task description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={newTodo.priority}
                  onChange={(e) =>
                    setNewTodo({ ...newTodo, priority: e.target.value as SharedTodo['priority'] })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  value={newTodo.due_date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setNewTodo({ ...newTodo, due_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-4 mt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  console.log('Cancel clicked');
                  setShowNewTodo(false);
                  setNewTodo({ title: '', description: '', priority: 'medium', due_date: '' });
                }}
                className="px-6 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  console.log('Create Task button clicked!');
                  createTodo();
                }}
                disabled={!newTodo.title.trim()}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
              >
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {todos.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600">
              No tasks yet. Create your first task to get started!
            </p>
          </div>
        ) : (
          todos.map((todo) => (
            <div key={todo.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start gap-4">
                <button
                  onClick={() =>
                    updateTodoStatus(
                      todo.id,
                      todo.status === 'completed'
                        ? 'pending'
                        : todo.status === 'pending'
                        ? 'in_progress'
                        : 'completed'
                    )
                  }
                  className="mt-1"
                >
                  {todo.status === 'completed' ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : todo.status === 'in_progress' ? (
                    <Clock className="w-6 h-6 text-yellow-600" />
                  ) : (
                    <Circle className="w-6 h-6 text-gray-400" />
                  )}
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3
                      className={`font-semibold text-gray-900 ${
                        todo.status === 'completed' ? 'line-through text-gray-500' : ''
                      }`}
                    >
                      {todo.title}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${getPriorityColor(
                        todo.priority || 'medium'
                      )}`}
                    >
                      {todo.priority}
                    </span>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        todo.status === 'completed'
                          ? 'bg-green-50 text-green-700'
                          : todo.status === 'in_progress'
                          ? 'bg-yellow-50 text-yellow-700'
                          : 'bg-gray-50 text-gray-700'
                      }`}
                    >
                      {todo.status.replace('_', ' ')}
                    </span>
                  </div>
                  {todo.description && (
                    <p className="text-gray-600 mb-2">{todo.description}</p>
                  )}
                  {todo.due_date && (
                    <p className="text-sm text-gray-500">
                      Due: {new Date(todo.due_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
                {isAdminView && (
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="mt-1 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
