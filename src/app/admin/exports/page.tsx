'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FiDownload, 
  FiUsers, 
  FiHome, 
  FiInbox, 
  FiUserCheck, 
  FiHeart, 
  FiFileText, 
  FiActivity,
  FiCalendar,
  FiFilter,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiRefreshCw
} from 'react-icons/fi';

interface ExportHistory {
  id: string;
  exportType: string;
  fileName: string;
  recordCount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  filters: any;
  createdAt: string;
  completedAt: string | null;
  downloadUrl: string | null;
  exportedBy: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface ExportConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  endpoint: string;
  filters: FilterConfig[];
}

interface FilterConfig {
  id: string;
  label: string;
  type: 'select' | 'date' | 'text';
  options?: { value: string; label: string }[];
}

const exportConfigs: ExportConfig[] = [
  {
    id: 'users',
    name: 'Users',
    description: 'Export all platform users including admins, operators, families, and caregivers',
    icon: <FiUsers className="w-6 h-6" />,
    endpoint: '/api/admin/exports/users',
    filters: [
      {
        id: 'role',
        label: 'Role',
        type: 'select',
        options: [
          { value: '', label: 'All Roles' },
          { value: 'ADMIN', label: 'Admin' },
          { value: 'OPERATOR', label: 'Operator' },
          { value: 'FAMILY', label: 'Family' },
          { value: 'CAREGIVER', label: 'Caregiver' },
          { value: 'AFFILIATE', label: 'Affiliate' },
        ]
      },
      {
        id: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: '', label: 'All Status' },
          { value: 'ACTIVE', label: 'Active' },
          { value: 'INACTIVE', label: 'Inactive' },
          { value: 'PENDING', label: 'Pending' },
        ]
      },
      { id: 'startDate', label: 'From Date', type: 'date' },
      { id: 'endDate', label: 'To Date', type: 'date' },
    ]
  },
  {
    id: 'homes',
    name: 'Homes/Facilities',
    description: 'Export all assisted living homes and facilities data',
    icon: <FiHome className="w-6 h-6" />,
    endpoint: '/api/admin/exports/homes',
    filters: [
      {
        id: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: '', label: 'All Status' },
          { value: 'ACTIVE', label: 'Active' },
          { value: 'INACTIVE', label: 'Inactive' },
          { value: 'PENDING', label: 'Pending' },
        ]
      },
      { id: 'city', label: 'City', type: 'text' },
      { id: 'state', label: 'State', type: 'text' },
      { id: 'startDate', label: 'From Date', type: 'date' },
      { id: 'endDate', label: 'To Date', type: 'date' },
    ]
  },
  {
    id: 'inquiries',
    name: 'Inquiries',
    description: 'Export all lead inquiries and contact requests',
    icon: <FiInbox className="w-6 h-6" />,
    endpoint: '/api/admin/exports/inquiries',
    filters: [
      {
        id: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: '', label: 'All Status' },
          { value: 'NEW', label: 'New' },
          { value: 'IN_PROGRESS', label: 'In Progress' },
          { value: 'CONTACTED', label: 'Contacted' },
          { value: 'SCHEDULED', label: 'Scheduled' },
          { value: 'CONVERTED', label: 'Converted' },
          { value: 'CLOSED', label: 'Closed' },
        ]
      },
      {
        id: 'source',
        label: 'Source',
        type: 'select',
        options: [
          { value: '', label: 'All Sources' },
          { value: 'WEBSITE', label: 'Website' },
          { value: 'REFERRAL', label: 'Referral' },
          { value: 'PHONE', label: 'Phone' },
          { value: 'WALKIN', label: 'Walk-in' },
        ]
      },
      { id: 'startDate', label: 'From Date', type: 'date' },
      { id: 'endDate', label: 'To Date', type: 'date' },
    ]
  },
  {
    id: 'caregivers',
    name: 'Caregivers',
    description: 'Export all caregiver profiles and certifications',
    icon: <FiUserCheck className="w-6 h-6" />,
    endpoint: '/api/admin/exports/caregivers',
    filters: [
      {
        id: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: '', label: 'All Status' },
          { value: 'ACTIVE', label: 'Active' },
          { value: 'INACTIVE', label: 'Inactive' },
          { value: 'PENDING', label: 'Pending' },
        ]
      },
      {
        id: 'certificationStatus',
        label: 'Certification',
        type: 'select',
        options: [
          { value: '', label: 'All' },
          { value: 'CERTIFIED', label: 'Certified' },
          { value: 'PENDING', label: 'Pending Certification' },
          { value: 'EXPIRED', label: 'Expired' },
        ]
      },
      { id: 'startDate', label: 'From Date', type: 'date' },
      { id: 'endDate', label: 'To Date', type: 'date' },
    ]
  },
  {
    id: 'residents',
    name: 'Residents',
    description: 'Export all resident profiles and care information',
    icon: <FiHeart className="w-6 h-6" />,
    endpoint: '/api/admin/exports/residents',
    filters: [
      {
        id: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: '', label: 'All Status' },
          { value: 'ACTIVE', label: 'Active' },
          { value: 'DISCHARGED', label: 'Discharged' },
          { value: 'PENDING', label: 'Pending' },
        ]
      },
      {
        id: 'careLevel',
        label: 'Care Level',
        type: 'select',
        options: [
          { value: '', label: 'All Levels' },
          { value: 'LOW', label: 'Low' },
          { value: 'MEDIUM', label: 'Medium' },
          { value: 'HIGH', label: 'High' },
        ]
      },
      { id: 'startDate', label: 'From Date', type: 'date' },
      { id: 'endDate', label: 'To Date', type: 'date' },
    ]
  },
  {
    id: 'audit-logs',
    name: 'Audit Logs',
    description: 'Export system audit logs and activity history',
    icon: <FiActivity className="w-6 h-6" />,
    endpoint: '/api/admin/exports/audit-logs',
    filters: [
      {
        id: 'action',
        label: 'Action Type',
        type: 'select',
        options: [
          { value: '', label: 'All Actions' },
          { value: 'CREATE', label: 'Create' },
          { value: 'UPDATE', label: 'Update' },
          { value: 'DELETE', label: 'Delete' },
          { value: 'LOGIN', label: 'Login' },
          { value: 'LOGOUT', label: 'Logout' },
          { value: 'EXPORT', label: 'Export' },
        ]
      },
      {
        id: 'resourceType',
        label: 'Resource Type',
        type: 'select',
        options: [
          { value: '', label: 'All Resources' },
          { value: 'USER', label: 'User' },
          { value: 'HOME', label: 'Home' },
          { value: 'RESIDENT', label: 'Resident' },
          { value: 'INQUIRY', label: 'Inquiry' },
          { value: 'CAREGIVER', label: 'Caregiver' },
        ]
      },
      { id: 'startDate', label: 'From Date', type: 'date' },
      { id: 'endDate', label: 'To Date', type: 'date' },
    ]
  },
];

