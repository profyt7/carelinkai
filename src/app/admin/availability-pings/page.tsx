'use client';

/**
 * /admin/availability-pings — weekly one-tap availability ping (sprint W4-1):
 * per facility, the contact + consent, the last ping (sent / replied / expired /
 * stop / admin review), the live availability, and the VA / AI-voice call list.
 * Admin can add a contact whose opt-in was captured on a call and resolve
 * replies we could not parse. Nothing here sends a ping.
 */

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Download, RefreshCw, PhoneCall } from 'lucide-react';

type Row = {
  homeId: string;
  facility: string;
  city: string | null;
  claimed: boolean;
  contact: { id: string; name: string; email: string | null; mobile: string | null; preferredChannel: 'EMAIL' | 'SMS'; optedIn: boolean; optedInAt: string | null; optedInSource: string | null; optedOutAt: string | null };
  availability: { fresh: boolean; count: number | null; verifiedAt: string | null; source: string | null; label: string };
  lastPing: { id: string; channel: string; sentAt: string; expiresAt: string; delivery: string | null; repliedAt: string | null; replyRaw: string | null; parsedCount: number | null; outcome: string | null; state: 'sent' | 'replied' | 'expired' | 'stop' | 'admin_review' } | null;
  onCallList: boolean;
};
type Data = { rows: Row[]; counts: Record<string, number>; generatedAt: string };

const fmt = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString() : '—');
const STATE_STYLE: Record<string, string> = {
  sent: 'bg-primary-50 text-primary-700',
  replied: 'bg-success-50 text-success-700',
  expired: 'bg-amber-100 text-amber-800',
  stop: 'bg-neutral-200 text-neutral-700',
  admin_review: 'bg-error-50 text-error-700',
};

