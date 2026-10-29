'use client';

/**
 * /admin/call-qa — QA queue for AI availability-call observations (OL-163c).
 * Pending observations with the transcript, the recording link and the parsed
 * fields. Approve / Correct (edit fields) / Reject / Mark do-not-call.
 * Approve or Correct is the ONLY way a call reaches the public listing:
 * availabilityVerifiedAt = calledAt, source AI_CALL, "Verified <date>" badge.
 * Admin role only (Elizabeth's login).
 */

import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw, Check, Edit3, X, PhoneOff, ExternalLink, Headphones } from 'lucide-react';

type Turn = { role: 'agent' | 'user'; message: string; timeSecs?: number };
type Row = {
  id: string;
  homeId: string;
  conversationId: string;
  calledAt: string;
  durationSecs: number | null;
  outcome: 'ANSWERED' | 'DECLINED' | 'NO_ANSWER' | 'WANTS_HUMAN' | 'WRONG_NUMBER';
  bedsAL: number | null;
  bedsMC: number | null;
  priceFromMonthly: number | null;
  priceUndisclosed: boolean | null;
  waiverStatus: 'ACCEPTING_NEW' | 'CURRENT_ONLY' | 'NO' | 'UNKNOWN' | null;
  medicaidPending: 'YES' | 'NO' | 'CASE_BY_CASE' | 'UNKNOWN' | null;
  doNotCall: boolean;
  contactRole: string | null;
  notes: string | null;
  transcriptUrl: string | null;
  recordingUrl: string | null;
  transcript: Turn[] | null;
  confidence: number | null;
  qaStatus: 'PENDING' | 'APPROVED' | 'CORRECTED' | 'REJECTED';
  qaAt: string | null;
  qaNote: string | null;
  home: {
    name: string;
    phone: string | null;
    doNotCall: boolean;
    availabilityCount: number | null;
    availabilityVerifiedAt: string | null;
    availabilitySource: string | null;
    medicaidWaiverStatus: string;
    medicaidWaiverSource: string | null;
    medicaidPendingAccepted: boolean | null;
    address: { city: string | null } | null;
  };
};
type Data = { rows: Row[]; counts: Record<string, number>; generatedAt: string };
type Edit = {
  outcome: Row['outcome'];
  bedsAL: string;
  bedsMC: string;
  priceFromMonthly: string;
  priceUndisclosed: boolean;
  waiverStatus: NonNullable<Row['waiverStatus']> | '';
  medicaidPending: NonNullable<Row['medicaidPending']> | '';
  contactRole: string;
};

const OUTCOMES: Row['outcome'][] = ['ANSWERED', 'DECLINED', 'NO_ANSWER', 'WANTS_HUMAN', 'WRONG_NUMBER'];
const fmtDate = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString() : '—');
const label = (v: string | null | undefined) => (v ? v.toLowerCase().replace(/_/g, ' ') : '—');
const OUTCOME_STYLE: Record<Row['outcome'], string> = {
  ANSWERED: 'bg-success-50 text-success-700',
  DECLINED: 'bg-amber-100 text-amber-800',
  NO_ANSWER: 'bg-neutral-200 text-neutral-700',
  WANTS_HUMAN: 'bg-primary-50 text-primary-700',
  WRONG_NUMBER: 'bg-error-50 text-error-700',
};
const toEdit = (r: Row): Edit => ({
  outcome: r.outcome,
  bedsAL: r.bedsAL == null ? '' : String(r.bedsAL),
  bedsMC: r.bedsMC == null ? '' : String(r.bedsMC),
  priceFromMonthly: r.priceFromMonthly == null ? '' : String(r.priceFromMonthly),
  priceUndisclosed: r.priceUndisclosed === true,
  waiverStatus: r.waiverStatus ?? '',
  medicaidPending: r.medicaidPending ?? '',
  contactRole: r.contactRole ?? '',
});
const num = (s: string) => (s.trim() === '' ? null : Number.parseInt(s, 10));

