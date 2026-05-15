import type { Metadata } from 'next';
import Link from 'next/link';
import { FiArrowRight, FiCheck } from 'react-icons/fi';

export const metadata: Metadata = {
  title: 'Independent Living in Cleveland, OH | CareLinkAI',
  description:
    'Independent living communities in Greater Cleveland for active seniors. What’s included, typical costs, and how to choose. No broker fees.',
  alternates: { canonical: 'https://getcarelinkai.com/cleveland/independent-living' },
  openGraph: {
    title: 'Independent Living in Cleveland, OH | CareLinkAI',
    description:
      'Apartment-style senior communities in Cleveland for active seniors who want amenities without daily care.',
    type: 'website',
    url: 'https://getcarelinkai.com/cleveland/independent-living',
    siteName: 'CareLinkAI',
  },
};

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Independent Living in Cleveland, OH',
  description:
    'Guide to independent living in Greater Cleveland — apartment-style communities with amenities, for seniors who don’t need daily care.',
  url: 'https://getcarelinkai.com/cleveland/independent-living',
  about: { '@type': 'Thing', name: 'Independent Living' },
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

export default function ClevelandIndependentLivingPage() {
  return (
    <main className="min-h-screen bg-neutral-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <section className="bg-white border-b border-neutral-200">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <nav className="text-sm text-neutral-600">
            <Link href="/cleveland" className="hover:text-primary-600">
              Cleveland senior care
            </Link>
            <span className="mx-2 text-neutral-400">/</span>
            <span className="text-neutral-900 font-medium">Independent living</span>
          </nav>
          <h1 className="mt-4 text-4xl sm:text-5xl font-bold text-neutral-900 leading-tight">
            Independent Living in Cleveland, OH
          </h1>
          <p className="mt-6 text-lg text-neutral-700 max-w-3xl">
            Independent living is apartment-style senior community living. Residents are
            active, mostly self-sufficient, and don’t need help with daily life — but they
            want the amenities, social life, and freedom from home maintenance that a
            community delivers.
          </p>
          <div className="mt-8">
            <Link
              href="/search?careLevel=INDEPENDENT"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700"
            >
              Browse Cleveland independent living
              <FiArrowRight />
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-neutral-900">Who independent living is for</h2>
        <p className="mt-3 text-neutral-700 max-w-3xl">
          Independent living suits seniors who can manage their own day — medications,
          dressing, mobility, finances — but are tired of being responsible for a single-
          family home. Common reasons families choose it:
        </p>
        <ul className="mt-6 space-y-3 max-w-3xl">
          {[
            'The house feels too big — too many rooms, too much yard, too many stairs.',
            'Social isolation, especially after losing a spouse or after friends moved.',
            'Cooking and cleaning are becoming a daily drag instead of a daily pleasure.',
            'Home maintenance (roof, plumbing, gutters, snow) is taking over the calendar.',
            'A desire to downsize on their own terms — before a crisis forces it.',
          ].map((line) => (
            <li key={line} className="flex gap-3">
              <FiCheck className="mt-1 flex-shrink-0 text-success-600" />
              <span className="text-neutral-700">{line}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-white border-y border-neutral-200">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-neutral-900">What’s typically included</h2>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                t: 'Private apartment',
                d: 'One- or two-bedroom apartments, sometimes cottages or townhomes. Full kitchen in many; kitchenette in others.',
              },
              {
                t: 'Meals',
                d: 'Usually one main meal per day in a restaurant-style dining room, with optional additional meal plans.',
              },
              {
                t: 'Housekeeping',
                d: 'Weekly cleaning and linens, usually included. Personal laundry varies — ask.',
              },
              {
                t: 'Maintenance',
                d: 'The community owns the building. Light bulbs, appliances, snow, lawn — all handled for you.',
              },
              {
                t: 'Social and wellness programming',
                d: 'Fitness classes, lectures, outings, clubs, religious services. The social layer is the real value.',
              },
              {
                t: 'Transportation',
                d: 'Scheduled rides to medical appointments, grocery, and group outings. Often included; sometimes a fee.',
              },
            ].map((item) => (
              <div key={item.t} className="p-6 bg-neutral-50 rounded-xl border border-neutral-200">
                <p className="font-semibold text-neutral-900">{item.t}</p>
                <p className="mt-2 text-sm text-neutral-700">{item.d}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-neutral-600 max-w-3xl">
            Important distinction: independent living does <em>not</em> include personal
            care (bathing, dressing, medication management). If those needs develop, many
            communities offer an upgrade path to assisted living on the same campus.
          </p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-neutral-900">Cost of independent living in Cleveland</h2>
        <p className="mt-3 text-neutral-700 max-w-3xl">
          Greater Cleveland independent living typically runs <strong>$2,500–$4,000 per
          month</strong>, depending on apartment size, community amenities, and meal plans.
          Some communities use a buy-in (entrance fee) plus monthly model; others are
          straight monthly rentals. Medicare and Medicaid do not cover independent living
          — this is private pay or long-term care insurance for the housing-and-services
          layer.
        </p>
      </section>

      <section className="bg-white border-y border-neutral-200">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-neutral-900">
            Continuing-care campuses vs. standalone communities
          </h2>
          <p className="mt-4 text-neutral-700 max-w-3xl">
            Some Greater Cleveland communities are <strong>standalone independent living</strong>
            — apartments and amenities, no care services on-site. Others are part of
            <strong> continuing-care retirement communities</strong> (CCRCs / life-plan
            communities) that include independent living, assisted living, memory care,
            and skilled nursing all on the same campus. The CCRC model is more expensive
            upfront but means a senior can age in place without moving cities when needs
            change — a real consideration if the goal is one move, not three.
          </p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold text-neutral-900">Other senior care options</h2>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/cleveland/assisted-living"
            className="block p-5 bg-white border border-neutral-200 rounded-xl hover:border-primary-400 hover:shadow-md transition"
          >
            <p className="font-semibold text-neutral-900">Assisted living →</p>
            <p className="mt-1 text-sm text-neutral-600">Daily-living help in a residential setting.</p>
          </Link>
          <Link
            href="/cleveland/memory-care"
            className="block p-5 bg-white border border-neutral-200 rounded-xl hover:border-primary-400 hover:shadow-md transition"
          >
            <p className="font-semibold text-neutral-900">Memory care →</p>
            <p className="mt-1 text-sm text-neutral-600">Specialized care for dementia.</p>
          </Link>
          <Link
            href="/cleveland/nursing-homes"
            className="block p-5 bg-white border border-neutral-200 rounded-xl hover:border-primary-400 hover:shadow-md transition"
          >
            <p className="font-semibold text-neutral-900">Nursing homes →</p>
            <p className="mt-1 text-sm text-neutral-600">Skilled medical care, 24/7.</p>
          </Link>
        </div>
      </section>

      <section className="bg-primary-600">
        <div className="max-w-5xl mx-auto px-6 py-12 text-center">
          <h2 className="text-3xl font-bold text-white">Find independent living in Cleveland</h2>
          <p className="mt-3 text-primary-100 max-w-2xl mx-auto">
            Search Cleveland communities by location, amenities, and apartment type.
          </p>
          <Link
            href="/search?careLevel=INDEPENDENT"
            className="mt-6 inline-flex items-center gap-2 px-8 py-3 bg-white text-primary-700 rounded-lg font-semibold hover:bg-primary-50"
          >
            See independent living
            <FiArrowRight />
          </Link>
        </div>
      </section>

      <footer className="max-w-5xl mx-auto px-6 py-8 text-sm text-neutral-500">
        Last updated 2026-05-15.
      </footer>
    </main>
  );
}
