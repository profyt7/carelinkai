'use client';

import { useState, useEffect, useCallback } from 'react';
import { FiDownload, FiRefreshCw, FiShield, FiAlertTriangle, FiUsers, FiDatabase } from 'react-icons/fi';

interface LogEntry {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  description: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    email: string;
    role: string;
    firstName: string;
    lastName: string;
  } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Summary {
  totalEvents: number;
  uniqueActors: number;
  uniqueSubjects: number;
  deniedCount: number;
}

const PHI_RESOURCE_TYPES = [
  'Resident',
  'Document',
  'ResidentDocument',
  'InquiryDocument',
  'GalleryPhoto',
];

const ALL_ACTIONS = ['READ', 'ACCESS_DENIED', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT'];

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700',
  OPERATOR: 'bg-blue-100 text-blue-700',
  FAMILY: 'bg-green-100 text-green-700',
  CAREGIVER: 'bg-yellow-100 text-yellow-700',
};

const ACTION_COLORS: Record<string, string> = {
  READ: 'bg-neutral-100 text-neutral-700',
  ACCESS_DENIED: 'bg-red-100 text-red-700',
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-orange-100 text-orange-700',
  EXPORT: 'bg-purple-100 text-purple-700',
};

function getDefaultDates() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export default function PhiAccessPage() {
  const defaults = getDefaultDates();

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 100, total: 0, totalPages: 0 });
  const [summary, setSummary] = useState<Summary>({ totalEvents: 0, uniqueActors: 0, uniqueSubjects: 0, deniedCount: 0 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const [selectedActions, setSelectedActions] = useState<string[]>(['READ', 'ACCESS_DENIED']);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [actorEmail, setActorEmail] = useState('');
  const [page, setPage] = useState(1);
  const [expandedUserAgent, setExpandedUserAgent] = useState<string | null>(null);

  const buildQuery = useCallback((overrides: Record<string, string> = {}) => {
    const p = new URLSearchParams({
      startDate,
      endDate,
      page: String(page),
      ...overrides,
    });
    if (selectedActions.length > 0) p.set('action', selectedActions.join(','));
    if (selectedTypes.length > 0) p.set('resourceType', selectedTypes.join(','));
    if (subject) p.set('subject', subject);
    if (actorEmail) p.set('actorEmail', actorEmail);
    return p.toString();
  }, [startDate, endDate, page, selectedActions, selectedTypes, subject, actorEmail]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/phi-access?${buildQuery()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setLogs(data.logs);
      setPagination(data.pagination);
      setSummary(data.summary);
    } catch {
      // error already surfaced via empty state
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const qs = buildQuery({ format: 'csv' });
      const res = await fetch(`/api/admin/phi-access?${qs}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `phi-access-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const toggleAction = (a: string) => {
    setSelectedActions((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]);
    setPage(1);
  };

  const toggleType = (t: string) => {
    setSelectedTypes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
    setPage(1);
  };

  const applyDatePreset = (days: number) => {
    const e = new Date();
    const s = new Date();
    s.setDate(s.getDate() - days);
    setStartDate(s.toISOString().slice(0, 10));
    setEndDate(e.toISOString().slice(0, 10));
    setPage(1);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FiShield className="w-6 h-6 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">ePHI Access Log</h1>
            <p className="text-sm text-neutral-500">HIPAA audit trail for protected health information</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 border border-neutral-300 rounded-lg text-sm hover:bg-neutral-50 disabled:opacity-50"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || loading}
            className="flex items-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50"
          >
            <FiDownload className="w-4 h-4" />
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard icon={<FiShield />} label="Total Events" value={summary.totalEvents} color="blue" />
        <SummaryCard icon={<FiUsers />} label="Unique Actors" value={summary.uniqueActors} color="green" />
        <SummaryCard icon={<FiDatabase />} label="Unique Subjects" value={summary.uniqueSubjects} color="purple" />
        <SummaryCard icon={<FiAlertTriangle />} label="Access Denied" value={summary.deniedCount} color="red" />
      </div>

      {/* Filters */}
      <div className="bg-white border border-neutral-200 rounded-lg p-4 mb-6 space-y-4">
        {/* Date range */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-neutral-700 w-20">Date range</span>
          <div className="flex gap-2">
            {[
              { label: 'Today', days: 0 },
              { label: '7d', days: 7 },
              { label: '30d', days: 30 },
            ].map(({ label, days }) => (
              <button
                key={label}
                onClick={() => days === 0 ? applyDatePreset(0) : applyDatePreset(days)}
                className="px-3 py-1 text-sm border border-neutral-300 rounded hover:bg-neutral-50"
              >
                {label}
              </button>
            ))}
          </div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            className="border border-neutral-300 rounded px-2 py-1 text-sm"
          />
          <span className="text-neutral-500 text-sm">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            className="border border-neutral-300 rounded px-2 py-1 text-sm"
          />
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-neutral-700 w-20">Actions</span>
          {ALL_ACTIONS.map((a) => (
            <button
              key={a}
              onClick={() => toggleAction(a)}
              className={`px-2 py-1 text-xs rounded border transition-colors ${
                selectedActions.includes(a)
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-neutral-300 text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              {a}
            </button>
          ))}
        </div>

        {/* Resource types */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-neutral-700 w-20">Resource</span>
          {PHI_RESOURCE_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => toggleType(t)}
              className={`px-2 py-1 text-xs rounded border transition-colors ${
                selectedTypes.includes(t)
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-neutral-300 text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Text searches */}
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Subject (resident name / ID / doc ID)"
            value={subject}
            onChange={(e) => { setSubject(e.target.value); setPage(1); }}
            className="flex-1 min-w-48 border border-neutral-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <input
            type="text"
            placeholder="Actor email"
            value={actorEmail}
            onChange={(e) => { setActorEmail(e.target.value); setPage(1); }}
            className="flex-1 min-w-48 border border-neutral-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-neutral-500">Loading…</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-neutral-500">No PHI access events match the current filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-neutral-600">Timestamp</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-600">Actor</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-600">Action</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-600">Resource</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-600">Resource ID</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-600">IP</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-600">UA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 text-xs text-neutral-600 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {log.user ? (
                        <div>
                          <div className="text-xs text-neutral-900">{log.user.email}</div>
                          <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[log.user.role] ?? 'bg-neutral-100 text-neutral-600'}`}>
                            {log.user.role}
                          </span>
                        </div>
                      ) : (
                        <span className="text-neutral-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${ACTION_COLORS[log.action] ?? 'bg-neutral-100 text-neutral-600'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-700">{log.resourceType}</td>
                    <td className="px-4 py-3 text-xs font-mono text-neutral-600 max-w-[140px] truncate" title={log.resourceId ?? ''}>
                      {log.resourceId ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-600">{log.ipAddress ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-neutral-500 max-w-[120px]">
                      {log.userAgent ? (
                        <span
                          className="cursor-pointer truncate block"
                          title={log.userAgent}
                          onClick={() => setExpandedUserAgent(expandedUserAgent === log.id ? null : log.id)}
                        >
                          {expandedUserAgent === log.id
                            ? log.userAgent
                            : log.userAgent.slice(0, 40) + (log.userAgent.length > 40 ? '…' : '')}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200">
            <span className="text-sm text-neutral-600">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm border border-neutral-300 rounded disabled:opacity-50 hover:bg-neutral-50"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="px-3 py-1 text-sm border border-neutral-300 rounded disabled:opacity-50 hover:bg-neutral-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600',
  };
  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          {icon}
        </div>
        <span className="text-sm text-neutral-600">{label}</span>
      </div>
      <div className="text-2xl font-bold text-neutral-900">{value.toLocaleString()}</div>
    </div>
  );
}