export default function AvailabilityPingsAdminPage() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ homeId: '', name: '', email: '', mobile: '', preferredChannel: 'EMAIL', optedIn: true });
  const [formMsg, setFormMsg] = useState<string | null>(null);
  const [resolving, setResolving] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/admin/availability-pings', { credentials: 'include', cache: 'no-store' });
      if (!r.ok) throw new Error(r.status === 403 ? 'Admin only.' : `Failed (${r.status})`);
      setData(await r.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function saveContact(e: React.FormEvent) {
    e.preventDefault();
    setFormMsg(null);
    const r = await fetch('/api/admin/availability-pings', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, source: 'admin_call' }),
    });
    const j = await r.json().catch(() => ({}));
    setFormMsg(r.ok ? 'Saved (opt-in source: admin_call).' : j.error || 'Failed');
    if (r.ok) { setForm({ homeId: '', name: '', email: '', mobile: '', preferredChannel: 'EMAIL', optedIn: true }); void load(); }
  }

  async function resolve(pingId: string) {
    const count = resolving[pingId];
    if (count === undefined || count === '') return;
    const r = await fetch('/api/admin/availability-pings', {
      method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pingId, count: Number(count) }),
    });
    if (r.ok) void load();
  }

  const review = data?.rows.filter((r) => r.lastPing?.state === 'admin_review') ?? [];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Availability pings</h1>
          <p className="text-sm text-neutral-600 mt-1">
            Weekly one-tap “open beds?” ping to opted-in contacts of claimed listings (email; SMS stubbed). Sent / replied / expired per facility.
            Nothing here sends a ping — the cron does, only when <code>PING_ENABLED</code> is set.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void load()} className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <a href="/api/admin/availability-pings?format=call-list" className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700" data-testid="ping-call-list-csv">
            <Download className="h-4 w-4" /> Call list CSV
          </a>
        </div>
      </div>

      {data && (
        <div className="flex flex-wrap gap-3 text-xs text-neutral-600" data-testid="ping-counts">
          {Object.entries(data.counts).map(([k, v]) => (
            <span key={k} className="rounded-full bg-neutral-100 px-2.5 py-1" data-count-key={k}>
              {k}: <strong className="text-neutral-900">{v}</strong>
            </span>
          ))}
        </div>
      )}

      {review.length > 0 && (
        <section className="bg-white rounded-2xl shadow p-4" data-testid="ping-review-queue">
          <h2 className="font-semibold text-neutral-900">Needs a human ({review.length})</h2>
          <p className="text-xs text-neutral-500 mt-1">Replies we could not read as a number. Confirm by phone, then enter the count.</p>
          <ul className="mt-3 divide-y divide-neutral-100">
            {review.map((r) => (
              <li key={r.homeId} className="py-3 flex flex-wrap items-center gap-3" data-testid="ping-review-row">
                <div className="flex-1 min-w-[200px]">
                  <div className="font-medium text-neutral-900">{r.facility}</div>
                  <div className="text-xs text-neutral-500">{r.contact.name} · {r.contact.email ?? r.contact.mobile}</div>
                  <div className="mt-1 text-sm text-neutral-800 italic" data-testid="ping-review-raw">“{r.lastPing?.replyRaw}”</div>
                </div>
                <input type="number" min={0} max={999} placeholder="count" value={resolving[r.lastPing!.id] ?? ''} onChange={(e) => setResolving({ ...resolving, [r.lastPing!.id]: e.target.value })} className="w-24 rounded border border-neutral-300 px-2 py-1 text-sm" />
                <button onClick={() => void resolve(r.lastPing!.id)} className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white">Resolve</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {loading ? (
        <div className="p-8 flex items-center justify-center text-neutral-500"><Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…</div>
      ) : error ? (
        <div className="bg-error-50 border border-error-200 rounded-xl p-4 text-error-700 text-sm">{error}</div>
      ) : !data || data.rows.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-10 text-center text-neutral-500">No availability contacts yet.</div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-2xl shadow">
          <table className="min-w-full text-sm" data-testid="ping-table">
            <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3">Facility</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Opted in</th>
                <th className="px-4 py-3">Last ping</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Availability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {data.rows.map((r) => (
                <tr key={r.homeId} data-testid="ping-row" data-home-id={r.homeId} data-state={r.lastPing?.state ?? 'none'}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-neutral-900">
                      {r.facility}
                      {!r.claimed && <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-600">unclaimed</span>}
                      {r.onCallList && <span className="ml-2 inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800"><PhoneCall className="h-3 w-3" /> call list</span>}
                    </div>
                    <div className="text-xs text-neutral-500">{r.city ?? ''}</div>
                  </td>
                  <td className="px-4 py-3 text-neutral-800">
                    <div>{r.contact.name}</div>
                    <div className="text-xs text-neutral-500">{r.contact.email ?? ''}{r.contact.mobile ? ` · ${r.contact.mobile}` : ''} · {r.contact.preferredChannel}</div>
                  </td>
                  <td className="px-4 py-3">
                    {r.contact.optedIn ? <span className="text-success-700 font-medium">yes</span> : <span className="text-neutral-500">no</span>}
                    <div className="text-[11px] text-neutral-400">{r.contact.optedIn ? `${r.contact.optedInSource ?? ''} ${fmt(r.contact.optedInAt)}` : r.contact.optedOutAt ? `out ${fmt(r.contact.optedOutAt)}` : ''}</div>
                  </td>
                  <td className="px-4 py-3 text-neutral-700">
                    {r.lastPing ? (<>{fmt(r.lastPing.sentAt)}<div className="text-[11px] text-neutral-400">{r.lastPing.channel} · {r.lastPing.delivery ?? ''}</div></>) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {r.lastPing ? (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATE_STYLE[r.lastPing.state] ?? ''}`} data-testid="ping-state">
                        {r.lastPing.state.replace('_', ' ')}{r.lastPing.state === 'replied' && r.lastPing.parsedCount != null ? ` · ${r.lastPing.parsedCount}` : ''}
                      </span>
                    ) : <span className="text-neutral-400 text-xs">never pinged</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-700">
                    {r.availability.label}
                    {r.availability.source ? <div className="text-[11px] text-neutral-400">source {r.availability.source}</div> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section className="bg-white rounded-2xl shadow p-4">
        <h2 className="font-semibold text-neutral-900">Add a contact (opt-in captured on a call)</h2>
        <p className="text-xs text-neutral-500 mt-1">For the Tier-A warm contacts: record the person who said yes on the phone. Source is stored as <code>admin_call</code>, which is the only way an unclaimed listing can be pinged.</p>
        <form onSubmit={saveContact} className="mt-3 grid grid-cols-1 md:grid-cols-6 gap-2 items-end" data-testid="ping-contact-form">
          <input required placeholder="homeId" value={form.homeId} onChange={(e) => setForm({ ...form, homeId: e.target.value })} className="rounded border border-neutral-300 px-2 py-1.5 text-sm md:col-span-2" />
          <input required placeholder="Contact name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded border border-neutral-300 px-2 py-1.5 text-sm" />
          <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded border border-neutral-300 px-2 py-1.5 text-sm" />
          <input placeholder="Mobile (optional)" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} className="rounded border border-neutral-300 px-2 py-1.5 text-sm" />
          <div className="flex items-center gap-2">
            <select value={form.preferredChannel} onChange={(e) => setForm({ ...form, preferredChannel: e.target.value })} className="rounded border border-neutral-300 px-2 py-1.5 text-sm">
              <option value="EMAIL">Email</option>
              <option value="SMS">SMS (stub)</option>
            </select>
            <button type="submit" className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white">Save</button>
          </div>
        </form>
        {formMsg && <p className="mt-2 text-xs text-neutral-600">{formMsg}</p>}
      </section>
    </div>
  );
}
