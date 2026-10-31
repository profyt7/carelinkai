'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

/**
 * Family Concierge order actions, pay when ready. Order of operations:
 *   save the shortlist → "Shortlist ready — send payment link" (CONCIERGE_PAYMENT_LINK_URL; a paste field
 *   only when that's unset) → the family pays → the Stripe webhook marks it PAID and releases the shortlist
 *   automatically (OL-248). "Mark paid" / "Release shortlist" are manual fallbacks; "Reopen" revives an
 *   order that expired unpaid after 14 days. The family sees nothing of the shortlist until paid + released.
 */

export type ConciergeOrderRow = {
  id: string;
  status: 'PENDING_PAYMENT' | 'PAID' | 'WAITLIST' | 'REQUESTED_UNPAID' | 'REFUNDED' | 'CANCELED' | 'EXPIRED';
  amountCents: number;
  createdAt: string;
  paidAt: string | null;
  refundedAt: string | null;
  paymentLinkUrl: string | null;
  paymentLinkSentAt: string | null;
  shortlistReleasedAt: string | null;
  paymentReminderSentAt?: string | null;
  expiredAt?: string | null;
};

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—');

export default function ConciergeOrderPanel({ order, shortlistReady, paymentLinkConfigured = false, onChanged }: { order: ConciergeOrderRow; shortlistReady: boolean; paymentLinkConfigured?: boolean; onChanged: () => void }) {
  const [link, setLink] = useState(order.paymentLinkUrl ?? '');
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (action: 'send_payment_link' | 'mark_paid' | 'release_shortlist' | 'reopen', ok: string, extra: Record<string, unknown> = {}) => {
    setBusy(action);
    try {
      const res = await fetch(`/api/admin/concierge/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed');
      toast.success(data?.emailed === false ? `${ok} (email not sent — check Resend)` : ok);
      onChanged();
    } catch (e: any) {
      toast.error(e?.message || 'Failed');
    } finally {
      setBusy(null);
    }
  };

  const unpaid = order.status === 'REQUESTED_UNPAID';
  const paid = order.status === 'PAID';
  const expired = order.status === 'EXPIRED';
  const btn = 'px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50';

  return (
    <div className="bg-white rounded-2xl shadow p-5" data-testid="concierge-order-panel" data-order-status={order.status}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-neutral-900">Family Concierge order</h2>
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-700" data-testid="concierge-order-status">
          {order.status.replace(/_/g, ' ').toLowerCase()} · ${(order.amountCents / 100).toFixed(0)}
        </span>
      </div>
      <p className="mt-1 text-xs text-neutral-500">
        Pay when ready: save the shortlist, then send the payment link. When the family pays, Stripe marks the order paid and the
        shortlist is released to them automatically. Mark paid / Release are manual fallbacks. The family can&apos;t see the shortlist
        until it&apos;s paid and released.
      </p>
      <dl className="mt-3 grid grid-cols-1 gap-1 text-xs text-neutral-600 sm:grid-cols-3">
        <div>Payment link sent: <span data-testid="concierge-order-link-sent">{fmt(order.paymentLinkSentAt)}</span></div>
        <div>Paid: <span data-testid="concierge-order-paid">{fmt(order.paidAt)}</span></div>
        <div>Shortlist released: <span data-testid="concierge-order-released">{fmt(order.shortlistReleasedAt)}</span></div>
        <div>Reminder sent: <span data-testid="concierge-order-reminder">{fmt(order.paymentReminderSentAt ?? null)}</span></div>
        {expired && <div className="text-amber-700">Expired: <span data-testid="concierge-order-expired">{fmt(order.expiredAt ?? null)}</span></div>}
      </dl>

      {unpaid && (
        <div className="mt-4 space-y-2">
          {paymentLinkConfigured ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => act('send_payment_link', order.paymentLinkSentAt ? 'Payment link re-sent' : 'Payment link emailed to the family')}
                disabled={!!busy || !shortlistReady}
                className={`${btn} bg-primary-600 text-white hover:bg-primary-700`}
                data-testid="concierge-order-send-link"
                title={shortlistReady ? undefined : 'Save the shortlist first'}
              >
                {busy === 'send_payment_link' ? <Loader2 className="h-4 w-4 animate-spin" /> : order.paymentLinkSentAt ? 'Re-send payment link' : 'Shortlist ready — send payment link'}
              </button>
              <span className="text-xs text-neutral-500">Uses the $399 Stripe Payment Link from CONCIERGE_PAYMENT_LINK_URL.</span>
            </div>
          ) : (
            <>
              <label className="block text-sm font-medium text-neutral-800" htmlFor={`paylink-${order.id}`}>
                Stripe Payment Link <span className="font-normal text-neutral-500">(fallback: CONCIERGE_PAYMENT_LINK_URL isn&apos;t set)</span>
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id={`paylink-${order.id}`}
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://buy.stripe.com/…"
                  className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  data-testid="concierge-order-link-input"
                />
                <button
                  type="button"
                  onClick={() => act('send_payment_link', order.paymentLinkSentAt ? 'Payment link re-sent' : 'Payment link emailed to the family', { paymentLinkUrl: link })}
                  disabled={!!busy || !shortlistReady || !link.trim()}
                  className={`${btn} bg-primary-600 text-white hover:bg-primary-700`}
                  data-testid="concierge-order-send-link"
                  title={shortlistReady ? undefined : 'Save the shortlist first'}
                >
                  {busy === 'send_payment_link' ? <Loader2 className="h-4 w-4 animate-spin" /> : order.paymentLinkSentAt ? 'Re-send payment link' : 'Shortlist ready — send payment link'}
                </button>
              </div>
            </>
          )}
          {!shortlistReady && <p className="text-xs text-amber-700">Save the shortlist below first; the payment link goes out only when it&apos;s ready.</p>}
          <button
            type="button"
            onClick={() => act('mark_paid', 'Marked paid')}
            disabled={!!busy}
            className={`${btn} border border-success-600 text-success-700 hover:bg-success-50`}
            data-testid="concierge-order-mark-paid"
          >
            {busy === 'mark_paid' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Mark paid'}
          </button>
        </div>
      )}

      {paid && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => act('release_shortlist', order.shortlistReleasedAt ? 'Shortlist link re-sent' : 'Shortlist released to the family')}
            disabled={!!busy || !shortlistReady}
            className={`${btn} bg-success-600 text-white hover:bg-success-700`}
            data-testid="concierge-order-release"
          >
            {busy === 'release_shortlist' ? <Loader2 className="h-4 w-4 animate-spin" /> : order.shortlistReleasedAt ? 'Re-send shortlist link' : 'Release shortlist'}
          </button>
        </div>
      )}

      {expired && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => act('reopen', 'Order reopened — send the payment link again')}
            disabled={!!busy}
            className={`${btn} bg-amber-600 text-white hover:bg-amber-700`}
            data-testid="concierge-order-reopen"
          >
            {busy === 'reopen' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reopen order'}
          </button>
          <button
            type="button"
            onClick={() => act('mark_paid', 'Marked paid')}
            disabled={!!busy}
            className={`${btn} border border-success-600 text-success-700 hover:bg-success-50`}
          >
            Mark paid
          </button>
        </div>
      )}

      {!unpaid && !paid && !expired && <p className="mt-3 text-xs text-neutral-500">No actions for a {order.status.toLowerCase()} order.</p>}
    </div>
  );
}
