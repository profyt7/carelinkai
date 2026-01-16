'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  FiArrowLeft, FiSearch, FiFilter, FiRefreshCw, FiDownload, 
  FiEye, FiUser, FiHome, FiCalendar, FiMessageCircle, FiClock,
  FiAlertTriangle, FiCheckCircle, FiX, FiChevronLeft, FiChevronRight, FiTrash2, FiCheck
} from 'react-icons/fi';
import { format } from 'date-fns';
import { BulkActionsBar, BulkAction } from '@/components/admin/BulkActionsBar';
import toast from 'react-hot-toast';

interface Inquiry {
  id: string;
  status: string;
  urgency: string;
  source: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  careRecipientName: string | null;
  message: string | null;
  tourDate: string | null;
  createdAt: string;
  updatedAt: string;
  home: {
    id: string;
    name: string;
    address: {
      city: string;
      state: string;
    } | null;
    operator: {
      id: string;
      companyName: string;
      user: { firstName: string; lastName: string; email: string };
    };
  };
  family: {
    id: string;
    user: { firstName: string; lastName: string; email: string; phone: string | null };
  };
  assignedTo: { id: string; firstName: string; lastName: string; email: string } | null;
  convertedResident: { id: string; firstName: string; lastName: string } | null;
  followUps: { id: string; scheduledFor: string; type: string }[];
  _count: { documents: number; responses: number; followUps: number };
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'NEW', label: 'New' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'TOUR_SCHEDULED', label: 'Tour Scheduled' },
  { value: 'TOUR_COMPLETED', label: 'Tour Completed' },
  { value: 'PLACEMENT_OFFERED', label: 'Placement Offered' },
  { value: 'PLACEMENT_ACCEPTED', label: 'Placement Accepted' },
  { value: 'QUALIFIED', label: 'Qualified' },
  { value: 'CONVERTING', label: 'Converting' },
  { value: 'CONVERTED', label: 'Converted' },
  { value: 'CLOSED_LOST', label: 'Closed Lost' },
];

