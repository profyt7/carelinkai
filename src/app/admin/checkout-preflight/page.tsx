'use client';

/**
 * /admin/checkout-preflight — is the $399 Family Concierge checkout safe to
 * turn on? (OL-162). Booleans only; no env value is ever shown. Checkout stays
 * OFF until every row is green and the flag is set.
 */

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, XCircle, RefreshCw, Loader2 } from 'lucide-react';

type Preflight = {
  flagRequested: boolean;
  stripeKeyMode: 'live' | 'test' | 'missing' | 'unknown';
  expectedKeyMode: 'live' | 'test';
  keyModeMatches: boolean;
  priceIdSet: boolean;
  webhookSecretSet: boolean;
  adminNotifyEmailSet: boolean;
  ready: boolean;
  checkoutEnabled: boolean;
  problems: string[];
  paidFeatures?: { key: string; env: string; label: string; enabled: boolean }[];
  checkedAt: string;
};

function Row({ ok, label, detail, testId }: { ok: boolean; label: string; detail?: string; testId: string }) {
  return (
    <li className="flex items-start gap-3 py-3" data-testid={testId} data-ok={ok ? 'true' : 'false'}>
      {ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-success-600" /> : <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-error-600" />}
      <div>
        <div className="font-medium text-neutral-900">{label}</div>
        {detail && <div className="text-xs text-neutral-500">{detail}</div>}
      </div>
    </li>
  );
}

export default function CheckoutPreflightPage() {
  const [data, setData] = useState<Preflight | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/admin/checkout-preflight', { credentials: 'include', cache: 'no-store' });
      if (!r.ok) throw new Error(r.status === 403 ? 'Admin only.' : `Failed (${r.status})`);
      setData(await r.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Concierge checkout preflight</h1>
          <p className="text-sm text-neutral-600 mt-1">
            Upfront Family Concierge checkout is <strong>retired</strong> (pay when ready is the only path; families pay
            through the Payment Link sent when their shortlist is ready). <code>CONCIERGE_CHECKOUT_ENABLED</code> is ignored.
            The rows below still show whether the Stripe key and webhook secret are set — booleans only.
          </p>
        </div>
        <button onClick={() => void load()} className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="p-8 flex items-center justify-center text-neutral-500"><Loader2 className="h-6 w-6 animate-spin mr-2" /> Checking…</div>
      ) : error ? (
        <div className="bg-error-50 border border-error-200 rounded-xl p-4 text-error-700 text-sm">{error}</div>
      ) : data ? (
        <>
          <div
            className={`rounded-2xl p-5 ${data.checkoutEnabled ? 'bg-success-50 border border-success-200' : data.ready ? 'bg-primary-50 border border-primary-200' : 'bg-amber-50 border border-amber-200'}`}
            data-testid="preflight-status"
            data-ready={data.ready ? 'true' : 'false'}
            data-enabled={data.checkoutEnabled ? 'true' : 'false'}
          >
            <div className="text-lg font-semibold text-neutral-900">
              Upfront checkout is retired — it can&apos;t be turned on.
            </div>
            <div className="text-xs text-neutral-600 mt-1">
              Flag requested: {data.flagRequested ? 'yes' : 'no'} · checked {new Date(data.checkedAt).toLocaleString()}
            </div>
          </div>

          <ul className="divide-y divide-neutral-100 rounded-2xl bg-white shadow px-5" data-testid="preflight-rows">
            <Row ok={data.keyModeMatches} label={`Stripe secret key mode: ${data.stripeKeyMode}`} detail={`Expected ${data.expectedKeyMode} in this environment.`} testId="preflight-key-mode" />
            <Row ok={data.priceIdSet} label="STRIPE_PRICE_FAMILY_CONCIERGE set" detail="One-time $399 Price id from the Stripe dashboard (code never creates products or prices)." testId="preflight-price" />
            <Row ok={data.webhookSecretSet} label="STRIPE_WEBHOOK_SECRET set" detail="The endpoint must receive checkout.session.completed, checkout.session.expired and charge.refunded." testId="preflight-webhook" />
            <Row ok={data.adminNotifyEmailSet} label="ADMIN_NOTIFY_EMAIL set" detail="The one email sent on a real PAID webhook goes here." testId="preflight-admin-email" />
            <Row ok={data.flagRequested} label="CONCIERGE_CHECKOUT_ENABLED set" detail="The switch. Only honored when every row above is green." testId="preflight-flag" />
          </ul>

          {data.problems.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" data-testid="preflight-problems">
              <div className="font-semibold">Blocking</div>
              <ul className="mt-1 list-disc pl-5">
                {data.problems.map((p) => <li key={p}>{p}</li>)}
              </ul>
            </div>
          )}

          {/* OL-186 — every other paid path has its own kill switch, default off. */}
          {data.paidFeatures && (
            <section className="space-y-2" data-testid="preflight-paid-features">
              <h2 className="text-lg font-semibold text-neutral-900">Paid features</h2>
              <p className="text-sm text-neutral-600">
                Each switch is off unless its env var is set to <code>1</code> in Render. Off = the API returns 503 and the buttons are hidden.
                Webhooks, refunds, cancellations and the billing portal are never switched off.
              </p>
              <ul className="divide-y divide-neutral-100 rounded-2xl bg-white shadow px-5">
                {data.paidFeatures.map((f) => (
                  <li key={f.key} className="flex items-center justify-between gap-3 py-3" data-testid={`paid-feature-${f.key}`} data-enabled={f.enabled ? 'true' : 'false'}>
                    <div>
                      <div className="font-medium text-neutral-900">{f.label}</div>
                      <div className="text-xs text-neutral-500"><code>{f.env}</code></div>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${f.enabled ? 'bg-success-100 text-success-800' : 'bg-neutral-100 text-neutral-600'}`}>
                      {f.enabled ? 'ON' : 'OFF'}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      ) : null}
    </div>
  );
}
