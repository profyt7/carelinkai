'use client';

/**
 * /admin/home-claims — self-serve listing claims (fix/self-serve-claim). Each row: "New claim: {home} by
 * {operator email}" with Approve / Reject. Approve transfers ownership only (the listing keeps its status, so a
 * published listing stays public); Reject leaves the listing alone and emails the operator politely.
 * Admin only — the API 403s everyone else.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

type Claim = {
  id: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  source: string;
  createdAt: string;
  reviewedAt: string | null;
  home: { id: string; name: string; address: { city: string | null; state: string | null } | null };
  operator: { companyName: string | null; user: { email: string | null; firstName: string | null; lastName: string | null; emailVerified: string | null } | null };
};

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—');

export default function AdminHomeClaimsPage() {
  const [data, setData] = useState<{ pending: Claim[]; decided: Claim[] } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/home-claims', { cache: 'no-store' });
    if (res.ok) setData(await res.json());
    else toast.error('Could not load claims');
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const act = async (id: string, action: 'approve' | 'reject') => {
    setBusy(`${id}:${action}`);
    try {
      const res = await fetch(`/api/admin/home-claims/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.reason === 'already_claimed' ? 'That listing already has an owner' : body?.error || 'Failed');
      toast.success(action === 'approve' ? 'Approved — listing transferred' : 'Rejected — operator emailed');
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Failed');
    } finally {
      setBusy(null);
    }
  };

  const who = (c: Claim) => c.operator.user?.email ?? 'unknown';

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6" data-testid="admin-home-claims">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Listing claims</h1>
        <p className="text-sm text-neutral-600">Verify the operator before approving. Nothing changes hands until you approve.</p>
      </div>

      {!data ? (
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      ) : (
        <>
          <section aria-labelledby="pending-h">
            <h2 id="pending-h" className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">Pending ({data.pending.length})</h2>
            {data.pending.length === 0 ? (
              <p className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600">No claims waiting.</p>
            ) : (
              <ul className="space-y-3">
                {data.pending.map((c) => (
                  <li key={c.id} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm" data-testid="admin-home-claim-row">
                    <p className="font-semibold text-neutral-900">
                      New claim: <Link href={`/homes/${c.home.id}`} className="underline">{c.home.name}</Link> by {who(c)}
                    </p>
                    <p className="mt-1 text-xs text-neutral-600">
                      {[c.home.address?.city, c.home.address?.state].filter(Boolean).join(', ')} · {[c.operator.user?.firstName, c.operator.user?.lastName].filter(Boolean).join(' ') || 'No name'}
                      {c.operator.companyName ? ` · ${c.operator.companyName}` : ''} · email {c.operator.user?.emailVerified ? 'verified' : 'not verified yet'} · via {c.source === 'signup' ? 'signup' : 'listing button'} · {fmt(c.createdAt)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => act(c.id, 'approve')} disabled={!!busy} className="rounded-lg bg-success-600 px-3 py-2 text-sm font-medium text-white hover:bg-success-700 disabled:opacity-50" data-testid="admin-home-claim-approve">
                        {busy === `${c.id}:approve` ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Approve'}
                      </button>
                      <button type="button" onClick={() => act(c.id, 'reject')} disabled={!!busy} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-50" data-testid="admin-home-claim-reject">
                        {busy === `${c.id}:reject` ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reject'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {data.decided.length > 0 && (
            <section aria-labelledby="decided-h">
              <h2 id="decided-h" className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">Recent decisions</h2>
              <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white text-sm">
                {data.decided.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
                    <span>{c.home.name} · {who(c)}</span>
                    <span className={c.status === 'APPROVED' ? 'text-success-700' : 'text-neutral-500'}>{c.status.toLowerCase()} · {fmt(c.reviewedAt)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
