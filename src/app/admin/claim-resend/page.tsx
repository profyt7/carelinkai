'use client';

/**
 * /admin/claim-resend — operators who got a claim-nudge email and never
 * registered (the /claim link was behind the login wall until #727), each
 * with a freshly minted /claim?token= link. LIST ONLY: nothing here sends.
 * Warm leads first. Download as CSV for a hand-sent batch.
 */

import { useEffect, useState } from 'react';
import { Loader2, Download, RefreshCw } from 'lucide-react';

type Row = {
  homeId: string;
  facility: string;
  city: string | null;
  contactEmail: string;
  sentAt: string;
  clicked: boolean;
  clickedAt: string | null;
  warm: boolean;
  cohort: string | null;
  claimLink: string;
  expiresAt: string;
};
type List = { rows: Row[]; counts: Record<string, number>; generatedAt: string };

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString() : '—');

export default function ClaimResendPage() {
  const [list, setList] = useState<List | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/admin/claim-resend', { credentials: 'include', cache: 'no-store' });
      if (!r.ok) throw new Error(r.status === 403 ? 'Admin only.' : `Failed (${r.status})`);
      setList(await r.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Claim re-send list</h1>
          <p className="text-sm text-neutral-600 mt-1">
            Nudged, still unclaimed, never registered. Fresh 45-day links. <strong>Nothing is sent from here</strong> —
            download the CSV for a hand-sent batch. Warm leads first.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void load()} className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <a
            href="/api/admin/claim-resend?format=csv"
            className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700"
            data-testid="claim-resend-csv"
          >
            <Download className="h-4 w-4" /> Download CSV
          </a>
        </div>
      </div>

      {list && (
        <div className="flex flex-wrap gap-3 text-xs text-neutral-600" data-testid="claim-resend-counts">
          {Object.entries(list.counts).map(([k, v]) => (
            <span key={k} className="rounded-full bg-neutral-100 px-2.5 py-1">
              {k}: <strong className="text-neutral-900">{v}</strong>
            </span>
          ))}
          <span className="rounded-full bg-neutral-100 px-2.5 py-1">generated {new Date(list.generatedAt).toLocaleString()}</span>
        </div>
      )}

      {loading ? (
        <div className="p-8 flex items-center justify-center text-neutral-500"><Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…</div>
      ) : error ? (
        <div className="bg-error-50 border border-error-200 rounded-xl p-4 text-error-700 text-sm">{error}</div>
      ) : !list || list.rows.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-10 text-center text-neutral-500">No one to re-send to.</div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-2xl shadow">
          <table className="min-w-full text-sm" data-testid="claim-resend-table">
            <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3">Facility</th>
                <th className="px-4 py-3">Contact email</th>
                <th className="px-4 py-3">Nudge sent</th>
                <th className="px-4 py-3">Clicked</th>
                <th className="px-4 py-3">Fresh claim link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {list.rows.map((r) => (
                <tr key={r.homeId} data-testid="claim-resend-row" data-warm={r.warm ? 'true' : 'false'}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-neutral-900">
                      {r.facility}
                      {r.warm && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold uppercase text-amber-800">warm</span>}
                      {r.cohort && <span className="ml-2 rounded bg-primary-50 px-1.5 py-0.5 text-[11px] font-semibold text-primary-700">{r.cohort}</span>}
                    </div>
                    <div className="text-xs text-neutral-500">{r.city ?? ''}</div>
                  </td>
                  <td className="px-4 py-3 text-neutral-800">{r.contactEmail}</td>
                  <td className="px-4 py-3 text-neutral-700">{fmt(r.sentAt)}</td>
                  <td className="px-4 py-3">{r.clicked ? <span className="text-success-700 font-medium">yes · {fmt(r.clickedAt)}</span> : <span className="text-neutral-500">no</span>}</td>
                  <td className="px-4 py-3">
                    <input readOnly value={r.claimLink} onFocus={(e) => e.currentTarget.select()} className="w-72 rounded border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs text-neutral-700" />
                    <div className="text-[11px] text-neutral-400">expires {fmt(r.expiresAt)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
