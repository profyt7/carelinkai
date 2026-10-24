import type { Metadata } from 'next';
import Link from 'next/link';
import { FiCheck } from 'react-icons/fi';
import ConciergeIntro from './ConciergeIntro';
import { CONCIERGE_FIVE_MISTAKES, CONCIERGE_OFFER } from '@/lib/concierge/offer';
import { PAGE_META, publicMetadata } from '@/lib/seo/page-meta';
import { CONCIERGE_FAQ, buildConciergeFaqJsonLd } from '@/lib/concierge/faq';
import { CARD } from '@/components/site/brand';

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
 *
 * OL-174: two lane cards (client, ConciergeLaneCards via ConciergeIntro) and a
 * FAQ block whose visible text and FAQPage JSON-LD come from one array
 * (src/lib/concierge/faq.ts) — no price in either.
 */

const PAGE_URL = 'https://getcarelinkai.com/concierge';

// OL-172 (a)(b): ≤ 60-char title (root template adds the suffix), 140–155 char description, OG + Twitter.
export const metadata: Metadata = publicMetadata(PAGE_META.concierge);

const faqJsonLd = buildConciergeFaqJsonLd();

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
    <div className="bg-neutral-50" data-testid="concierge-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <script type="application/ld+json" data-testid="concierge-faq-jsonld" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      {/* Hero + screener (client: the hero swaps to the free-lane version after a Medicaid / Medicare / VA answer — OL-166b) */}
      <ConciergeIntro />

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
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-600 to-secondary-500 text-sm font-bold text-white">
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

      {/* FAQ — the same array feeds the FAQPage JSON-LD above (OL-174). No price: the cost answer points to the payer question. */}
      <section className="bg-white border-y border-neutral-200" data-testid="concierge-faq">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-neutral-900">Questions families ask</h2>
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            {CONCIERGE_FAQ.map((f) => (
              <div key={f.question} className={`${CARD} p-6`} data-testid="concierge-faq-item">
                <h3 className="text-lg font-semibold text-neutral-900" data-testid="concierge-faq-q">{f.question}</h3>
                <p className="mt-2 text-neutral-700" data-testid="concierge-faq-a">{f.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-8 text-sm text-neutral-500" data-testid="page-note">
        CareLinkAI is not a licensed care provider, broker or insurer. Not medical, legal or financial advice.
      </div>
    </div>
  );
}
