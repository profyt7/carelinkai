import type { Metadata } from 'next';
import Link from 'next/link';
import { BTN_PRIMARY, BTN_SECONDARY, CARD, HERO_BAND } from '@/components/site/brand';
import { FiArrowRight, FiCheck } from 'react-icons/fi';
import ListingCard from '@/components/directory/ListingCard';
import FaqSection from '@/components/site/FaqSection';
import { countPublicListings, fetchPublicListings, waiverFilterFromSearchParams } from '@/lib/directory/public-listings';
import { SUBURBS, suburbPath } from '@/lib/directory/suburbs';
import { careTypeFaqs } from '@/lib/seo/directory-faq';
import { PAGE_META, publicMetadata } from '@/lib/seo/page-meta';
import { AVAILABILITY_FRESH_DAYS } from '@/lib/availability/availability';
import { buildBreadcrumbJsonLd, buildListingsItemListJsonLd } from '@/lib/seo/jsonld';

// Server-rendered listings (sprint W3 item 4): the top verified, non-demo
// assisted-living homes are queried per request and emitted as plain HTML so a
// logged-out fetch (Googlebot, an AI crawler, curl) sees the cards — not a
// client-only fetch. Rendered dynamically so a build never needs the DB; the
// query itself never throws (see fetchPublicListings).
export const dynamic = 'force-dynamic';

const LISTINGS_LIMIT = 12;

// OL-172 (a)(b): title without the suffix (root template adds it), 140–155 char description, OG + Twitter.
export const metadata: Metadata = publicMetadata(PAGE_META.assistedLiving);

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Assisted Living in Cleveland, OH',
  description:
    'Guide to assisted living in Greater Cleveland — what it is, who it’s for, typical costs, and how to choose.',
  url: 'https://getcarelinkai.com/cleveland/assisted-living',
  about: { '@type': 'Thing', name: 'Assisted Living' },
  publisher: {
    '@type': 'Organization',
    name: 'CareLinkAI',
    url: 'https://getcarelinkai.com',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Cleveland',
      addressRegion: 'OH',
      addressCountry: 'US',
    },
  },
};

type PageSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ClevelandAssistedLivingPage({ searchParams }: { searchParams?: PageSearchParams }) {
  // ?waiver=1 (sprint W5-2): only homes ACCEPTING_NEW Medicaid waiver residents.
  const waiverOnly = waiverFilterFromSearchParams(searchParams ? await searchParams : undefined);
  const [listings, total, acceptingWaiver] = await Promise.all([
    fetchPublicListings({ careLevel: 'ASSISTED', medicaidWaiver: waiverOnly, take: LISTINGS_LIMIT }),
    countPublicListings({ careLevel: 'ASSISTED' }).catch(() => 0),
    countPublicListings({ careLevel: 'ASSISTED', medicaidWaiver: true }).catch(() => 0),
  ]);
  const faqs = careTypeFaqs('assisted-living', { label: 'assisted living', total, acceptingWaiver });
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'Cleveland senior care', path: '/cleveland' },
    { name: 'Assisted living', path: '/cleveland/assisted-living' },
  ]);
  const itemList = buildListingsItemListJsonLd({
    url: 'https://getcarelinkai.com/cleveland/assisted-living',
    name: 'Assisted living homes in Greater Cleveland, OH',
    listings,
  });

  return (
    <div className="bg-neutral-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {listings.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
      )}

      {/* Hero */}
      <section className={HERO_BAND} data-testid="brand-hero">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary-500 to-secondary-500" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-16">
          <nav aria-label="Breadcrumb" className="text-sm text-neutral-600">
            <Link href="/cleveland" className="hover:text-primary-600">
              Cleveland senior care
            </Link>
            <span className="mx-2 text-neutral-400">/</span>
            <span className="text-neutral-900 font-medium">Assisted living</span>
          </nav>
          <h1 className="mt-4 text-4xl sm:text-5xl font-bold text-neutral-900 leading-tight">
            Assisted Living in Cleveland, OH
          </h1>
          <p className="mt-6 text-lg text-neutral-700 max-w-3xl">
            Assisted living gives seniors help with daily life — bathing, dressing,
            medication management, meals — in a residential community, without the medical
            intensity of a nursing home. In Greater Cleveland, assisted living communities
            range from 12-bed family-style homes to 100+ bed campuses.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#listings"
              className={BTN_PRIMARY}
            >
              See assisted living homes
              <FiArrowRight />
            </a>
            <Link
              href="/search?careLevel=ASSISTED"
              className={BTN_SECONDARY}
            >
              Search all homes
            </Link>
          </div>
        </div>
      </section>

      {/* Listings — server-rendered (sprint W3 item 4) */}
      <section id="listings" className="max-w-5xl mx-auto px-6 py-16 scroll-mt-16" data-testid="listings-section" data-waiver-filter={waiverOnly ? '1' : '0'}>
        <h2 className="text-3xl font-bold text-neutral-900">
          {waiverOnly ? 'Assisted living homes accepting new Medicaid waiver residents' : 'Assisted living homes in Greater Cleveland'}
        </h2>
        {waiverOnly && (
          <div className="mt-4 flex flex-wrap items-center gap-3" data-testid="waiver-filter-banner">
            <span className="inline-flex items-center rounded-full bg-success-50 px-3 py-1 text-sm font-medium text-success-800 ring-1 ring-inset ring-success-200">
              Filter: Accepts Medicaid waiver
            </span>
            <Link href="/cleveland/assisted-living" className="text-sm font-medium text-primary-600 hover:underline">
              Show all homes
            </Link>
            <p className="w-full text-sm text-neutral-600">
              Homes listed by the Western Reserve Area Agency on Aging (Oct 2026) as taking new Ohio Medicaid Assisted
              Living Waiver residents. Waiver slots change often — confirm with the home before you tour.
            </p>
          </div>
        )}
        <p className="mt-3 text-neutral-700 max-w-3xl">
          Real, licensed homes — no demo or placeholder listings. Homes whose availability
          was confirmed with the operator in the last {AVAILABILITY_FRESH_DAYS} days carry a{' '}
          <span className="font-semibold">Verified Availability</span> badge. Inspection
          lines are facts from Ohio Department of Health survey records: the date of the
          most recent survey and how many citations it listed — no grades.
        </p>
        {listings.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" data-testid="listings-grid" data-count={listings.length}>
            {listings.map((l, i) => (
              <ListingCard key={l.id} listing={l} priority={i < 3} />
            ))}
          </div>
        ) : (
          <p className="mt-8 rounded-xl border border-neutral-200 bg-white p-6 text-neutral-700" data-testid="listings-empty">
            {waiverOnly ? 'No home is currently marked as accepting new waiver residents — ' : 'Listings are loading from the directory — '}use{' '}
            <Link href="/search?careLevel=ASSISTED" className="font-semibold text-primary-600 hover:underline">
              search
            </Link>{' '}
            to browse every assisted living home in Greater Cleveland.
          </p>
        )}
        <div className="mt-8">
          <Link
            href="/search?careLevel=ASSISTED"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700"
          >
            Browse all assisted living homes
            <FiArrowRight />
          </Link>
        </div>
      </section>

      {/* Who it's for */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-neutral-900">Who assisted living is for</h2>
        <p className="mt-3 text-neutral-700 max-w-3xl">
          Assisted living fits seniors who can no longer live entirely independently but
          don’t need 24-hour skilled medical care. The line isn’t always sharp. If you find
          yourself answering yes to several of these, it’s worth a tour:
        </p>
        <ul className="mt-6 space-y-3 max-w-3xl">
          {[
            'They have fallen recently or feel unsteady on their feet.',
            'They forget medications, miss doses, or take too many.',
            'They’re skipping meals or losing weight noticeably.',
            'The home isn’t being maintained — laundry, dishes, hygiene tasks slipping.',
            'They’re isolated; you’re the only regular social contact.',
            'You (the family caregiver) are burning out.',
          ].map((line) => (
            <li key={line} className="flex gap-3">
              <FiCheck className="mt-1 flex-shrink-0 text-success-600" />
              <span className="text-neutral-700">{line}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* What's included */}
      <section className="bg-white border-y border-neutral-200">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-neutral-900">What assisted living usually covers</h2>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                t: 'Help with daily living',
                d: 'Bathing, dressing, grooming, mobility, toileting — as much or as little as the resident needs.',
              },
              {
                t: 'Medication management',
                d: 'Trained staff prompt, deliver, and document medications. This alone is often the main reason families move.',
              },
              {
                t: 'Meals and snacks',
                d: 'Three meals a day plus snacks, dietary accommodations, dining-room socializing.',
              },
              {
                t: 'Housekeeping and laundry',
                d: 'Weekly cleaning and linen service, plus personal laundry in most communities.',
              },
              {
                t: 'Social and recreational programming',
                d: 'Daily activities, outings, exercise classes, religious services — the social layer is often as important as the care.',
              },
              {
                t: 'On-site staff 24/7',
                d: 'Including overnight. Not the same as nursing — but help is always present.',
              },
            ].map((item) => (
              <div key={item.t} className="p-6 bg-neutral-50 rounded-xl border border-neutral-200">
                <p className="font-semibold text-neutral-900">{item.t}</p>
                <p className="mt-2 text-sm text-neutral-700">{item.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cost */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-neutral-900">Cost of assisted living in Cleveland</h2>
        <p className="mt-3 text-neutral-700 max-w-3xl">
          Greater Cleveland assisted living typically runs <strong>$3,500–$6,000 per
          month</strong> for a private studio or one-bedroom, all-inclusive of basic care.
          Higher levels of care (more help, more meds, memory support) add to that. Smaller
          residential homes can come in lower; large amenity-heavy campuses can come in
          higher.
        </p>
        <p className="mt-4 text-neutral-700 max-w-3xl">
          Medicare does not cover assisted living. Long-term care insurance, VA benefits
          (for veterans and surviving spouses), and Ohio Medicaid (in narrow circumstances
          and only for licensed providers participating in waiver programs) can offset
          costs. Always ask each home what’s included in the base rate versus billed as
          additional levels of care.
        </p>
      </section>

      {/* What to look for */}
      <section className="bg-white border-y border-neutral-200">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-neutral-900">
            What to look for when touring
          </h2>
          <p className="mt-3 text-neutral-700 max-w-3xl">
            The tour matters more than the brochure. Five things worth doing on every visit:
          </p>
          <ol className="mt-6 space-y-4 max-w-3xl list-decimal list-inside text-neutral-700">
            <li>
              <strong className="text-neutral-900">Visit at a meal.</strong> The dining room
              tells you a lot — staff energy, resident engagement, food quality.
            </li>
            <li>
              <strong className="text-neutral-900">Ask about staffing ratios — and turnover.</strong>{' '}
              Ratios vary by shift. Turnover is the leading-indicator question; high
              turnover signals problems before survey reports do.
            </li>
            <li>
              <strong className="text-neutral-900">Check the Ohio DOH inspection history.</strong>{' '}
              All licensed residential care facilities are inspected by the state. Public
              records are available; ask the home for their most recent report and read
              it.
            </li>
            <li>
              <strong className="text-neutral-900">Talk to a current resident, unscripted.</strong>{' '}
              If management hovers, ask to sit in the activity room for 15 minutes and just
              listen.
            </li>
            <li>
              <strong className="text-neutral-900">Get the full pricing breakdown in writing.</strong>{' '}
              Base rate plus each level of care add-on. Ask what triggers a level increase
              and how much notice they give before a rate change.
            </li>
          </ol>
        </div>
      </section>

      {/* Related */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold text-neutral-900">Other senior care options</h2>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/cleveland/memory-care"
            className={`block p-5 ${CARD}`}
          >
            <p className="font-semibold text-neutral-900">Memory care →</p>
            <p className="mt-1 text-sm text-neutral-600">Specialized care for dementia.</p>
          </Link>
          <Link
            href="/cleveland/independent-living"
            className={`block p-5 ${CARD}`}
          >
            <p className="font-semibold text-neutral-900">Independent living →</p>
            <p className="mt-1 text-sm text-neutral-600">For active seniors who don’t need daily help.</p>
          </Link>
          <Link
            href="/cleveland/nursing-homes"
            className={`block p-5 ${CARD}`}
          >
            <p className="font-semibold text-neutral-900">Nursing homes →</p>
            <p className="mt-1 text-sm text-neutral-600">Skilled medical care, 24/7.</p>
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-primary-600 to-secondary-500">
        <div className="max-w-5xl mx-auto px-6 py-12 text-center">
          <h2 className="text-3xl font-bold text-white">
            Browse assisted living in Cleveland
          </h2>
          <p className="mt-3 text-primary-100 max-w-2xl mx-auto">
            Search by neighborhood, size, and amenities. Contact homes directly. No broker
            fees, no call center.
          </p>
          <Link
            href="/search?careLevel=ASSISTED"
            className="mt-6 inline-flex items-center gap-2 px-8 py-3 bg-white text-primary-700 rounded-lg font-semibold hover:bg-primary-50"
          >
            See homes
            <FiArrowRight />
          </Link>
        </div>
      </section>

      {/* OL-172 (e): every suburb page, from the registry */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12" data-testid="suburb-grid">
        <h2 className="text-2xl font-bold text-neutral-900">Assisted living by suburb</h2>
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {SUBURBS.map((s) => (
            <Link key={s.slug} href={suburbPath(s)} className={`block p-4 ${CARD}`}>
              <p className="font-semibold text-neutral-900">{s.name}</p>
              <p className="mt-0.5 text-xs text-neutral-600">{s.county} County</p>
            </Link>
          ))}
        </div>
      </section>

      <FaqSection faqs={faqs} />

      <div className="max-w-5xl mx-auto px-6 py-8 text-sm text-neutral-500" data-testid="page-note">
        Last updated 2026-05-15. Not medical advice. Talk with a healthcare professional
        before making care decisions.
      </div>
    </div>
  );
}