const URGENCY_OPTIONS = [
  { value: '', label: 'All Urgencies' },
  { value: 'URGENT', label: 'Urgent' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

const SOURCE_OPTIONS = [
  { value: '', label: 'All Sources' },
  { value: 'WEBSITE', label: 'Website' },
  { value: 'PHONE', label: 'Phone' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'SOCIAL_MEDIA', label: 'Social Media' },
  { value: 'WALK_IN', label: 'Walk-In' },
  { value: 'OTHER', label: 'Other' },
];

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    NEW: 'bg-blue-100 text-blue-800',
    CONTACTED: 'bg-yellow-100 text-yellow-800',
    TOUR_SCHEDULED: 'bg-purple-100 text-purple-800',
    TOUR_COMPLETED: 'bg-indigo-100 text-indigo-800',
    PLACEMENT_OFFERED: 'bg-orange-100 text-orange-800',
    PLACEMENT_ACCEPTED: 'bg-green-100 text-green-800',
    QUALIFIED: 'bg-cyan-100 text-cyan-800',
    CONVERTING: 'bg-amber-100 text-amber-800',
    CONVERTED: 'bg-emerald-100 text-emerald-800',
    CLOSED_LOST: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

const getUrgencyColor = (urgency: string) => {
  const colors: Record<string, string> = {
    URGENT: 'bg-red-100 text-red-800 border-red-300',
    HIGH: 'bg-orange-100 text-orange-800 border-orange-300',
    MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    LOW: 'bg-green-100 text-green-800 border-green-300',
  };
  return colors[urgency] || 'bg-gray-100 text-gray-800';
};

export default function AdminInquiriesPage() {
  const router = useRouter();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [statistics, setStatistics] = useState<{ byStatus: Record<string, number>; byUrgency: Record<string, number> }>({ byStatus: {}, byUrgency: {} });

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [urgency, setUrgency] = useState('');
  const [source, setSource] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchInquiries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', pagination.page.toString());
      params.set('limit', pagination.limit.toString());
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (urgency) params.set('urgency', urgency);
      if (source) params.set('source', source);
      if (assignedFilter) params.set('assignedTo', assignedFilter);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const res = await fetch(`/api/admin/inquiries?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch inquiries');
      
      const data = await res.json();
      setInquiries(data.inquiries);
      setPagination(data.pagination);
      setStatistics(data.statistics);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inquiries');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, status, urgency, source, assignedFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  // Clear selections when filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [pagination.page, search, status, urgency, source, assignedFilter, dateFrom, dateTo]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(p => ({ ...p, page: 1 }));
    fetchInquiries();
  };

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setUrgency('');
    setSource('');
    setAssignedFilter('');
    setDateFrom('');
    setDateTo('');
    setPagination(p => ({ ...p, page: 1 }));
  };

  const exportCSV = () => {
    const headers = ['ID', 'Status', 'Urgency', 'Contact Name', 'Contact Email', 'Home', 'Location', 'Operator', 'Created'];
    const rows = inquiries.map(i => [
      i.id,
      i.status,
      i.urgency,
      i.contactName || `${i.family?.user?.firstName || ''} ${i.family?.user?.lastName || ''}`.trim(),
      i.contactEmail || i.family?.user?.email || '',
      i.home?.name || '',
      `${i.home?.address?.city || ''}, ${i.home?.address?.state || ''}`.replace(/^, |, $/g, '') || 'N/A',
      i.home?.operator?.companyName || '',
      format(new Date(i.createdAt), 'yyyy-MM-dd'),
    ]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inquiries-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
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
    if (selectedIds.size === inquiries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(inquiries.map(i => i.id)));
    }
  };

  const handleBulkAction = async (actionId: string) => {
    const inquiryIds = Array.from(selectedIds);
    
    try {
      const response = await fetch('/api/admin/inquiries/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionId, inquiryIds }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(result.message);
        setSelectedIds(new Set());
        fetchInquiries();
      } else {
        toast.error(result.error || 'Bulk operation failed');
      }
    } catch (error) {
      toast.error('Bulk operation failed');
    }
  };

  const bulkActions: BulkAction[] = [
    { id: 'markContacted', label: 'Mark as Contacted', icon: <FiCheck size={16} />, variant: 'success', requireConfirmation: true, confirmationMessage: 'Are you sure you want to mark the selected inquiries as contacted?' },
    { id: 'markResolved', label: 'Mark as Resolved', icon: <FiCheckCircle size={16} />, variant: 'success', requireConfirmation: true, confirmationMessage: 'Are you sure you want to mark the selected inquiries as resolved?' },
    { id: 'closeLost', label: 'Close as Lost', icon: <FiX size={16} />, variant: 'warning', requireConfirmation: true, confirmationMessage: 'Are you sure you want to close the selected inquiries as lost? This indicates the lead did not convert.' },
    { id: 'delete', label: 'Delete Inquiries', icon: <FiTrash2 size={16} />, variant: 'danger', requireConfirmation: true, confirmationMessage: 'Are you sure you want to delete the selected inquiries? This action cannot be undone.' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="text-gray-500 hover:text-gray-700">
                <FiArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Inquiries Management</h1>
                <p className="text-sm text-gray-500">Manage all platform inquiries ({pagination.total} total)</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={fetchInquiries} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                <FiRefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                <FiDownload className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-2xl font-bold text-blue-600">{statistics.byStatus?.NEW || 0}</div>
            <div className="text-sm text-gray-500">New</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-2xl font-bold text-purple-600">{statistics.byStatus?.TOUR_SCHEDULED || 0}</div>
            <div className="text-sm text-gray-500">Tours Scheduled</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-2xl font-bold text-green-600">{statistics.byStatus?.CONVERTED || 0}</div>
            <div className="text-sm text-gray-500">Converted</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-2xl font-bold text-red-600">{statistics.byUrgency?.URGENT || 0}</div>
            <div className="text-sm text-gray-500">Urgent</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-2xl font-bold text-orange-600">{statistics.byUrgency?.HIGH || 0}</div>
            <div className="text-sm text-gray-500">High Priority</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-2xl font-bold text-gray-600">{pagination.total}</div>
            <div className="text-sm text-gray-500">Total</div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, phone, home..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="min-w-[150px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div className="min-w-[130px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {URGENCY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              <FiFilter className="w-4 h-4" />
              More Filters
            </button>
            <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              Search
            </button>
            {(search || status || urgency || source || assignedFilter || dateFrom || dateTo) && (
              <button type="button" onClick={clearFilters} className="px-4 py-2 text-gray-600 hover:text-gray-800">
                Clear
              </button>
            )}
          </form>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {SOURCE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assignment</label>
                <select
                  value={assignedFilter}
                  onChange={(e) => setAssignedFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All</option>
                  <option value="unassigned">Unassigned</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Bulk Actions Bar */}
        <BulkActionsBar
          selectedCount={selectedIds.size}
          totalCount={inquiries.length}
          actions={bulkActions}
          onAction={handleBulkAction}
          onClearSelection={() => setSelectedIds(new Set())}
          loading={loading}
        />

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <FiAlertTriangle className="w-5 h-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Inquiries Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-4 text-gray-500">Loading inquiries...</p>
            </div>
          ) : inquiries.length === 0 ? (
            <div className="p-8 text-center">
              <FiMessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No inquiries found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={inquiries.length > 0 && selectedIds.size === inquiries.length}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Home</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Urgency</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {inquiries.map((inquiry) => (
                    <tr key={inquiry.id} className={`hover:bg-gray-50 ${selectedIds.has(inquiry.id) ? 'bg-blue-50' : ''}`}>
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(inquiry.id)}
                          onChange={() => toggleSelection(inquiry.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <FiUser className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {inquiry.contactName || `${inquiry.family?.user?.firstName} ${inquiry.family?.user?.lastName}`}
                            </div>
                            <div className="text-sm text-gray-500">
                              {inquiry.contactEmail || inquiry.family?.user?.email}
                            </div>
                            {inquiry.careRecipientName && (
                              <div className="text-xs text-gray-400">Care for: {inquiry.careRecipientName}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <FiHome className="w-4 h-4 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{inquiry.home.name}</div>
                            <div className="text-sm text-gray-500">{inquiry.home.address?.city || 'N/A'}, {inquiry.home.address?.state || 'N/A'}</div>
                            <div className="text-xs text-gray-400">{inquiry.home.operator?.companyName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(inquiry.status)}`}>
                          {inquiry.status.replace(/_/g, ' ')}
                        </span>
                        {inquiry.convertedResident && (
                          <div className="mt-1 flex items-center text-xs text-green-600">
                            <FiCheckCircle className="w-3 h-3 mr-1" />
                            Converted
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getUrgencyColor(inquiry.urgency || 'MEDIUM')}`}>
                          {inquiry.urgency || 'MEDIUM'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {inquiry.assignedTo ? (
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">
                              {inquiry.assignedTo.firstName} {inquiry.assignedTo.lastName}
                            </div>
                            <div className="text-gray-500 text-xs">{inquiry.assignedTo.email}</div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{format(new Date(inquiry.createdAt), 'MMM d, yyyy')}</div>
                        <div className="text-xs text-gray-500">{format(new Date(inquiry.createdAt), 'h:mm a')}</div>
                        {inquiry.tourDate && (
                          <div className="flex items-center text-xs text-purple-600 mt-1">
                            <FiCalendar className="w-3 h-3 mr-1" />
                            Tour: {format(new Date(inquiry.tourDate), 'MMM d')}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/admin/inquiries/${inquiry.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100 transition"
                        >
                          <FiEye className="w-4 h-4" />
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
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} inquiries
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiChevronLeft className="w-5 h-5" />
                </button>
                <span className="px-4 py-2 text-sm">Page {pagination.page} of {pagination.totalPages}</span>
                <button
                  onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                  disabled={pagination.page === pagination.totalPages}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
