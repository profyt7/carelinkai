'use client';

import { useState, useEffect } from 'react';
import { FiSearch, FiEdit, FiTrash2, FiPlus, FiFilter, FiDownload, FiUserCheck, FiCheck, FiX } from 'react-icons/fi';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BulkActionsBar, BulkAction } from '@/components/admin/BulkActionsBar';
import toast from 'react-hot-toast';

type User = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  status: string;
  createdAt: string;
  lastLogin?: string;
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [impersonatingUserId, setImpersonatingUserId] = useState<string | null>(null);
  
  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchUsers();
  }, [page, filterRole, filterStatus, searchQuery]);

  // Clear selections when data changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, filterRole, filterStatus, searchQuery]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(searchQuery && { search: searchQuery }),
        ...(filterRole !== 'ALL' && { role: filterRole }),
        ...(filterStatus !== 'ALL' && { status: filterStatus }),
      });

      const response = await fetch(`/api/admin/users?${params}`);
      const data = await response.json();
      
      if (!response.ok) {
        console.error('API returned error:', data);
        toast.error(`Failed to load users: ${data.error || 'Unknown error'}`);
        return;
      }
      
      if (data.users) {
        setUsers(data.users);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.totalCount || 0);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error(`Error loading users: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('User deleted successfully');
        fetchUsers();
      } else {
        toast.error('Failed to delete user');
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast.error('Failed to delete user');
    }
  };

  const handleImpersonateUser = async (user: User) => {
    if (user.role === 'ADMIN') {
      toast.error('Cannot impersonate other administrators');
      return;
    }

    if (user.status !== 'ACTIVE') {
      toast.error('Cannot impersonate inactive users');
      return;
    }

    const reason = prompt(
      `Impersonate ${user.firstName} ${user.lastName} (${user.email})?\n\nPlease provide a reason for this impersonation:`
    );

    if (!reason) return;

    setImpersonatingUserId(user.id);

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
        const redirectUrl = roleDashboards[user.role] || '/dashboard';
        router.push(redirectUrl);
        router.refresh();
      } else {
        toast.error(`Failed to start impersonation: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to impersonate user:', error);
      toast.error('Failed to start impersonation');
    } finally {
      setImpersonatingUserId(null);
    }
  };

  // Bulk operations
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === users.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(users.map(u => u.id)));
    }
  };

  const handleBulkAction = async (actionId: string) => {
    const userIds = Array.from(selectedIds);
    
    try {
      const response = await fetch('/api/admin/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionId, userIds }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(result.message);
        setSelectedIds(new Set());
        fetchUsers();
      } else {
        toast.error(result.error || 'Bulk operation failed');
      }
    } catch (error) {
      console.error('Bulk operation failed:', error);
      toast.error('Bulk operation failed');
    }
  };

  const bulkActions: BulkAction[] = [
    { id: 'activate', label: 'Activate Users', icon: <FiCheck size={16} />, variant: 'success', requireConfirmation: true, confirmationMessage: 'Are you sure you want to activate the selected users?' },
    { id: 'deactivate', label: 'Deactivate Users', icon: <FiX size={16} />, variant: 'warning', requireConfirmation: true, confirmationMessage: 'Are you sure you want to deactivate the selected users? They will lose access to the platform.' },
    { id: 'delete', label: 'Delete Users', icon: <FiTrash2 size={16} />, variant: 'danger', requireConfirmation: true, confirmationMessage: 'Are you sure you want to delete the selected users? This action cannot be undone.' },
  ];

  const exportUsers = () => {
    const csvContent = [
      ['Email', 'Name', 'Role', 'Status', 'Created At', 'Last Login'].join(','),
      ...users.map(u => [
        u.email,
        `${u.firstName || ''} ${u.lastName || ''}`.trim(),
        u.role,
        u.status,
        new Date(u.createdAt).toLocaleDateString(),
        u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never',
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/admin" className="text-sm text-[#3978FC] hover:text-[#3167d4] mb-2 inline-block">
                ← Back to Dashboard
              </Link>
              <h1 className="text-3xl font-bold text-neutral-900">User Management</h1>
              <p className="mt-1 text-neutral-600">Manage all platform users ({totalCount} total)</p>
            </div>
            <button
              onClick={exportUsers}
              className="bg-neutral-200 text-neutral-800 px-4 py-2 rounded-lg font-medium hover:bg-neutral-300 transition-colors flex items-center space-x-2"
            >
              <FiDownload />
              <span>Export</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-neutral-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Search Users</label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by email or name..."
                  className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#3978FC] focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Filter by Role</label>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#3978FC] focus:border-transparent"
              >
                <option value="ALL">All Roles</option>
                <option value="FAMILY">Family</option>
                <option value="OPERATOR">Operator</option>
                <option value="CAREGIVER">Caregiver</option>
                <option value="DISCHARGE_PLANNER">Discharge Planner</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Filter by Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#3978FC] focus:border-transparent"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        <BulkActionsBar
          selectedCount={selectedIds.size}
          totalCount={users.length}
          actions={bulkActions}
          onAction={handleBulkAction}
          onClearSelection={() => setSelectedIds(new Set())}
          loading={loading}
        />

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={users.length > 0 && selectedIds.size === users.length}
                    onChange={toggleSelectAll}
                    className="rounded border-neutral-300 text-[#3978FC] focus:ring-[#3978FC]"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">Last Login</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-neutral-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-neutral-500">Loading users...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-neutral-500">No users found</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className={`hover:bg-neutral-50 ${selectedIds.has(user.id) ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(user.id)}
                        onChange={() => toggleSelection(user.id)}
                        className="rounded border-neutral-300 text-[#3978FC] focus:ring-[#3978FC]"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-neutral-900">
                          {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}
                        </div>
                        <div className="text-sm text-neutral-500">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">{user.role}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${user.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link href={`/admin/users/${user.id}`} className="text-[#3978FC] hover:text-[#3167d4] p-2" title="Edit user">
                          <FiEdit />
                        </Link>
                        {user.role !== 'ADMIN' && user.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleImpersonateUser(user)}
                            disabled={impersonatingUserId === user.id}
                            className="text-amber-600 hover:text-amber-800 p-2 disabled:opacity-50"
                            title="Impersonate user"
                          >
                            {impersonatingUserId === user.id ? <span className="animate-spin">⏳</span> : <FiUserCheck />}
                          </button>
                        )}
                        <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-800 p-2" title="Delete user">
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-neutral-600">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
