'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Inbox, Clock, CheckCircle, Loader2, ArrowRight, Stethoscope } from 'lucide-react';

type Row = {
  id: string;
  queryText: string;
  conciergeStatus: 'SUBMITTED' | 'MATCHING' | 'SHORTLIST_READY' | null;
  conciergeSubmittedAt: string | null;
  conciergeRespondedAt: string | null;
  curatedHomes: { homeId: string }[] | null;
  createdAt: string;
  user: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    dischargePlannerProfile: { organization: string | null } | null;
  } | null;
};

const FILTERS = [
  { key: 'OPEN', label: 'Open' },
  { key: 'SUBMITTED', label: 'Submitted' },
  { key: 'MATCHING', label: 'Matching' },
  { key: 'SHORTLIST_READY', label: 'Sent' },
  { key: 'ALL', label: 'All' },
] as const;

function StatusBadge({ status }: { status: Row['conciergeStatus'] }) {
  if (status === 'SHORTLIST_READY')
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800"><CheckCircle className="h-3 w-3" /> Sent</span>;
  if (status === 'MATCHING')
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800"><Loader2 className="h-3 w-3" /> Matching</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800"><Inbox className="h-3 w-3" /> Submitted</span>;
}

export default function AdminConciergeQueuePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('OPEN');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = filter === 'OPEN' || filter === 'ALL' ? '' : `?status=${filter}`;
      const res = await fetch(`/api/admin/concierge${qs}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load');
      let list: Row[] = Array.isArray(data.requests) ? data.requests : [];
      if (filter === 'OPEN') list = list.filter((r) => r.conciergeStatus !== 'SHORTLIST_READY');
      setRows(list);
    } catch (e: any) {
      setError(e?.message || 'Failed to load the queue');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const dpName = (r: Row) =>
    [r.user?.firstName, r.user?.lastName].filter(Boolean).join(' ') || r.user?.email || 'Discharge planner';

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
          <Stethoscope className="h-6 w-6 text-primary-600" /> Concierge queue
        </h1>
        <p className="text-neutral-600 text-sm mt-1">
          Discharge-planner placement requests routed to CareLinkAI. Curate a shortlist and send it back in-app.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key ? 'bg-primary-600 text-white' : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-neutral-500">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…
        </div>
      ) : error ? (
        <div className="bg-error-50 border border-error-200 rounded-xl p-4 text-error-700 text-sm">{error}</div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-10 text-center text-neutral-500">
          <Inbox className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
          Nothing here right now.
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow divide-y divide-neutral-100">
          {rows.map((r) => (
            <Link
              key={r.id}
              href={`/admin/concierge/${r.id}`}
              className="flex items-center justify-between gap-4 p-4 hover:bg-neutral-50 transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-neutral-900 truncate">{dpName(r)}</span>
                  {r.user?.dischargePlannerProfile?.organization && (
                    <span className="text-xs text-neutral-500 truncate">· {r.user.dischargePlannerProfile.organization}</span>
                  )}
                </div>
                <p className="text-sm text-neutral-600 truncate max-w-xl">{r.queryText}</p>
                <p className="text-xs text-neutral-400 mt-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {r.conciergeSubmittedAt ? new Date(r.conciergeSubmittedAt).toLocaleString() : new Date(r.createdAt).toLocaleString()}
                  {r.conciergeStatus === 'SHORTLIST_READY' && r.curatedHomes ? ` · ${r.curatedHomes.length} homes sent` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <StatusBadge status={r.conciergeStatus} />
                <ArrowRight className="h-4 w-4 text-neutral-400" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
