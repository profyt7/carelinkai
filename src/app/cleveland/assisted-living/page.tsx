import type { Metadata } from 'next';
import Link from 'next/link';
import { FiArrowRight, FiCheck } from 'react-icons/fi';

export const metadata: Metadata = {
  title: 'Assisted Living in Cleveland, OH | CareLinkAI',
  description:
    'Compare assisted living communities in Greater Cleveland. What assisted living covers, typical costs, what to look for, and how to choose. No broker fees.',
  alternates: { canonical: 'https://getcarelinkai.com/cleveland/assisted-living' },
  openGraph: {
    title: 'Assisted Living in Cleveland, OH | CareLinkAI',
    description:
      'A clear, local guide to assisted living in Cleveland — what it covers, costs, and how to choose.',
    type: 'website',
    url: 'https://getcarelinkai.com/cleveland/assisted-living',
    siteName: 'CareLinkAI',
  },
};

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

export default function ClevelandAssistedLivingPage() {
  return (
    <main className="min-h-screen bg-neutral-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* Hero */}
      <section className="bg-white border-b border-neutral-200">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <nav className="text-sm text-neutral-600">
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
          <div className="mt-8">
            <Link
              href="/search?careLevel=ASSISTED"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700"
            >
              Browse Cleveland assisted living homes
              <FiArrowRight />
            </Link>
          </div>
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
            className="block p-5 bg-white border border-neutral-200 rounded-xl hover:border-primary-400 hover:shadow-md transition"
          >
            <p className="font-semibold text-neutral-900">Memory care →</p>
            <p className="mt-1 text-sm text-neutral-600">Specialized care for dementia.</p>
          </Link>
          <Link
            href="/cleveland/independent-living"
            className="block p-5 bg-white border border-neutral-200 rounded-xl hover:border-primary-400 hover:shadow-md transition"
          >
            <p className="font-semibold text-neutral-900">Independent living →</p>
            <p className="mt-1 text-sm text-neutral-600">For active seniors who don’t need daily help.</p>
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

      {/* CTA */}
      <section className="bg-primary-600">
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

      <footer className="max-w-5xl mx-auto px-6 py-8 text-sm text-neutral-500">
        Last updated 2026-05-15. Not medical advice. Talk with a healthcare professional
        before making care decisions.
      </footer>
    </main>
  );
}
