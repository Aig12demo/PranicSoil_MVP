import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Loader2, User, Lock, Bell, Camera } from 'lucide-react';
import { Profile } from '../types/database';
import { SubscriptionStatus } from './SubscriptionStatus';

interface ProfileSectionProps {
  profileId?: string;
  isAdminView?: boolean;
}

export function ProfileSection({ profileId, isAdminView }: ProfileSectionProps = {}) {
  const { profile: authProfile } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(isAdminView && profileId ? null : authProfile);
  const [loading, setLoading] = useState(isAdminView && profileId ? true : false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    profile?.notifications_enabled ?? true
  );
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    role: profile?.role || '',
  });

  useEffect(() => {
    if (profile) {
      setEditValues({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        role: profile.role || '',
      });
    }
  }, [profile]);

  useEffect(() => {
    if (isAdminView && profileId) {
      const fetchProfile = async () => {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', profileId)
            .maybeSingle();

          if (error) throw error;
          if (data) {
            setProfile(data);
            setAvatarUrl(data.avatar_url || '');
            setNotificationsEnabled(data.notifications_enabled ?? true);
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load profile');
        } finally {
          setLoading(false);
        }
      };
      fetchProfile();
    }
  }, [profileId, isAdminView]);

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handlePasswordChange = async () => {
    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      setError('Please fill in all password fields');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (updateError) throw updateError;

      setSuccess('Password changed successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpdate = async () => {
    if (!profile) return;
    if (isAdminView) {
      setError('Cannot update avatar in admin view');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      setSuccess('Avatar URL updated successfully');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update avatar');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationsUpdate = async () => {
    if (!profile) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ notifications_enabled: notificationsEnabled })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      setSuccess('Notification preferences updated successfully');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (field: string, value: string) => {
    if (!profile) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const updateData: any = { [field]: value };
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', profile.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, ...updateData });
      setSuccess(`${field === 'full_name' ? 'Name' : field === 'phone' ? 'Phone' : 'Role'} updated successfully`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Profile not found</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Profile Settings</h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}

      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <User className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Account Information</h2>
              <p className="text-sm text-gray-600">Your basic account details</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              {isAdminView && editingField === 'full_name' ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editValues.full_name}
                    onChange={(e) => setEditValues({ ...editValues, full_name: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <button
                    onClick={() => {
                      handleProfileUpdate('full_name', editValues.full_name);
                      setEditingField(null);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingField(null);
                      setEditValues({ ...editValues, full_name: profile?.full_name || '' });
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={profile?.full_name || ''}
                    disabled={!isAdminView}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                      isAdminView ? 'bg-white cursor-pointer hover:border-green-500' : 'bg-gray-50 text-gray-600'
                    }`}
                    onClick={() => isAdminView && setEditingField('full_name')}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {isAdminView ? 'Click to edit' : 'Contact support to change your name'}
                  </p>
                </>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={profile?.email || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
              {isAdminView && editingField === 'role' ? (
                <div className="flex gap-2">
                  <select
                    value={editValues.role}
                    onChange={(e) => setEditValues({ ...editValues, role: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="gardener">Gardener</option>
                    <option value="farmer">Farmer</option>
                    <option value="rancher">Rancher</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    onClick={() => {
                      handleProfileUpdate('role', editValues.role);
                      setEditingField(null);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingField(null);
                      setEditValues({ ...editValues, role: profile?.role || '' });
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={profile?.role || ''}
                    disabled={!isAdminView}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg capitalize ${
                      isAdminView ? 'bg-white cursor-pointer hover:border-green-500' : 'bg-gray-50 text-gray-600'
                    }`}
                    onClick={() => isAdminView && setEditingField('role')}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {isAdminView ? 'Click to edit' : 'Role is set during registration'}
                  </p>
                </>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
              {isAdminView && editingField === 'phone' ? (
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={editValues.phone}
                    onChange={(e) => setEditValues({ ...editValues, phone: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <button
                    onClick={() => {
                      handleProfileUpdate('phone', editValues.phone);
                      setEditingField(null);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingField(null);
                      setEditValues({ ...editValues, phone: profile?.phone || '' });
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="tel"
                    value={profile?.phone || ''}
                    disabled={!isAdminView}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                      isAdminView ? 'bg-white cursor-pointer hover:border-green-500' : 'bg-gray-50 text-gray-600'
                    }`}
                    onClick={() => isAdminView && setEditingField('phone')}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {isAdminView ? 'Click to edit' : 'Contact support to update phone'}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Camera className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Profile Picture</h2>
              <p className="text-sm text-gray-600">Update your avatar image</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Avatar URL
                </label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
            <button
              onClick={handleAvatarUpdate}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Avatar'
              )}
            </button>
          </div>
        </div>

        {!isAdminView && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Lock className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Change Password</h2>
                <p className="text-sm text-gray-600">Update your account password</p>
              </div>
            </div>

          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Password
              </label>
              <input
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, currentPassword: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={handlePasswordChange}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Changing...
                </>
              ) : (
                'Change Password'
              )}
            </button>
          </div>
        </div>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Bell className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Notifications</h2>
              <p className="text-sm text-gray-600">Manage your notification preferences</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900">Enable Notifications</h3>
                <p className="text-sm text-gray-600">
                  Receive updates about your tasks, documents, and agreements
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>

            <button
              onClick={handleNotificationsUpdate}
              disabled={loading}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Updating...
                </>
              ) : (
                'Save Preferences'
              )}
            </button>
          </div>
        </div>

        {/* Subscription Status - Only for non-admin views */}
        {!isAdminView && <SubscriptionStatus />}
      </div>
    </div>
  );
}
