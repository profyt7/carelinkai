import type { Metadata } from 'next';
import Link from 'next/link';
import { FiCheck } from 'react-icons/fi';
import ConciergeScreener from './ConciergeScreener';
import { CONCIERGE_FIVE_MISTAKES, CONCIERGE_OFFER } from '@/lib/concierge/offer';

/**
 * Family concierge offer page (sprint W3 item 5 / sprint 3.1; v2 copy OL-165).
 *
 * Paid, private-pay offer (flat one-time fee, sprint W5-3) with the payer-source
 * screener in FRONT of it: the server HTML carries the pitch and the screener;
 * the offer card (where the price lives) is mounted client-side only after a
 * private-pay / LTC insurance / not-sure answer. Medicaid / Medicare / VA
 * answers get free help and never render the offer or a price. This server
 * page carries no literal dollar amount; src/lib/concierge/offer.ts owns the
 * number (the headline's five-thousand-dollar mistake is the cost of a wrong
 * move, not a price).
 */

const PAGE_URL = 'https://getcarelinkai.com/concierge';

export const metadata: Metadata = {
  title: 'Family Concierge — A Verified Shortlist in 2 Business Days or You Pay Nothing | CareLinkAI',
  description:
    'A Cleveland person checks fit, prices and the contract with you before you sign: a verified shortlist in 2 business days, a Medicaid runway plan, real prices in writing, a contract red-flag review. Private-pay families only; always free when Medicaid, Medicare or the VA pays.',
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: 'Family Concierge | CareLinkAI',
    description:
      'We keep you from making the expensive mistake under pressure. Assisted living and memory care in Greater Cleveland. Private-pay families only — free help for everyone else.',
    type: 'website',
    url: PAGE_URL,
    siteName: 'CareLinkAI',
  },
};

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Family Concierge — CareLinkAI',
  description:
    'A person who checks fit, prices and the contract with private-pay families before they sign for senior care in Greater Cleveland. Free directory and guides for families paying through Medicaid, Medicare or the VA.',
  url: PAGE_URL,
  publisher: {
    '@type': 'Organization',
    name: 'CareLinkAI',
    url: 'https://getcarelinkai.com',
    address: { '@type': 'PostalAddress', addressLocality: 'Cleveland', addressRegion: 'OH', addressCountry: 'US' },
  },
};

export default function ConciergePage() {
  return (
    <main className="min-h-screen bg-neutral-50" data-testid="concierge-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      {/* Hero */}
      <section className="bg-white border-b border-neutral-200">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <p className="text-sm font-semibold text-primary-600 uppercase tracking-wide">Family Concierge · Greater Cleveland</p>
          {/* "Free for families" stays above the fold (OL-165 a). */}
          <p
            className="mt-3 inline-flex items-center rounded-full border border-success-200 bg-success-50 px-4 py-2 text-sm font-semibold text-success-800"
            data-testid="concierge-free-for-families"
          >
            {CONCIERGE_OFFER.freeForFamiliesLine}
          </p>
          <h1 className="mt-5 text-4xl sm:text-5xl font-bold text-neutral-900 leading-tight" data-testid="concierge-headline">
            {CONCIERGE_OFFER.headline}
          </h1>
          <p className="mt-4 text-xl font-semibold text-primary-700 max-w-3xl" data-testid="concierge-subhead">
            {CONCIERGE_OFFER.subhead}
          </p>
          <p className="mt-6 text-lg text-neutral-700 max-w-3xl">
            A hospital gives you 48 hours. In that window families pick a home that can’t handle the care, sign a
            contract they haven’t read, or run out of money in a place that won’t keep them. A Cleveland person checks
            fit, prices and the contract with you before you sign — verified homes only, availability confirmed before
            you visit, the real price in writing.
          </p>
          <p className="mt-4 text-neutral-700 max-w-3xl">
            The concierge is a <strong>private-pay service</strong>. If care will be paid through Medicaid, Medicare or
            the VA, CareLinkAI’s help is always free — the screener below sends you straight there.
          </p>
        </div>
      </section>

      {/* Screener → offer / free help */}
      <section id="screener" className="max-w-3xl mx-auto px-6 py-16 scroll-mt-16">
        <ConciergeScreener />
      </section>

      {/* The five mistakes (no pricing here) — replaces the old "how it works" steps (OL-165 a). */}
      <section className="bg-white border-y border-neutral-200" data-testid="concierge-five-mistakes">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-neutral-900">The five mistakes a 48-hour discharge causes — and what we check for each</h2>
          <p className="mt-3 text-neutral-700 max-w-3xl">
            None of this is about saving you time. It is about the decisions that cost a family thousands of dollars and
            a second move when they are made under pressure.
          </p>
          <ol className="mt-8 space-y-6 max-w-3xl">
            {CONCIERGE_FIVE_MISTAKES.map((m, i) => (
              <li key={m.mistake} className="flex gap-4">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold text-neutral-900">{m.mistake}</p>
                  <p className="mt-1 text-neutral-700">{m.cost}</p>
                  <p className="mt-2 text-neutral-800">
                    <strong className="text-primary-700">What we do: </strong>
                    {m.answer}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-8 text-sm text-neutral-600 max-w-3xl">{CONCIERGE_OFFER.noOutcomeLine}</p>
        </div>
      </section>

      {/* Why trust it */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-neutral-900">Why it’s different from a “free” placement agency</h2>
        <ul className="mt-6 space-y-3 max-w-3xl">
          {[
            'National placement agencies are paid a commission by the home — often a month’s rent — which is why their “free” shortlist leans toward whoever pays. Our concierge is paid by you, flat, one time.',
            CONCIERGE_OFFER.honestyLine,
            'Every home we shortlist is a licensed Ohio facility with its state inspection history in front of you, facts only.',
            'Availability is confirmed with the home before you tour — no wasted Saturday drives.',
            `${CONCIERGE_OFFER.guarantee} That is the whole guarantee: the shortlist, on time, or your money back.`,
            'Families paying through Medicaid, Medicare or the VA get the directory, guides and direct home contact free, with no fee attached to the placement, ever.',
          ].map((line) => (
            <li key={line} className="flex gap-3">
              <FiCheck className="mt-1 flex-shrink-0 text-success-600" />
              <span className="text-neutral-700">{line}</span>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-sm text-neutral-600">
          Prefer to search on your own? The{' '}
          <Link href="/cleveland" className="font-semibold text-primary-600 hover:underline">
            Cleveland directory
          </Link>{' '}
          is free for everyone.
        </p>
      </section>

      <footer className="max-w-5xl mx-auto px-6 py-8 text-sm text-neutral-500">
        CareLinkAI is not a licensed care provider, broker or insurer. Not medical, legal or financial advice.
      </footer>
    </main>
  );
}
