'use client';

import { useEffect, useState } from 'react';

/**
 * Admin pricing panel (OL-111) — log source-tagged pricing (operator / DP-estimate /
 * public benchmark), verify pending family quote reports (which feed FAMILY_AVG), and
 * copy the post-tour quote-survey link. Calls /api/admin/homes/[id]/pricing. No PHI.
 */
type Report = {
  id: string; careLevel: string; quotedMonthlyBase: number; careAddOn: number | null;
  communityFee: number | null; moveInMonth: string | null; verified: boolean; createdAt: string;
};
type Loaded = {
  home: { id: string; name: string };
  view: { display: string; transparent: boolean; source: string | null };
  familyAvg: { avg: number | null; count: number };
  pending: number;
  reports: Report[];
  surveyLink: string | null;
};

export default function PricingPanel({ homeId }: { homeId: string }) {
  const [data, setData] = useState<Loaded | null>(null);
  const [source, setSource] = useState<'OPERATOR' | 'DP_ESTIMATE' | 'PUBLIC'>('DP_ESTIMATE');
  const [starting, setStarting] = useState('');
  const [low, setLow] = useState('');
  const [high, setHigh] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function load() {
    const res = await fetch(`/api/admin/homes/${homeId}/pricing`);
    if (res.ok) setData(await res.json());
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeId]);

  async function post(payload: Record<string, unknown>, okMsg: string) {
    setBusy(true); setMsg('');
    try {
      const res = await fetch(`/api/admin/homes/${homeId}/pricing`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (res.ok && d.ok) { setMsg(okMsg); await load(); }
      else setMsg(d.error || 'Something went wrong.');
    } catch { setMsg('Network error.'); } finally { setBusy(false); }
  }

  if (!data) return <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-500">Loading pricing…</div>;

  const field = 'w-24 rounded-md border border-neutral-300 px-2 py-1.5 text-sm';
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-900">Pricing</h3>
        {data.view.transparent && (
          <span className="rounded-full bg-success-50 px-2.5 py-1 text-xs font-medium text-success-700 ring-1 ring-inset ring-success-200">Transparent Pricing</span>
        )}
      </div>
      <p className="text-xs text-neutral-500 -mt-3">
        {data.view.display}
        {data.familyAvg.count > 0 && ` · ${data.familyAvg.count} family report${data.familyAvg.count === 1 ? '' : 's'}${data.pending ? ` (${data.pending} pending)` : ''}`}
      </p>

      {/* Set source-tagged pricing */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-neutral-600">Log a price</label>
        <div className="flex flex-wrap items-center gap-2">
          <select value={source} onChange={(e) => setSource(e.target.value as 'OPERATOR' | 'DP_ESTIMATE' | 'PUBLIC')} className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
            <option value="DP_ESTIMATE">DP estimate</option>
            <option value="PUBLIC">Public benchmark</option>
            <option value="OPERATOR">Operator-provided</option>
          </select>
          <input inputMode="numeric" value={starting} onChange={(e) => setStarting(e.target.value)} placeholder="starting $" className={field} aria-label="Starting price" />
          <span className="text-xs text-neutral-400">or range</span>
          <input inputMode="numeric" value={low} onChange={(e) => setLow(e.target.value)} placeholder="low $" className={field} aria-label="Range low" />
          <input inputMode="numeric" value={high} onChange={(e) => setHigh(e.target.value)} placeholder="high $" className={field} aria-label="Range high" />
          <button
            type="button" disabled={busy}
            onClick={() => post({ source, startingPriceMonthly: starting || null, priceRangeLow: low || null, priceRangeHigh: high || null }, 'Pricing saved.')}
            className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >Save</button>
        </div>
      </div>

      {/* Pending family reports to verify */}
      {data.reports.length > 0 && (
        <div className="space-y-2 border-t border-neutral-100 pt-4">
          <label className="block text-xs font-medium text-neutral-600">Family quote reports</label>
          <ul className="space-y-1">
            {data.reports.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-neutral-700">
                  {r.careLevel} · ${r.quotedMonthlyBase.toLocaleString()}
                  {r.careAddOn ? ` +$${r.careAddOn.toLocaleString()} care` : ''}
                  {r.communityFee ? ` · $${r.communityFee.toLocaleString()} fee` : ''}
                  {r.moveInMonth ? ` · ${r.moveInMonth}` : ''}
                </span>
                {r.verified ? (
                  <span className="text-xs text-success-700">✓ verified</span>
                ) : (
                  <button type="button" disabled={busy} onClick={() => post({ action: 'verify', reportId: r.id }, 'Report verified.')}
                    className="rounded-md border border-neutral-300 px-2 py-0.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50">Verify</button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Survey link */}
      {data.surveyLink && (
        <div className="space-y-1 border-t border-neutral-100 pt-4">
          <label className="block text-xs font-medium text-neutral-600">Post-tour quote-survey link</label>
          <div className="flex items-center gap-2">
            <input readOnly value={data.surveyLink} className="flex-1 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-xs text-neutral-600" />
            <button type="button" onClick={() => navigator.clipboard?.writeText(data.surveyLink as string).then(() => setMsg('Link copied.'))}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50">Copy</button>
          </div>
        </div>
      )}

      {msg && <p className="text-xs text-success-700">{msg}</p>}
    </div>
  );
}
