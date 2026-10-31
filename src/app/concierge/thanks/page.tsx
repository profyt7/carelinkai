import type { Metadata } from 'next';
import Link from 'next/link';
import { FiCheck } from 'react-icons/fi';
import { CONCIERGE_OFFER } from '@/lib/concierge/offer';
import { BTN_PRIMARY, BTN_SECONDARY } from '@/components/site/brand';

/**
 * Payment landing page for the Family Concierge (sprint W5-3; pay when ready 10/31 — also a sensible
 * redirect for a Stripe Payment Link). Public, noindex. Shows nothing personal — the order id is only
 * echoed back so the family can quote it. Landing here is not proof of payment, so the copy says the
 * shortlist follows once the payment is confirmed. No turnaround promise.
 */

export const metadata: Metadata = {
  title: 'Thank you — Family Concierge',
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ order?: string | string[] }>;

export default async function ConciergeThanksPage({ searchParams }: { searchParams?: SearchParams }) {
  const sp = searchParams ? await searchParams : {};
  const raw = Array.isArray(sp.order) ? sp.order[0] : sp.order;
  const orderId = raw && /^[a-z0-9]{10,40}$/i.test(raw) ? raw : null;
  return (
    <div className="bg-neutral-50" data-testid="concierge-thanks">
      <section className="max-w-3xl mx-auto px-6 py-20">
        <div className="rounded-2xl border border-success-200 bg-success-50 p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-success-700">Family Concierge</p>
          <h1 className="mt-2 text-3xl font-bold text-neutral-900">Thank you — your payment is on its way to us.</h1>
          <p className="mt-4 text-neutral-700">
            Stripe emails you a receipt. As soon as we see the payment, we email you the link to your full shortlist.
          </p>
          <ul className="mt-6 space-y-2">
            {CONCIERGE_OFFER.inclusions.slice(0, 4).map((line) => (
              <li key={line} className="flex gap-3 text-neutral-700">
                <FiCheck className="mt-1 flex-shrink-0 text-success-600" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-neutral-600">
            {CONCIERGE_OFFER.notAPlacementLine}
            {orderId ? (
              <>
                {' '}Your order reference: <span className="font-mono" data-testid="concierge-order-ref">{orderId}</span>.
              </>
            ) : null}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/cleveland" className={BTN_PRIMARY}>
              Browse the directory
            </Link>
            <Link href="/" className={BTN_SECONDARY}>
              Back to home
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