export default function CallQaPage() {
  const [data, setData] = useState<Data | null>(null);
  const [status, setStatus] = useState<'pending' | 'all'>('pending');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, Edit>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/call-qa?status=${status}`, { credentials: 'include', cache: 'no-store' });
      if (!r.ok) throw new Error(r.status === 403 ? 'Admin only.' : `Failed (${r.status})`);
      setData(await r.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [status]);
  useEffect(() => { void load(); }, [load]);
  // Alert emails link to /admin/call-qa#obs-{id}; rows render after the fetch.
  useEffect(() => {
    if (!data || !window.location.hash.startsWith('#obs-')) return;
    document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ block: 'center' });
  }, [data]);

  async function act(row: Row, action: 'approve' | 'correct' | 'reject' | 'do_not_call') {
    setBusy(row.id);
    setMsg((m) => ({ ...m, [row.id]: '' }));
    const e = editing[row.id];
    const corrections = action === 'correct' && e
      ? {
          outcome: e.outcome,
          bedsAL: num(e.bedsAL),
          bedsMC: num(e.bedsMC),
          priceFromMonthly: num(e.priceFromMonthly),
          priceUndisclosed: e.priceUndisclosed,
          waiverStatus: e.waiverStatus || null,
          medicaidPending: e.medicaidPending || null,
          contactRole: e.contactRole.trim() || null,
        }
      : undefined;
    try {
      const r = await fetch('/api/admin/call-qa', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, action, corrections, note: notes[row.id] || null }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `Failed (${r.status})`);
      const a = j.applied ?? {};
      const parts = [a.availability && 'availability verified', a.waiver && 'waiver updated', a.pending && 'Medicaid-pending updated', a.doNotCall && 'do-not-call set'].filter(Boolean);
      setMsg((m) => ({ ...m, [row.id]: `${action.replace('_', ' ')} ✓${parts.length ? ` — ${parts.join(', ')}` : ''}${j.skipped?.length ? ` (skipped: ${j.skipped.join(', ')})` : ''}` }));
      setEditing((ed) => { const { [row.id]: _drop, ...rest } = ed; return rest; });
      await load();
    } catch (err) {
      setMsg((m) => ({ ...m, [row.id]: err instanceof Error ? err.message : 'Failed' }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Call QA</h1>
          <p className="text-sm text-neutral-600 mt-1">
            AI availability calls waiting for a human check. Read the transcript, listen if needed, then Approve, Correct, Reject or Mark do-not-call.
            Only Approve / Correct writes to the listing (verified on the call date, source AI call). Business facts only — never resident information.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={status} onChange={(e) => setStatus(e.target.value as 'pending' | 'all')} className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm" data-testid="call-qa-status">
            <option value="pending">Pending</option>
            <option value="all">All</option>
          </select>
          <button onClick={() => void load()} className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {data && (
        <div className="flex flex-wrap gap-3 text-xs text-neutral-600" data-testid="call-qa-counts">
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
        <div className="bg-white rounded-2xl shadow p-10 text-center text-neutral-500" data-testid="call-qa-empty">Nothing to review.</div>
      ) : (
        <ul className="space-y-4">
          {data.rows.map((r) => {
            const e = editing[r.id];
            const pending = r.qaStatus === 'PENDING';
            return (
              <li key={r.id} id={`obs-${r.id}`} className="bg-white rounded-2xl shadow p-4 md:p-5" data-testid="call-qa-row" data-observation-id={r.id} data-qa-status={r.qaStatus} data-outcome={r.outcome}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-neutral-900">{r.home.name} <span className="text-neutral-500 font-normal">· {r.home.address?.city ?? ''}</span></div>
                    <div className="text-xs text-neutral-500 mt-0.5">
                      Called {fmtDate(r.calledAt)}{r.durationSecs != null ? ` · ${r.durationSecs}s` : ''} · {r.home.phone ?? 'no phone'} · conversation <code>{r.conversationId}</code>
                      {r.confidence != null ? ` · confidence ${Math.round(r.confidence * 100)}%` : ''}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${OUTCOME_STYLE[r.outcome]}`}>{label(r.outcome)}</span>
                      {r.doNotCall && <span className="rounded-full bg-error-50 px-2 py-0.5 text-xs font-semibold text-error-700">do not call</span>}
                      {r.home.doNotCall && <span className="rounded-full bg-error-50 px-2 py-0.5 text-xs font-semibold text-error-700">home flagged do-not-call</span>}
                      {!pending && <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-semibold text-neutral-700">{label(r.qaStatus)} {fmtDate(r.qaAt)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {r.transcriptUrl && (
                      <a href={r.transcriptUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary-700 hover:underline"><ExternalLink className="h-4 w-4" /> Transcript</a>
                    )}
                    {r.recordingUrl && (
                      <a href={r.recordingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary-700 hover:underline" data-testid="call-qa-recording"><Headphones className="h-4 w-4" /> Recording</a>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Parsed</div>
                    {e ? (
                      <div className="mt-2 grid grid-cols-2 gap-2 text-sm" data-testid="call-qa-edit">
                        <label className="text-xs text-neutral-600">Outcome
                          <select value={e.outcome} onChange={(ev) => setEditing({ ...editing, [r.id]: { ...e, outcome: ev.target.value as Row['outcome'] } })} className="mt-1 w-full rounded border border-neutral-300 px-2 py-1">
                            {OUTCOMES.map((o) => <option key={o} value={o}>{label(o)}</option>)}
                          </select>
                        </label>
                        <label className="text-xs text-neutral-600">Who answered
                          <input value={e.contactRole} onChange={(ev) => setEditing({ ...editing, [r.id]: { ...e, contactRole: ev.target.value } })} className="mt-1 w-full rounded border border-neutral-300 px-2 py-1" />
                        </label>
                        <label className="text-xs text-neutral-600">Open AL
                          <input type="number" min={0} value={e.bedsAL} onChange={(ev) => setEditing({ ...editing, [r.id]: { ...e, bedsAL: ev.target.value } })} className="mt-1 w-full rounded border border-neutral-300 px-2 py-1" />
                        </label>
                        <label className="text-xs text-neutral-600">Open MC
                          <input type="number" min={0} value={e.bedsMC} onChange={(ev) => setEditing({ ...editing, [r.id]: { ...e, bedsMC: ev.target.value } })} className="mt-1 w-full rounded border border-neutral-300 px-2 py-1" />
                        </label>
                        <label className="text-xs text-neutral-600">AL from $/mo
                          <input type="number" min={0} value={e.priceFromMonthly} onChange={(ev) => setEditing({ ...editing, [r.id]: { ...e, priceFromMonthly: ev.target.value } })} className="mt-1 w-full rounded border border-neutral-300 px-2 py-1" />
                        </label>
                        <label className="flex items-center gap-2 text-xs text-neutral-600 mt-5">
                          <input type="checkbox" checked={e.priceUndisclosed} onChange={(ev) => setEditing({ ...editing, [r.id]: { ...e, priceUndisclosed: ev.target.checked } })} /> Price undisclosed
                        </label>
                        <label className="text-xs text-neutral-600">Waiver
                          <select value={e.waiverStatus} onChange={(ev) => setEditing({ ...editing, [r.id]: { ...e, waiverStatus: ev.target.value as Edit['waiverStatus'] } })} className="mt-1 w-full rounded border border-neutral-300 px-2 py-1">
                            <option value="">—</option>
                            <option value="ACCEPTING_NEW">accepting new</option>
                            <option value="CURRENT_ONLY">current residents only</option>
                            <option value="NO">no</option>
                            <option value="UNKNOWN">unknown</option>
                          </select>
                        </label>
                        <label className="text-xs text-neutral-600">Medicaid pending
                          <select value={e.medicaidPending} onChange={(ev) => setEditing({ ...editing, [r.id]: { ...e, medicaidPending: ev.target.value as Edit['medicaidPending'] } })} className="mt-1 w-full rounded border border-neutral-300 px-2 py-1">
                            <option value="">—</option>
                            <option value="YES">yes</option>
                            <option value="NO">no</option>
                            <option value="CASE_BY_CASE">case by case</option>
                            <option value="UNKNOWN">unknown</option>
                          </select>
                        </label>
                      </div>
                    ) : (
                      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm" data-testid="call-qa-fields">
                        <dt className="text-neutral-500">Open AL / MC</dt><dd className="text-neutral-900">{r.bedsAL ?? '—'} / {r.bedsMC ?? '—'}</dd>
                        <dt className="text-neutral-500">AL from</dt><dd className="text-neutral-900">{r.priceUndisclosed ? 'undisclosed' : r.priceFromMonthly != null ? `$${r.priceFromMonthly.toLocaleString()}/mo` : '—'}</dd>
                        <dt className="text-neutral-500">Waiver</dt><dd className="text-neutral-900">{label(r.waiverStatus)}</dd>
                        <dt className="text-neutral-500">Medicaid pending</dt><dd className="text-neutral-900">{label(r.medicaidPending)}</dd>
                        <dt className="text-neutral-500">Who answered</dt><dd className="text-neutral-900">{r.contactRole ?? '—'}</dd>
                        {r.notes && (<><dt className="text-neutral-500">Summary</dt><dd className="text-neutral-800">{r.notes}</dd></>)}
                      </dl>
                    )}
                    <div className="mt-3 text-xs text-neutral-500">
                      Listing now: {r.home.availabilityVerifiedAt ? `${r.home.availabilityCount ?? '?'} open, verified ${new Date(r.home.availabilityVerifiedAt).toLocaleDateString()} (${r.home.availabilitySource ?? ''})` : 'not verified'} · waiver {label(r.home.medicaidWaiverStatus)}{r.home.medicaidWaiverSource ? ` (${r.home.medicaidWaiverSource})` : ''}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Transcript</div>
                    {r.transcript && r.transcript.length > 0 ? (
                      <ol className="mt-2 max-h-64 overflow-y-auto space-y-1.5 rounded-lg border border-neutral-100 bg-neutral-50 p-3 text-sm" data-testid="call-qa-transcript">
                        {r.transcript.map((t, i) => (
                          <li key={i} className={t.role === 'user' ? 'text-neutral-900' : 'text-neutral-600'}>
                            <span className="mr-1 text-[11px] font-semibold uppercase text-neutral-400">{t.role === 'user' ? 'facility' : 'agent'}</span>{t.message}
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="mt-2 text-sm text-neutral-500">No transcript in the payload — use the transcript link.</p>
                    )}
                  </div>
                </div>

                {pending && (
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-4">
                    <input placeholder="Note (optional)" value={notes[r.id] ?? ''} onChange={(ev) => setNotes({ ...notes, [r.id]: ev.target.value })} className="min-w-[200px] flex-1 rounded border border-neutral-300 px-2 py-1.5 text-sm" />
                    {e ? (
                      <>
                        <button disabled={busy === r.id} onClick={() => void act(r, 'correct')} className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60" data-testid="call-qa-save-correct"><Check className="h-4 w-4" /> Save &amp; approve</button>
                        <button disabled={busy === r.id} onClick={() => setEditing((ed) => { const { [r.id]: _drop, ...rest } = ed; return rest; })} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700">Cancel</button>
                      </>
                    ) : (
                      <>
                        <button disabled={busy === r.id} onClick={() => void act(r, 'approve')} className="inline-flex items-center gap-1 rounded-lg bg-success-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-success-700 disabled:opacity-60" data-testid="call-qa-approve"><Check className="h-4 w-4" /> Approve</button>
                        <button disabled={busy === r.id} onClick={() => setEditing({ ...editing, [r.id]: toEdit(r) })} className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50" data-testid="call-qa-correct"><Edit3 className="h-4 w-4" /> Correct</button>
                        <button disabled={busy === r.id} onClick={() => void act(r, 'reject')} className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50" data-testid="call-qa-reject"><X className="h-4 w-4" /> Reject</button>
                        <button disabled={busy === r.id} onClick={() => { if (window.confirm(`Mark ${r.home.name} as do-not-call? The agent, the weekly ping and the VA list will all skip it.`)) void act(r, 'do_not_call'); }} className="inline-flex items-center gap-1 rounded-lg border border-error-200 px-3 py-1.5 text-sm font-medium text-error-700 hover:bg-error-50" data-testid="call-qa-dnc"><PhoneOff className="h-4 w-4" /> Mark do-not-call</button>
                      </>
                    )}
                  </div>
                )}
                {msg[r.id] && <div className="mt-2 text-xs text-neutral-700" data-testid="call-qa-msg">{msg[r.id]}</div>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
