import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FiArrowRight, FiCheck } from 'react-icons/fi';
import ListingCard from '@/components/directory/ListingCard';
import { fetchPublicListings } from '@/lib/directory/public-listings';
import { SUBURBS, findSuburb, suburbPath } from '@/lib/directory/suburbs';
import { AVAILABILITY_FRESH_DAYS } from '@/lib/availability/availability';
import { buildListingsItemListJsonLd } from '@/lib/seo/jsonld';

/**
 * Suburb SEO page: /cleveland/assisted-living/<slug> (sprint W3 item 3).
 * Allow-listed slugs only (src/lib/directory/suburbs.ts) — anything else 404s.
 * Real, non-demo listings for the suburb, server-rendered with ODH inspection
 * facts and the Verified Availability badge where the data exists.
 */

export const dynamic = 'force-dynamic';

const SITE_URL = 'https://getcarelinkai.com';
const LISTINGS_LIMIT = 24;

type Params = Promise<{ suburb: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { suburb: slug } = await params;
  const s = findSuburb(slug);
  if (!s) return { title: 'Not found | CareLinkAI', robots: { index: false } };
  const url = `${SITE_URL}${suburbPath(s)}`;
  return {
    title: s.title,
    description: s.description,
    alternates: { canonical: url },
    openGraph: { title: s.title, description: s.description, type: 'website', url, siteName: 'CareLinkAI' },
  };
}

export default async function SuburbAssistedLivingPage({ params }: { params: Params }) {
  const { suburb: slug } = await params;
  const s = findSuburb(slug);
  if (!s) notFound();

  const listings = await fetchPublicListings({ cities: s.cities, careLevel: 'ASSISTED', take: LISTINGS_LIMIT });
  const url = `${SITE_URL}${suburbPath(s)}`;
  const others = SUBURBS.filter((x) => x.slug !== s.slug);

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: s.h1,
    description: s.description,
    url,
    about: { '@type': 'Thing', name: 'Assisted Living' },
    publisher: {
      '@type': 'Organization',
      name: 'CareLinkAI',
      url: SITE_URL,
      address: { '@type': 'PostalAddress', addressLocality: 'Cleveland', addressRegion: 'OH', addressCountry: 'US' },
    },
    areaServed: { '@type': 'City', name: `${s.name}, Ohio` },
  };

  const itemList = buildListingsItemListJsonLd({ url, name: `Assisted living homes in ${s.name}, OH`, listings });

  return (
    <main className="min-h-screen bg-neutral-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      {listings.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
      )}

      {/* Hero */}
      <section className="bg-white border-b border-neutral-200">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <nav className="text-sm text-neutral-600">
            <Link href="/cleveland" className="hover:text-primary-600">
              Cleveland senior care
            </Link>
            <span className="mx-2 text-neutral-400">/</span>
            <Link href="/cleveland/assisted-living" className="hover:text-primary-600">
              Assisted living
            </Link>
            <span className="mx-2 text-neutral-400">/</span>
            <span className="text-neutral-900 font-medium">{s.name}</span>
          </nav>
          <p className="mt-4 text-sm font-semibold text-primary-600 uppercase tracking-wide">
            {s.name}, {s.county} County
          </p>
          <h1 className="mt-3 text-4xl sm:text-5xl font-bold text-neutral-900 leading-tight">{s.h1}</h1>
          <p className="mt-6 text-lg text-neutral-700 max-w-3xl">{s.intro}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#listings"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700"
            >
              See {s.name} assisted living homes
              <FiArrowRight />
            </a>
            <Link
              href={`/search?careLevel=ASSISTED&location=${encodeURIComponent(`${s.name}, OH`)}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-neutral-300 text-neutral-900 rounded-lg font-semibold hover:bg-neutral-50"
            >
              Search near {s.name}
            </Link>
          </div>
        </div>
      </section>

      {/* Listings */}
      <section id="listings" className="max-w-5xl mx-auto px-6 py-16 scroll-mt-16" data-testid="listings-section">
        <h2 className="text-3xl font-bold text-neutral-900">
          Assisted living homes in {s.name}
          {listings.length > 0 && (
            <span className="ml-3 align-middle text-base font-medium text-neutral-500" data-testid="listings-count">
              {listings.length} licensed {listings.length === 1 ? 'home' : 'homes'}
            </span>
          )}
        </h2>
        <p className="mt-3 text-neutral-700 max-w-3xl">
          Every home below is a real, licensed facility in {s.cities.join(' / ')} — no demo or
          placeholder listings. A <span className="font-semibold">Verified Availability</span> badge
          means the operator confirmed open beds with us within the last {AVAILABILITY_FRESH_DAYS} days.
          Inspection lines are facts from Ohio Department of Health survey records (most recent survey
          date and citation count) — we do not grade homes.
        </p>
        {listings.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" data-testid="listings-grid" data-count={listings.length}>
            {listings.map((l, i) => (
              <ListingCard key={l.id} listing={l} priority={i < 3} />
            ))}
          </div>
        ) : (
          <p className="mt-8 rounded-xl border border-neutral-200 bg-white p-6 text-neutral-700" data-testid="listings-empty">
            We are still verifying the {s.name} homes from the state roster. In the meantime,{' '}
            <Link href="/cleveland/assisted-living" className="font-semibold text-primary-600 hover:underline">
              browse assisted living across Greater Cleveland
            </Link>
            .
          </p>
        )}
      </section>

      {/* Local context */}
      <section className="bg-white border-y border-neutral-200">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-neutral-900">Choosing assisted living in {s.name}</h2>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-bold text-neutral-900">Hospitals and landmarks nearby</h3>
              <ul className="mt-4 space-y-3">
                {s.nearby.map((n) => (
                  <li key={n} className="flex gap-3">
                    <FiCheck className="mt-1 flex-shrink-0 text-success-600" />
                    <span className="text-neutral-700">{n}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold text-neutral-900">What to check before you tour</h3>
              <ul className="mt-4 space-y-3">
                {[
                  'Read the home’s most recent ODH survey — the date and citation count are on each card; the full report is on the listing page.',
                  'Ask what the base rate covers and what triggers a higher level of care.',
                  'Ask who the home’s primary hospital and pharmacy partners are.',
                  'Visit at a meal and talk to a resident without staff present.',
                ].map((line) => (
                  <li key={line} className="flex gap-3">
                    <FiCheck className="mt-1 flex-shrink-0 text-success-600" />
                    <span className="text-neutral-700">{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Other suburbs */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold text-neutral-900">Assisted living in other Cleveland suburbs</h2>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {others.map((o) => (
            <Link
              key={o.slug}
              href={suburbPath(o)}
              className="block p-5 bg-white border border-neutral-200 rounded-xl hover:border-primary-400 hover:shadow-md transition"
            >
              <p className="font-semibold text-neutral-900">{o.name} →</p>
              <p className="mt-1 text-sm text-neutral-600">{o.county} County</p>
            </Link>
          ))}
          <Link
            href="/cleveland/assisted-living"
            className="block p-5 bg-white border border-neutral-200 rounded-xl hover:border-primary-400 hover:shadow-md transition"
          >
            <p className="font-semibold text-neutral-900">All of Greater Cleveland →</p>
            <p className="mt-1 text-sm text-neutral-600">Seven counties, one directory.</p>
          </Link>
        </div>
      </section>

      <footer className="max-w-5xl mx-auto px-6 py-8 text-sm text-neutral-500">
        Last updated 2026-10-13. Inspection data is sourced from Ohio Department of Health public
        records and presented as facts without grading. Not medical advice.
      </footer>
    </main>
  );
}
