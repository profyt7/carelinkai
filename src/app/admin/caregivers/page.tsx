'use client';

import { useState, useEffect } from 'react';
import { FiSearch, FiEdit, FiEye, FiFilter, FiDownload, FiCheck, FiX, FiClock, FiAlertTriangle, FiTrash2 } from 'react-icons/fi';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BulkActionsBar, BulkAction } from '@/components/admin/BulkActionsBar';
import toast from 'react-hot-toast';

type Caregiver = {
  id: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    status: string;
  };
  yearsExperience?: number;
  hourlyRate?: number;
  backgroundCheckStatus: string;
  employmentStatus?: string;
  employmentType?: string;
  specialties: string[];
  certificationCount: number;
  assignmentCount: number;
  rating?: number;
  reviewCount: number;
  createdAt: string;
};

export default function AdminCaregiversPage() {
  const router = useRouter();
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterEmploymentType, setFilterEmploymentType] = useState('ALL');
  const [filterBackgroundCheck, setFilterBackgroundCheck] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchCaregivers();
  }, [page, filterStatus, filterEmploymentType, filterBackgroundCheck, searchQuery]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, filterStatus, filterEmploymentType, filterBackgroundCheck, searchQuery]);

  const fetchCaregivers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(searchQuery && { search: searchQuery }),
        ...(filterStatus !== 'ALL' && { status: filterStatus }),
        ...(filterEmploymentType !== 'ALL' && { employmentType: filterEmploymentType }),
        ...(filterBackgroundCheck !== 'ALL' && { backgroundCheck: filterBackgroundCheck }),
      });

      const response = await fetch(`/api/admin/caregivers?${params}`);
      const data = await response.json();
      
      if (!response.ok) {
        toast.error(`Failed to load caregivers: ${data.error || 'Unknown error'}`);
        return;
      }
      
      if (data.caregivers) {
        setCaregivers(data.caregivers);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.totalCount || 0);
      } else {
        setCaregivers([]);
      }
    } catch (error) {
      toast.error(`Error loading caregivers: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setCaregivers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        ...(searchQuery && { search: searchQuery }),
        ...(filterStatus !== 'ALL' && { status: filterStatus }),
        ...(filterEmploymentType !== 'ALL' && { employmentType: filterEmploymentType }),
        ...(filterBackgroundCheck !== 'ALL' && { backgroundCheck: filterBackgroundCheck }),
        export: 'true',
      });

      const response = await fetch(`/api/admin/caregivers?${params}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `caregivers-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast.error('Failed to export data');
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
    if (selectedIds.size === caregivers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(caregivers.map(c => c.id)));
    }
  };

  const handleBulkAction = async (actionId: string) => {
    const caregiverIds = Array.from(selectedIds);
    
    try {
      const response = await fetch('/api/admin/caregivers/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionId, caregiverIds }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(result.message);
        setSelectedIds(new Set());
        fetchCaregivers();
      } else {
        toast.error(result.error || 'Bulk operation failed');
      }
    } catch (error) {
      toast.error('Bulk operation failed');
    }
  };

  const bulkActions: BulkAction[] = [
    { id: 'approve', label: 'Approve Background Check', icon: <FiCheck size={16} />, variant: 'success' },
    { id: 'reject', label: 'Flag Background Check', icon: <FiAlertTriangle size={16} />, variant: 'warning' },
    { id: 'activate', label: 'Activate Caregivers', icon: <FiCheck size={16} />, variant: 'success' },
    { id: 'deactivate', label: 'Deactivate Caregivers', icon: <FiX size={16} />, variant: 'warning' },
    { id: 'delete', label: 'Delete Caregivers', icon: <FiTrash2 size={16} />, variant: 'danger', requireConfirmation: true },
  ];

  const getBackgroundCheckBadge = (status: string) => {
    const badges: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      NOT_STARTED: { color: 'bg-gray-100 text-gray-800', icon: <FiClock size={14} />, label: 'Not Started' },
      PENDING: { color: 'bg-yellow-100 text-yellow-800', icon: <FiClock size={14} />, label: 'Pending' },
      CLEAR: { color: 'bg-green-100 text-green-800', icon: <FiCheck size={14} />, label: 'Clear' },
      CONSIDER: { color: 'bg-orange-100 text-orange-800', icon: <FiAlertTriangle size={14} />, label: 'Consider' },
      EXPIRED: { color: 'bg-red-100 text-red-800', icon: <FiX size={14} />, label: 'Expired' },
    };
    const badge = badges[status] || badges.NOT_STARTED;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.icon}
        {badge.label}
      </span>
    );
  };

  const getEmploymentStatusBadge = (status?: string) => {
    if (!status) return null;
    const colors: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800',
      INACTIVE: 'bg-gray-100 text-gray-800',
      ON_LEAVE: 'bg-yellow-100 text-yellow-800',
      TERMINATED: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getUserStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      SUSPENDED: 'bg-red-100 text-red-800',
      INACTIVE: 'bg-gray-100 text-gray-800',
    };
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Caregiver Management</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage all caregivers, verify credentials, and monitor performance ({totalCount} total)
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total Caregivers</div>
          <div className="text-2xl font-bold text-gray-900">{totalCount}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Active</div>
          <div className="text-2xl font-bold text-green-600">
            {caregivers.filter(c => c.employmentStatus === 'ACTIVE').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Pending Verification</div>
          <div className="text-2xl font-bold text-yellow-600">
            {caregivers.filter(c => c.backgroundCheckStatus === 'PENDING' || c.backgroundCheckStatus === 'NOT_STARTED').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Issues</div>
          <div className="text-2xl font-bold text-red-600">
            {caregivers.filter(c => c.backgroundCheckStatus === 'EXPIRED' || c.backgroundCheckStatus === 'CONSIDER').length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Name, email, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employment Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="ON_LEAVE">On Leave</option>
              <option value="TERMINATED">Terminated</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
            <select
              value={filterEmploymentType}
              onChange={(e) => setFilterEmploymentType(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="ALL">All Types</option>
              <option value="FULL_TIME">Full Time</option>
              <option value="PART_TIME">Part Time</option>
              <option value="PER_DIEM">Per Diem</option>
              <option value="CONTRACT">Contract</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Background Check</label>
            <select
              value={filterBackgroundCheck}
              onChange={(e) => setFilterBackgroundCheck(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="CLEAR">Clear</option>
              <option value="PENDING">Pending</option>
              <option value="NOT_STARTED">Not Started</option>
              <option value="CONSIDER">Consider</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            <FiDownload size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedIds.size}
        totalCount={caregivers.length}
        actions={bulkActions}
        onAction={handleBulkAction}
        onClearSelection={() => setSelectedIds(new Set())}
        loading={loading}
      />

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading caregivers...</p>
          </div>
        ) : caregivers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No caregivers found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={caregivers.length > 0 && selectedIds.size === caregivers.length}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Caregiver</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Experience</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Background</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {caregivers.map((caregiver) => (
                  <tr key={caregiver.id} className={`hover:bg-gray-50 ${selectedIds.has(caregiver.id) ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(caregiver.id)}
                        onChange={() => toggleSelection(caregiver.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-medium">
                              {caregiver.user.firstName?.[0]}{caregiver.user.lastName?.[0]}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {caregiver.user.firstName} {caregiver.user.lastName}
                          </div>
                          <div className="text-sm text-gray-500">ID: {caregiver.id.slice(0, 8)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{caregiver.user.email}</div>
                      {caregiver.user.phone && <div className="text-sm text-gray-500">{caregiver.user.phone}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {caregiver.yearsExperience ? `${caregiver.yearsExperience} years` : 'N/A'}
                      </div>
                      {caregiver.hourlyRate && <div className="text-sm text-gray-500">${caregiver.hourlyRate}/hr</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{caregiver.employmentType?.replace('_', ' ') || 'N/A'}</div>
                      {caregiver.employmentStatus && getEmploymentStatusBadge(caregiver.employmentStatus)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getBackgroundCheckBadge(caregiver.backgroundCheckStatus)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{getUserStatusBadge(caregiver.user.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/admin/caregivers/${caregiver.id}`}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-900"
                      >
                        <FiEye size={16} />
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{(page - 1) * 20 + 1}</span> to{' '}
                <span className="font-medium">{Math.min(page * 20, totalCount)}</span> of{' '}
                <span className="font-medium">{totalCount}</span> results
              </p>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
