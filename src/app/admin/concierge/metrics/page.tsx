'use client';

/**
 * /admin/concierge/metrics — concierge funnel, per DP and overall (sprint 4.4
 * / W4-3). A table, no charts yet. Admin only (the API 403s everyone else).
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, RefreshCw } from 'lucide-react';

type Block = {
  key: string;
  label: string;
  organization: string | null;
  requests: number;
  shortlisted: number;
  timeToShortlistMedianHours: number | null;
  timeToFirstFacilityResponseMedianHours: number | null;
  timeToPlacementMedianHours: number | null;
  facilityResponses: number;
  accepted: number;
  declined: number;
  admitted: number;
  acceptRate: number | null;
  placedRequests: number;
  topDeclineReasons: Array<{ reason: string; label: string; count: number }>;
  payerLaneMix: { FEE_ELIGIBLE: number; FREE_LANE: number; UNKNOWN: number };
  payerSourceMix: Array<{ payerSource: string; label: string; count: number }>;
};
type Metrics = { generatedAt: string; overall: Block; perDp: Block[]; plannerLeads?: { days: Array<{ date: string; count: number }>; total: number } };

const hours = (h: number | null) => (h === null ? '—' : h < 48 ? `${h} h` : `${Math.round((h / 24) * 10) / 10} d`);
const pct = (r: number | null) => (r === null ? '—' : `${Math.round(r * 100)}%`);

function Row({ b, emphasize = false }: { b: Block; emphasize?: boolean }) {
  return (
    <tr className={emphasize ? 'bg-primary-50/40 font-semibold' : ''} data-testid="metrics-row" data-key={b.key}>
      <td className="px-3 py-2 whitespace-nowrap">
        <div className="text-neutral-900">{b.label}</div>
        {b.organization && <div className="text-xs font-normal text-neutral-500">{b.organization}</div>}
      </td>
      <td className="px-3 py-2 text-right tabular-nums" data-testid="m-requests">{b.requests}</td>
      <td className="px-3 py-2 text-right tabular-nums">{b.shortlisted}</td>
      <td className="px-3 py-2 text-right tabular-nums">{hours(b.timeToShortlistMedianHours)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{hours(b.timeToFirstFacilityResponseMedianHours)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{hours(b.timeToPlacementMedianHours)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{b.accepted} / {b.declined}</td>
      <td className="px-3 py-2 text-right tabular-nums" data-testid="m-accept-rate">{pct(b.acceptRate)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{b.admitted}</td>
      <td className="px-3 py-2 text-xs text-neutral-700">{b.topDeclineReasons.length ? b.topDeclineReasons.map((r) => `${r.label} (${r.count})`).join(' · ') : '—'}</td>
      <td className="px-3 py-2 text-xs text-neutral-700 whitespace-nowrap">
        private {b.payerLaneMix.FEE_ELIGIBLE} · free {b.payerLaneMix.FREE_LANE} · unknown {b.payerLaneMix.UNKNOWN}
      </td>
    </tr>
  );
}

export default function ConciergeMetricsPage() {
  const [data, setData] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/admin/concierge/metrics', { credentials: 'include', cache: 'no-store' });
      if (!r.ok) throw new Error(r.status === 403 ? 'Admin only.' : `Failed (${r.status})`);
      setData(await r.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, []);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/concierge" className="inline-flex items-center gap-1 text-primary-600 text-sm font-medium"><ArrowLeft className="h-4 w-4" /> Concierge queue</Link>
          <h1 className="text-2xl font-bold text-neutral-900 mt-1">Concierge metrics</h1>
          <p className="text-sm text-neutral-600 mt-1">
            Per discharge planner and overall. Medians: time-to-shortlist (request → shortlist sent), time-to-first-facility-response (shortlist sent → first accept/decline), time-to-placement (request → admitted). Demo data excluded.
          </p>
        </div>
        <button onClick={() => void load()} className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="p-8 flex items-center justify-center text-neutral-500"><Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…</div>
      ) : error ? (
        <div className="bg-error-50 border border-error-200 rounded-xl p-4 text-error-700 text-sm">{error}</div>
      ) : data ? (
        <>
        {data.plannerLeads && (
          <div className="bg-white rounded-2xl shadow p-4" data-testid="planner-leads-daily">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold text-neutral-900">Planner calls to the published number — last 14 days</h2>
              <Link href="/admin/inbound-leads" className="text-sm font-medium text-primary-600">Inbound leads →</Link>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">Discharge-planner callers (PLANNER lane), one bucket per calendar day, America/New_York. Total <strong className="text-neutral-900" data-testid="planner-leads-total">{data.plannerLeads.total}</strong>.</p>
            <div className="mt-3 flex gap-1 overflow-x-auto">
              {data.plannerLeads.days.map((d) => (
                <div key={d.date} className="min-w-[44px] text-center" data-testid="planner-leads-day" data-date={d.date} data-count={d.count}>
                  <div className={`rounded px-1 py-1 text-sm tabular-nums ${d.count > 0 ? 'bg-primary-50 text-primary-800 font-semibold' : 'bg-neutral-50 text-neutral-400'}`}>{d.count}</div>
                  <div className="mt-0.5 text-[10px] text-neutral-500">{d.date.slice(5)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="overflow-x-auto bg-white rounded-2xl shadow">
          <table className="min-w-full text-sm" data-testid="metrics-table">
            <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-3 py-3">Discharge planner</th>
                <th className="px-3 py-3 text-right">Requests</th>
                <th className="px-3 py-3 text-right">Shortlisted</th>
                <th className="px-3 py-3 text-right">→ Shortlist (median)</th>
                <th className="px-3 py-3 text-right">→ First facility reply</th>
                <th className="px-3 py-3 text-right">→ Placement</th>
                <th className="px-3 py-3 text-right">Accepted / declined</th>
                <th className="px-3 py-3 text-right">Accept rate</th>
                <th className="px-3 py-3 text-right">Admitted</th>
                <th className="px-3 py-3">Top decline reasons</th>
                <th className="px-3 py-3">Payer lane mix</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              <Row b={data.overall} emphasize />
              {data.perDp.map((b) => <Row key={b.key} b={b} />)}
            </tbody>
          </table>
          <p className="px-3 py-2 text-xs text-neutral-400">Generated {new Date(data.generatedAt).toLocaleString()}</p>
        </div>
        </>
      ) : null}
    </div>
  );
}
