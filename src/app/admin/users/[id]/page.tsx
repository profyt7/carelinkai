'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiArrowLeft, FiSave, FiUserCheck, FiTrash2 } from 'react-icons/fi';

type User = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
  emailVerified: boolean | null;
};

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [impersonating, setImpersonating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetchUser();
  }, [userId]);

  const fetchUser = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }
      const data = await response.json();
      setUser(data);
      setFirstName(data.firstName || '');
      setLastName(data.lastName || '');
      setRole(data.role);
      setStatus(data.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, role, status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      const data = await response.json();
      setUser(data);
      alert('User updated successfully');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleImpersonate = async () => {
    if (!user) return;

    if (role.toUpperCase() === 'ADMIN') {
      alert('Cannot impersonate other administrators');
      return;
    }

    if (status.toUpperCase() !== 'ACTIVE') {
      alert('Cannot impersonate inactive users');
      return;
    }

    const reason = prompt(
      `Impersonate ${user.firstName || ''} ${user.lastName || ''} (${user.email})?\n\nPlease provide a reason for this impersonation:`
    );

    if (!reason) return;

    setImpersonating(true);
    try {
      const response = await fetch('/api/admin/impersonate/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: user.id, reason }),
      });

      const data = await response.json();

      if (response.ok) {
        const roleDashboards: Record<string, string> = {
          FAMILY: '/dashboard',
          OPERATOR: '/operator',
          CAREGIVER: '/caregiver',
          DISCHARGE_PLANNER: '/discharge-planner',
        };
        router.push(roleDashboards[user.role] || '/dashboard');
        router.refresh();
      } else {
        alert(`Failed to start impersonation: ${data.error}`);
      }
    } catch (err) {
      alert('Failed to start impersonation');
    } finally {
      setImpersonating(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    if (!confirm(`Are you sure you want to delete ${user.email}? This action cannot be undone.`)) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/admin/users');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete user');
      }
    } catch (err) {
      alert('Failed to delete user');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-neutral-600">Loading user...</div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <Link href="/admin/users" className="text-[#3978FC] hover:text-[#3167d4] flex items-center gap-2 mb-4">
            <FiArrowLeft /> Back to Users
          </Link>
          <div className="bg-red-50 text-red-700 p-4 rounded-lg">
            {error || 'User not found'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/admin/users" className="text-sm text-[#3978FC] hover:text-[#3167d4] mb-2 inline-flex items-center gap-1">
            <FiArrowLeft /> Back to Users
          </Link>
          <h1 className="text-2xl font-bold text-neutral-900">Edit User</h1>
          <p className="text-neutral-600">{user.email}</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#3978FC] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#3978FC] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#3978FC] focus:border-transparent"
              >
                <option value="FAMILY">Family</option>
                <option value="OPERATOR">Operator</option>
                <option value="CAREGIVER">Caregiver</option>
                <option value="DISCHARGE_PLANNER">Discharge Planner</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#3978FC] focus:border-transparent"
              >
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-neutral-200">
            <div className="grid grid-cols-2 gap-4 text-sm text-neutral-600">
              <div>
                <span className="font-medium">Created:</span>{' '}
                {new Date(user.createdAt).toLocaleString()}
              </div>
              <div>
                <span className="font-medium">Last Login:</span>{' '}
                {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
              </div>
              <div>
                <span className="font-medium">Email Verified:</span>{' '}
                {user.emailVerified ? 'Yes' : 'No'}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-neutral-200 flex flex-wrap gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#3978FC] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#3167d4] transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <FiSave />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>

            {role.toUpperCase() !== 'ADMIN' && status.toUpperCase() === 'ACTIVE' && (
              <button
                onClick={handleImpersonate}
                disabled={impersonating}
                className="bg-amber-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-amber-600 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <FiUserCheck />
                {impersonating ? 'Starting...' : 'Impersonate User'}
              </button>
            )}

            <button
              onClick={handleDelete}
              className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-2 ml-auto"
            >
              <FiTrash2 />
              Delete User
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
