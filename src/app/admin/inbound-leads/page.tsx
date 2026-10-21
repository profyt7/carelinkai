'use client';

/**
 * /admin/inbound-leads — callbacks from the published phone number (OL-167c).
 * One row per call: who called (planner / family / facility / other), name,
 * org, callback number (tap to call), urgency, reason (PHI-guarded), flags,
 * recording + transcript links. Mark contacted / Close. Admin only — the API
 * 403s everyone else. Business facts only — never resident information.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, RefreshCw, Check, X, ExternalLink, Headphones, Phone } from 'lucide-react';

type CallerType = 'PLANNER' | 'FAMILY' | 'FACILITY' | 'OTHER';
type Status = 'NEW' | 'CONTACTED' | 'CLOSED';
type Row = {
  id: string;
  conversationId: string;
  callerType: CallerType;
  name: string | null;
  organization: string | null;
  callbackPhone: string;
  urgency: 'TODAY' | 'THIS_WEEK' | 'PLANNING' | null;
  reason: string | null;
  transcriptUrl: string | null;
  recordingUrl: string | null;
  afterHours: boolean;
  status: Status;
  receivedAt: string;
  contactedAt: string | null;
  closedAt: string | null;
  phiFlag: boolean;
};
type Data = { rows: Row[]; counts: Record<string, number>; generatedAt: string };

const STATUS_FILTERS = [
  { key: 'open', label: 'Open (new + contacted)' },
  { key: 'new', label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'closed', label: 'Closed' },
  { key: 'all', label: 'All' },
] as const;
const TYPE_FILTERS = [
  { key: 'all', label: 'All callers' },
  { key: 'planner', label: 'Planner' },
  { key: 'family', label: 'Family' },
  { key: 'facility', label: 'Facility' },
  { key: 'other', label: 'Other' },
] as const;

const fmtDate = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString() : '—');
const label = (v: string | null | undefined) => (v ? v.toLowerCase().replace(/_/g, ' ') : '—');
const TYPE_STYLE: Record<CallerType, string> = {
  PLANNER: 'bg-primary-50 text-primary-700',
  FAMILY: 'bg-success-50 text-success-700',
  FACILITY: 'bg-amber-100 text-amber-800',
  OTHER: 'bg-neutral-200 text-neutral-700',
};
const URGENCY_STYLE: Record<string, string> = {
  TODAY: 'bg-error-50 text-error-700',
  THIS_WEEK: 'bg-amber-100 text-amber-800',
  PLANNING: 'bg-neutral-100 text-neutral-700',
};
const STATUS_STYLE: Record<Status, string> = {
  NEW: 'bg-primary-50 text-primary-700',
  CONTACTED: 'bg-success-50 text-success-700',
  CLOSED: 'bg-neutral-200 text-neutral-700',
};
const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

export default function InboundLeadsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]['key']>('open');
  const [callerType, setCallerType] = useState<(typeof TYPE_FILTERS)[number]['key']>('all');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<Record<string, string>>({});
  // Overlapping loads (an action's reload racing a filter change): only the
  // latest request may write state, so a stale list never overwrites a newer one.
  const seq = useRef(0);

  const load = useCallback(async () => {
    const mine = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/inbound-leads?status=${status}&callerType=${callerType}`, { credentials: 'include', cache: 'no-store' });
      if (!r.ok) throw new Error(r.status === 403 ? 'Admin only.' : `Failed (${r.status})`);
      const json = (await r.json()) as Data;
      if (mine !== seq.current) return;
      setData(json);
    } catch (e) {
      if (mine !== seq.current) return;
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [status, callerType]);
  useEffect(() => { void load(); }, [load]);

  async function act(row: Row, action: 'contacted' | 'close') {
    setBusy(row.id);
    setMsg((m) => ({ ...m, [row.id]: '' }));
    try {
      const r = await fetch(`/api/admin/inbound-leads/${row.id}`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `Failed (${r.status})`);
      setMsg((m) => ({ ...m, [row.id]: action === 'contacted' ? 'Marked contacted ✓' : 'Closed ✓' }));
      await load();
    } catch (err) {
      setMsg((m) => ({ ...m, [row.id]: err instanceof Error ? err.message : 'Failed' }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Inbound leads</h1>
          <p className="text-sm text-neutral-600 mt-1">
            Callbacks from the published number. Planners first — tap the number to call back, then Mark contacted. Close when done.
            Reasons are PHI-guarded; a flagged row means the caller said something that looked like patient detail, so get it by phone, not here.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={callerType} onChange={(e) => setCallerType(e.target.value as typeof callerType)} className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm" data-testid="inbound-leads-type">
            {TYPE_FILTERS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm" data-testid="inbound-leads-status">
            {STATUS_FILTERS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
          <button onClick={() => void load()} className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {data && (
        <div className="flex flex-wrap gap-3 text-xs text-neutral-600" data-testid="inbound-leads-counts">
          {Object.entries(data.counts).map(([k, v]) => (
            <span key={k} className="rounded-full bg-neutral-100 px-2.5 py-1" data-count-key={k}>{k}: <strong className="text-neutral-900">{v}</strong></span>
          ))}
        </div>
      )}

      {loading ? (
        <div className="p-8 flex items-center justify-center text-neutral-500"><Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…</div>
      ) : error ? (
        <div className="bg-error-50 border border-error-200 rounded-xl p-4 text-error-700 text-sm">{error}</div>
      ) : !data || data.rows.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-10 text-center text-neutral-500" data-testid="inbound-leads-empty">No calls in this view.</div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-2xl shadow">
          <table className="min-w-full text-sm" data-testid="inbound-leads-table">
            <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-3 py-3">Received</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Name</th>
                <th className="px-3 py-3">Org</th>
                <th className="px-3 py-3">Phone</th>
                <th className="px-3 py-3">Urgency</th>
                <th className="px-3 py-3">Reason</th>
                <th className="px-3 py-3">Flags</th>
                <th className="px-3 py-3">Links</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {data.rows.map((r) => (
                <tr key={r.id} data-testid="inbound-lead-row" data-lead-id={r.id} data-status={r.status} data-caller-type={r.callerType}>
                  <td className="px-3 py-2 whitespace-nowrap text-neutral-700">{fmtDate(r.receivedAt)}</td>
                  <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TYPE_STYLE[r.callerType]}`}>{label(r.callerType)}</span></td>
                  <td className="px-3 py-2 text-neutral-900">{r.name ?? '—'}</td>
                  <td className="px-3 py-2 text-neutral-700">{r.organization ?? '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <a href={telHref(r.callbackPhone)} className="inline-flex items-center gap-1 font-medium text-primary-700 hover:underline" data-testid="inbound-lead-phone"><Phone className="h-3.5 w-3.5" /> {r.callbackPhone}</a>
                  </td>
                  <td className="px-3 py-2">{r.urgency ? <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${URGENCY_STYLE[r.urgency] ?? ''}`}>{label(r.urgency)}</span> : '—'}</td>
                  <td className="px-3 py-2 max-w-xs text-neutral-800" data-testid="inbound-lead-reason">{r.reason ?? '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {r.afterHours && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800" data-testid="flag-after-hours">after hours</span>}
                      {r.phiFlag && <span className="rounded-full bg-error-50 px-2 py-0.5 text-xs font-semibold text-error-700" data-testid="flag-phi">possible PHI</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {r.recordingUrl && <a href={r.recordingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary-700 hover:underline" data-testid="inbound-lead-recording"><Headphones className="h-4 w-4" /> Recording</a>}
                      {r.transcriptUrl && <a href={r.transcriptUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary-700 hover:underline" data-testid="inbound-lead-transcript"><ExternalLink className="h-4 w-4" /> Transcript</a>}
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[r.status]}`}>{label(r.status)}</span>
                    {r.status !== 'NEW' && <div className="mt-0.5 text-[11px] text-neutral-500">{r.status === 'CLOSED' ? fmtDate(r.closedAt) : fmtDate(r.contactedAt)}</div>}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {r.status === 'NEW' && (
                        <button disabled={busy === r.id} onClick={() => void act(r, 'contacted')} className="inline-flex items-center gap-1 rounded-lg bg-success-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-success-700 disabled:opacity-60" data-testid="inbound-lead-contacted"><Check className="h-3.5 w-3.5" /> Mark contacted</button>
                      )}
                      {r.status !== 'CLOSED' && (
                        <button disabled={busy === r.id} onClick={() => void act(r, 'close')} className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-60" data-testid="inbound-lead-close"><X className="h-3.5 w-3.5" /> Close</button>
                      )}
                    </div>
                    {msg[r.id] && <div className="mt-1 text-[11px] text-neutral-600" data-testid="inbound-lead-msg">{msg[r.id]}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-3 py-2 text-xs text-neutral-400">Generated {new Date(data.generatedAt).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
}
