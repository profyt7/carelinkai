'use client';

/**
 * Admin "Acceptance (from calls)" form (sprint W5-2, G3 + G4).
 * Records what a home told us on a call: Medicaid waiver status override,
 * accepts-while-Medicaid-pending, acuity ceiling, admissions CRM. Source is
 * VA_CALL or ADMIN; verifiedAt is set server-side to now; every change lands in
 * History via recordEvent. Business facts only — no PHI.
 */

import { useEffect, useState } from 'react';
import {
  ACUITY_KEYS,
  ACUITY_LABEL,
  ADMISSIONS_CRM_OPTIONS,
  MEDICAID_WAIVER_STATUSES,
  WAIVER_ADMIN_LABEL,
  type AcuityCeiling,
  type AcuityKey,
} from '@/lib/medicaid/waiver';

type Loaded = {
  home: { id: string; name: string };
  acceptance: {
    medicaidWaiverStatus: string;
    medicaidWaiverSource: string | null;
    medicaidWaiverVerifiedAt: string | null;
    medicaidPendingAccepted: boolean | null;
    medicaidPendingAcceptedSource: string | null;
    medicaidPendingAcceptedVerifiedAt: string | null;
    acuityCeiling: AcuityCeiling;
    acuityCeilingSource: string | null;
    acuityCeilingVerifiedAt: string | null;
    admissionsCrm: string | null;
    admissionsCrmSource: string | null;
    admissionsCrmVerifiedAt: string | null;
  };
  view: { line: string | null; pendingLine: string | null };
};

type Tri = 'yes' | 'no' | 'unknown';
const toTri = (v: boolean | null | undefined): Tri => (v === true ? 'yes' : v === false ? 'no' : 'unknown');
const fromTri = (t: Tri): boolean | null => (t === 'yes' ? true : t === 'no' ? false : null);

