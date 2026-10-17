import type { Metadata } from 'next';
import Link from 'next/link';
import { FiCheck } from 'react-icons/fi';
import { CONCIERGE_OFFER } from '@/lib/concierge/offer';

/**
 * Stripe Checkout success page for the Family Concierge (sprint W5-3). Public,
 * noindex. Shows nothing personal — the order id is only echoed back so the
 * family can quote it. Payment confirmation comes from the webhook, not from
 * landing here, so the copy says "within one business day", not "paid".
 */

export const metadata: Metadata = {
  title: 'Thank you — Family Concierge | CareLinkAI',
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ order?: string | string[] }>;

export default async function ConciergeThanksPage({ searchParams }: { searchParams?: SearchParams }) {
  const sp = searchParams ? await searchParams : {};
  const raw = Array.isArray(sp.order) ? sp.order[0] : sp.order;
  const orderId = raw && /^[a-z0-9]{10,40}$/i.test(raw) ? raw : null;
  return (
    <main className="min-h-screen bg-neutral-50" data-testid="concierge-thanks">
      <section className="max-w-3xl mx-auto px-6 py-20">
        <div className="rounded-2xl border border-success-200 bg-success-50 p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-success-700">Family Concierge</p>
          <h1 className="mt-2 text-3xl font-bold text-neutral-900">Thank you — a Cleveland person will call you within one business day.</h1>
          <p className="mt-4 text-neutral-700">
            Your booking is in. We will confirm the payment by email from Stripe, then start with the 20-minute intake
            call. Your verified shortlist of 3–5 homes follows within two business days of that call.
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
            Guarantee: {CONCIERGE_OFFER.guarantee}
            {orderId ? (
              <>
                {' '}Your order reference: <span className="font-mono" data-testid="concierge-order-ref">{orderId}</span>.
              </>
            ) : null}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/cleveland" className="inline-flex items-center rounded-lg bg-primary-600 px-5 py-2.5 font-semibold text-white hover:bg-primary-700">
              Browse the directory while you wait
            </Link>
            <Link href="/" className="inline-flex items-center rounded-lg border border-neutral-300 bg-white px-5 py-2.5 font-semibold text-neutral-900 hover:bg-neutral-50">
              Back to home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