export default function DataExportsPage() {
  const router = useRouter();
  const [selectedExport, setSelectedExport] = useState<ExportConfig | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [exportHistory, setExportHistory] = useState<ExportHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');

  useEffect(() => {
    fetchExportHistory();
  }, []);

  const fetchExportHistory = async () => {
    try {
      setHistoryLoading(true);
      const response = await fetch('/api/admin/exports/history');
      if (response.ok) {
        const data = await response.json();
        setExportHistory(data.exports || []);
      }
    } catch (error) {
      console.error('Failed to fetch export history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleFilterChange = (filterId: string, value: string) => {
    setFilters(prev => ({ ...prev, [filterId]: value }));
  };

  const handleExport = async (config: ExportConfig) => {
    try {
      setExporting(config.id);
      
      // Build query params from filters
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      params.append('format', exportFormat);

      const response = await fetch(`${config.endpoint}?${params.toString()}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Export failed');
      }

      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `${config.id}_export_${new Date().toISOString().split('T')[0]}.${exportFormat}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Refresh export history
      fetchExportHistory();
      
      // Reset filters and selection
      setSelectedExport(null);
      setFilters({});
    } catch (error) {
      console.error('Export failed:', error);
      alert(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setExporting(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <FiCheckCircle className="w-3 h-3" /> Completed
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <FiClock className="w-3 h-3" /> Pending
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <FiAlertCircle className="w-3 h-3" /> Failed
          </span>
        );
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Data Exports</h1>
          <p className="text-neutral-600 mt-1">Export platform data in CSV or JSON format</p>
        </div>
        <button
          onClick={fetchExportHistory}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50"
        >
          <FiRefreshCw className="w-4 h-4" />
          Refresh History
        </button>
      </div>

      {/* Export Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {exportConfigs.map((config) => (
          <div
            key={config.id}
            className={`bg-white rounded-xl border-2 p-5 cursor-pointer transition-all ${
              selectedExport?.id === config.id
                ? 'border-primary-500 ring-2 ring-primary-100'
                : 'border-neutral-200 hover:border-neutral-300 hover:shadow-sm'
            }`}
            onClick={() => {
              setSelectedExport(selectedExport?.id === config.id ? null : config);
              setFilters({});
            }}
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${
                selectedExport?.id === config.id ? 'bg-primary-100 text-primary-600' : 'bg-neutral-100 text-neutral-600'
              }`}>
                {config.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-neutral-900">{config.name}</h3>
                <p className="text-sm text-neutral-500 mt-1">{config.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Export Configuration Panel */}
      {selectedExport && (
        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-neutral-900">
              Export {selectedExport.name}
            </h2>
            <button
              onClick={() => setSelectedExport(null)}
              className="text-neutral-400 hover:text-neutral-600"
            >
              ✕
            </button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {selectedExport.filters.map((filter) => (
              <div key={filter.id}>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  {filter.label}
                </label>
                {filter.type === 'select' ? (
                  <select
                    value={filters[filter.id] || ''}
                    onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    {filter.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : filter.type === 'date' ? (
                  <input
                    type="date"
                    value={filters[filter.id] || ''}
                    onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                ) : (
                  <input
                    type="text"
                    placeholder={filter.label}
                    value={filters[filter.id] || ''}
                    onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                )}
              </div>
            ))}
          </div>

          {/* Format Selection & Export Button */}
          <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-neutral-700">Format:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setExportFormat('csv')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    exportFormat === 'csv'
                      ? 'bg-primary-100 text-primary-700 border border-primary-300'
                      : 'bg-neutral-100 text-neutral-600 border border-transparent hover:bg-neutral-200'
                  }`}
                >
                  CSV
                </button>
                <button
                  onClick={() => setExportFormat('json')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    exportFormat === 'json'
                      ? 'bg-primary-100 text-primary-700 border border-primary-300'
                      : 'bg-neutral-100 text-neutral-600 border border-transparent hover:bg-neutral-200'
                  }`}
                >
                  JSON
                </button>
              </div>
            </div>
            <button
              onClick={() => handleExport(selectedExport)}
              disabled={exporting === selectedExport.id}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {exporting === selectedExport.id ? (
                <>
                  <FiRefreshCw className="w-4 h-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <FiDownload className="w-4 h-4" />
                  Export {selectedExport.name}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Export History */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm">
        <div className="px-6 py-4 border-b border-neutral-200">
          <h2 className="text-lg font-semibold text-neutral-900">Export History</h2>
          <p className="text-sm text-neutral-500">Recent data exports from your account</p>
        </div>
        
        {historyLoading ? (
          <div className="p-8 text-center">
            <FiRefreshCw className="w-8 h-8 animate-spin text-neutral-400 mx-auto mb-2" />
            <p className="text-neutral-500">Loading export history...</p>
          </div>
        ) : exportHistory.length === 0 ? (
          <div className="p-8 text-center">
            <FiFileText className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <p className="text-neutral-500">No exports yet</p>
            <p className="text-sm text-neutral-400 mt-1">Your export history will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Export Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    File Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Records
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Exported By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {exportHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-neutral-900 capitalize">
                        {item.exportType.replace(/-/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                      {item.fileName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                      {item.recordCount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                      {item.exportedBy.firstName} {item.exportedBy.lastName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                      {new Date(item.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {item.status === 'COMPLETED' && item.downloadUrl && (
                        <a
                          href={item.downloadUrl}
                          className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
                        >
                          <FiDownload className="w-4 h-4" />
                          Download
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