function provenance(source: string | null, at: string | null): string {
  if (!source) return 'not set';
  const d = at ? new Date(at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
  return `${source}${d ? ` · ${d}` : ''}`;
}

export default function AcceptancePanel({ homeId }: { homeId: string }) {
  const [data, setData] = useState<Loaded | null>(null);
  const [source, setSource] = useState<'VA_CALL' | 'ADMIN'>('VA_CALL');
  const [waiver, setWaiver] = useState<string>('');
  const [pending, setPending] = useState<Tri>('unknown');
  const [acuity, setAcuity] = useState<Record<AcuityKey, Tri>>(() => Object.fromEntries(ACUITY_KEYS.map((k) => [k, 'unknown'])) as Record<AcuityKey, Tri>);
  const [crm, setCrm] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function load() {
    const res = await fetch(`/api/admin/homes/${homeId}/acceptance`, { cache: 'no-store' });
    if (!res.ok) {
      setErr('Could not load acceptance facts.');
      return;
    }
    const d: Loaded = await res.json();
    setData(d);
    setWaiver(d.acceptance.medicaidWaiverStatus);
    setPending(toTri(d.acceptance.medicaidPendingAccepted));
    setAcuity(Object.fromEntries(ACUITY_KEYS.map((k) => [k, toTri(d.acceptance.acuityCeiling[k])])) as Record<AcuityKey, Tri>);
    setCrm(d.acceptance.admissionsCrm ?? '');
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeId]);

  async function save() {
    if (!data) return;
    setBusy(true);
    setMsg('');
    setErr('');
    const a = data.acceptance;
    const payload: Record<string, unknown> = { source };
    if (waiver && waiver !== a.medicaidWaiverStatus) payload['medicaidWaiverStatus'] = waiver;
    if (fromTri(pending) !== a.medicaidPendingAccepted) payload['medicaidPendingAccepted'] = fromTri(pending);
    const nextAcuity = Object.fromEntries(ACUITY_KEYS.map((k) => [k, fromTri(acuity[k])])) as AcuityCeiling;
    if (JSON.stringify(nextAcuity) !== JSON.stringify(a.acuityCeiling)) payload['acuityCeiling'] = nextAcuity;
    if ((crm || null) !== a.admissionsCrm) payload['admissionsCrm'] = crm || null;
    try {
      const res = await fetch(`/api/admin/homes/${homeId}/acceptance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) {
        setErr(j.error || 'Save failed.');
      } else {
        setMsg(j.changed ? `Saved ${j.changed} change${j.changed === 1 ? '' : 's'} (source ${source}).` : 'Nothing changed.');
        await load();
      }
    } catch {
      setErr('Network error.');
    } finally {
      setBusy(false);
    }
  }

  if (err && !data) return <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm text-error-700">{err}</div>;
  if (!data) return <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-500">Loading acceptance facts…</div>;

  const a = data.acceptance;
  const sel = 'rounded-md border border-neutral-300 px-2 py-1.5 text-sm';
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 space-y-5" data-testid="acceptance-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-neutral-900">Acceptance (from calls)</h3>
        <label className="flex items-center gap-2 text-xs text-neutral-600">
          Source
          <select value={source} onChange={(e) => setSource(e.target.value as 'VA_CALL' | 'ADMIN')} className={sel} data-testid="acceptance-source">
            <option value="VA_CALL">VA call</option>
            <option value="ADMIN">Admin</option>
          </select>
        </label>
      </div>
      <p className="-mt-3 text-xs text-neutral-500">
        What the home told us. Each field keeps who said it and when; every change is recorded in History.
        {data.view.line ? ` Listing shows: “${data.view.line}”.` : ' Listing shows no waiver line (not on list / unknown).'}
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-neutral-600">Medicaid waiver status (override)</label>
          <select value={waiver} onChange={(e) => setWaiver(e.target.value)} className={`${sel} mt-1 w-full`} data-testid="acceptance-waiver-status">
            {MEDICAID_WAIVER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {WAIVER_ADMIN_LABEL[s]}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-neutral-500">{provenance(a.medicaidWaiverSource, a.medicaidWaiverVerifiedAt)}</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-600">Accepts residents while Medicaid is pending</label>
          <select value={pending} onChange={(e) => setPending(e.target.value as Tri)} className={`${sel} mt-1 w-full`} data-testid="acceptance-pending">
            <option value="unknown">Unknown</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
          <p className="mt-1 text-xs text-neutral-500">{provenance(a.medicaidPendingAcceptedSource, a.medicaidPendingAcceptedVerifiedAt)}</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-600">Admissions CRM</label>
          <select value={crm} onChange={(e) => setCrm(e.target.value)} className={`${sel} mt-1 w-full`} data-testid="acceptance-crm">
            <option value="">Unknown</option>
            {ADMISSIONS_CRM_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-neutral-500">{provenance(a.admissionsCrmSource, a.admissionsCrmVerifiedAt)}</p>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-neutral-600">Acuity ceiling — will the home take…</label>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {ACUITY_KEYS.map((k) => (
            <label key={k} className="flex items-center justify-between gap-2 rounded-md border border-neutral-200 px-2 py-1.5 text-xs text-neutral-700">
              {ACUITY_LABEL[k]}
              <select value={acuity[k]} onChange={(e) => setAcuity({ ...acuity, [k]: e.target.value as Tri })} className="rounded border border-neutral-300 px-1 py-0.5 text-xs" data-testid={`acceptance-acuity-${k}`}>
                <option value="unknown">?</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-neutral-500">{provenance(a.acuityCeilingSource, a.acuityCeilingVerifiedAt)}</p>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" disabled={busy} onClick={save} className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50" data-testid="acceptance-save">
          {busy ? 'Saving…' : 'Save acceptance facts'}
        </button>
        {msg && <p className="text-xs text-success-700" data-testid="acceptance-msg">{msg}</p>}
        {err && <p className="text-xs text-error-700">{err}</p>}
      </div>
    </div>
  );
}
