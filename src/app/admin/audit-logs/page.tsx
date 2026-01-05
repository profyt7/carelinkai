'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AuditLog {
  id: string;
  action: string;
  userId: string;
  actionedBy: string | null;
  resourceType: string;
  resourceId: string | null;
  description: string;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: any;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  actionedByUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Stats {
  actions: { action: string; count: number }[];
}

export default function AuditLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [stats, setStats] = useState<Stats>({ actions: [] });
  
  // Filters
  const [action, setAction] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [resourceType, setResourceType] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const actionTypes = [
    'CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT',
    'EXPORT', 'IMPORT', 'ACCESS_DENIED', 'REPORT_GENERATED',
    'REPORT_SCHEDULED', 'REPORT_DOWNLOADED', 'USER_IMPERSONATION_STARTED',
    'USER_IMPERSONATION_ENDED', 'OTHER'
  ];

  useEffect(() => {
    fetchLogs();
  }, [pagination.page, action, userId, resourceType, startDate, endDate, search]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (action) params.append('action', action);
      if (userId) params.append('userId', userId);
      if (resourceType) params.append('resourceType', resourceType);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (search) params.append('search', search);

      const response = await fetch(`/api/admin/audit-logs?${params}`);
      if (!response.ok) throw new Error('Failed to fetch logs');

      const data = await response.json();
      setLogs(data.logs);
      setPagination(data.pagination);
      setStats(data.stats);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (action) params.append('action', action);
      if (userId) params.append('userId', userId);
      if (resourceType) params.append('resourceType', resourceType);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/admin/audit-logs/export?${params}`);
      if (!response.ok) throw new Error('Failed to export logs');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting logs:', error);
      alert('Failed to export audit logs');
    }
  };

  const resetFilters = () => {
    setAction('');
    setUserId('');
    setResourceType('');
    setStartDate('');
    setEndDate('');
    setSearch('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const getActionBadgeColor = (action: string) => {
    const colors: { [key: string]: string } = {
      CREATE: 'bg-green-100 text-green-800',
      READ: 'bg-blue-100 text-blue-800',
      UPDATE: 'bg-yellow-100 text-yellow-800',
      DELETE: 'bg-red-100 text-red-800',
      LOGIN: 'bg-purple-100 text-purple-800',
      LOGOUT: 'bg-gray-100 text-gray-800',
      EXPORT: 'bg-indigo-100 text-indigo-800',
      IMPORT: 'bg-teal-100 text-teal-800',
      ACCESS_DENIED: 'bg-red-200 text-red-900',
      USER_IMPERSONATION_STARTED: 'bg-orange-100 text-orange-800',
      USER_IMPERSONATION_ENDED: 'bg-orange-100 text-orange-800',
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-600 mt-2">
            View and export system activity logs
          </p>
        </div>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Export to CSV
        </button>
      </div>

      {/* Stats Section */}
      {stats.actions.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
          {stats.actions.slice(0, 7).map((stat) => (
            <div key={stat.action} className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">{stat.action}</div>
              <div className="text-2xl font-bold">{stat.count}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Action Type
            </label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Actions</option>
              {actionTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resource Type
            </label>
            <input
              type="text"
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value)}
              placeholder="e.g., USER, HOME, INQUIRY"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User ID
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Filter by user ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search description, IP, resource ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={resetFilters}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resource
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Loading audit logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getActionBadgeColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="text-gray-900">
                        {log.user.firstName} {log.user.lastName}
                      </div>
                      <div className="text-gray-500 text-xs">{log.user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="text-gray-900">{log.resourceType}</div>
                      {log.resourceId && (
                        <div className="text-gray-500 text-xs">{log.resourceId}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {log.description}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="max-w-[150px] break-all">{log.ipAddress || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} results
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold">Audit Log Details</h2>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID</label>
                <p className="text-sm text-gray-900 font-mono">{selectedLog.id}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${getActionBadgeColor(selectedLog.action)}`}>
                    {selectedLog.action}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Timestamp</label>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedLog.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                <p className="text-sm text-gray-900">
                  {selectedLog.user.firstName} {selectedLog.user.lastName} ({selectedLog.user.email})
                </p>
                <p className="text-xs text-gray-500">
                  Role: {selectedLog.user.role} | ID: {selectedLog.userId}
                </p>
              </div>

              {selectedLog.actionedByUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Actioned By</label>
                  <p className="text-sm text-gray-900">
                    {selectedLog.actionedByUser.firstName} {selectedLog.actionedByUser.lastName} ({selectedLog.actionedByUser.email})
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Resource Type</label>
                  <p className="text-sm text-gray-900">{selectedLog.resourceType}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Resource ID</label>
                  <p className="text-sm text-gray-900 font-mono">{selectedLog.resourceId || 'N/A'}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <p className="text-sm text-gray-900">{selectedLog.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IP Address</label>
                  <p className="text-sm text-gray-900 font-mono">{selectedLog.ipAddress || 'N/A'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User Agent</label>
                  <p className="text-sm text-gray-900 truncate" title={selectedLog.userAgent || 'N/A'}>
                    {selectedLog.userAgent || 'N/A'}
                  </p>
                </div>
              </div>

              {selectedLog.metadata && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Metadata</label>
                  <pre className="text-xs bg-gray-50 p-3 rounded border border-gray-200 overflow-x-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
