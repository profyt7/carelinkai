import type { Metadata } from 'next';
import Link from 'next/link';
import { FiCheck } from 'react-icons/fi';
import ConciergeScreener from './ConciergeScreener';

/**
 * Family concierge offer page (sprint W3 item 5 / sprint 3.1).
 *
 * Private-pay-only offer with the payer-source screener in FRONT of it:
 * the server HTML carries the pitch and the screener; the offer section (where
 * the price will live) is mounted client-side only after a private-pay / LTC
 * insurance answer. Medicaid / Medicare / VA / not-sure answers get free help
 * and never render the offer. No price exists yet — Chris adds it; nothing
 * here touches Stripe. The CTA is a placeholder into the existing intake.
 */

const PAGE_URL = 'https://getcarelinkai.com/concierge';

export const metadata: Metadata = {
  title: 'Family Concierge — Hands-On Help Finding Senior Care in Cleveland | CareLinkAI',
  description:
    'A Cleveland person who does the legwork: a verified shortlist, availability confirmed, tours scheduled, pricing in writing. Private-pay families only; always free when Medicaid, Medicare or the VA pays.',
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: 'Family Concierge | CareLinkAI',
    description:
      'Hands-on help finding assisted living or memory care in Greater Cleveland. Private-pay families only — free help for everyone else.',
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
    'Hands-on help finding senior care in Greater Cleveland for private-pay families. Free directory and guides for families paying through Medicaid, Medicare or the VA.',
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
          <p className="text-sm font-semibold text-primary-600 uppercase tracking-wide">For families · Greater Cleveland</p>
          <h1 className="mt-3 text-4xl sm:text-5xl font-bold text-neutral-900 leading-tight">
            Family Concierge: a Cleveland person who does the legwork with you
          </h1>
          <p className="mt-6 text-lg text-neutral-700 max-w-3xl">
            Finding the right assisted living or memory care home usually means twenty phone calls, five tours and a
            pricing sheet you can’t decode. Our concierge does that work with you — verified homes only, availability
            confirmed before you visit, and the real price in writing.
          </p>
          <p className="mt-4 text-neutral-700 max-w-3xl">
            It is a <strong>private-pay service</strong>. If care will be paid through Medicaid, Medicare or the VA,
            CareLinkAI’s help is always free — the screener below sends you straight there.
          </p>
        </div>
      </section>

      {/* Screener → offer / free help */}
      <section id="screener" className="max-w-3xl mx-auto px-6 py-16 scroll-mt-16">
        <ConciergeScreener />
      </section>

      {/* How it works (no pricing here) */}
      <section className="bg-white border-y border-neutral-200">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-neutral-900">How the concierge works</h2>
          <ol className="mt-6 space-y-4 max-w-3xl list-decimal list-inside text-neutral-700">
            <li>
              <strong className="text-neutral-900">A 20-minute call.</strong> Care needs, location, timeline, budget —
              and who else in the family needs to be in the loop.
            </li>
            <li>
              <strong className="text-neutral-900">A verified shortlist within two business days.</strong> Three to five
              homes, each with availability confirmed with the operator and the ODH inspection history explained.
            </li>
            <li>
              <strong className="text-neutral-900">Tours and the paperwork.</strong> We schedule the tours, send a checklist,
              and get the full pricing breakdown in writing before you decide.
            </li>
          </ol>
        </div>
      </section>

      {/* Why trust it */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-neutral-900">Why it’s different from a “free” placement agency</h2>
        <ul className="mt-6 space-y-3 max-w-3xl">
          {[
            'National placement agencies are paid a commission by the home — often a month’s rent — which is why their “free” shortlist leans toward whoever pays. Our concierge is paid by you, flat, and homes never pay us to be recommended.',
            'Every home we shortlist is a licensed Ohio facility with its state inspection history in front of you, facts only.',
            'Availability is confirmed with the home before you tour — no wasted Saturday drives.',
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
