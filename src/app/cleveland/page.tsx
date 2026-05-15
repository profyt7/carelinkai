import type { Metadata } from 'next';
import Link from 'next/link';
import { FiArrowRight, FiCheck } from 'react-icons/fi';

export const metadata: Metadata = {
  title: 'Senior Care in Cleveland, OH — Assisted Living, Memory Care, & More | CareLinkAI',
  description:
    'A Cleveland-built directory of assisted living, memory care, independent living, and nursing homes across Cuyahoga, Summit, Lake, Lorain, Medina, Geauga, and Portage counties. No broker fees. Contact homes directly.',
  alternates: { canonical: 'https://getcarelinkai.com/cleveland' },
  openGraph: {
    title: 'Senior Care in Cleveland, OH | CareLinkAI',
    description:
      'Verified senior care options across Greater Cleveland. Assisted living, memory care, independent living, nursing homes. No broker fees.',
    type: 'website',
    url: 'https://getcarelinkai.com/cleveland',
    siteName: 'CareLinkAI',
  },
};

const careTypes = [
  {
    href: '/cleveland/assisted-living',
    title: 'Assisted Living',
    blurb:
      'Help with daily tasks (bathing, dressing, medication) in a residential setting, with social activities and meals.',
    forWho: 'For seniors who want independence but need some help with daily living.',
  },
  {
    href: '/cleveland/memory-care',
    title: 'Memory Care',
    blurb:
      'Specialized assisted living for residents with Alzheimer’s or other forms of dementia. Secure environments and trained staff.',
    forWho: 'For families navigating a dementia diagnosis.',
  },
  {
    href: '/cleveland/independent-living',
    title: 'Independent Living',
    blurb:
      'Apartment-style communities for active seniors. Meals, housekeeping, and social programs without the medical layer.',
    forWho: 'For seniors who don’t need daily help but want community and services.',
  },
  {
    href: '/cleveland/nursing-homes',
    title: 'Nursing Homes',
    blurb:
      'Skilled nursing facilities with 24-hour medical care for complex medical needs or post-hospital rehabilitation.',
    forWho: 'For seniors with significant medical needs or recovering from a hospital stay.',
  },
];

const counties = [
  'Cuyahoga',
  'Summit',
  'Lake',
  'Lorain',
  'Medina',
  'Geauga',
  'Portage',
];

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Senior Care in Cleveland, OH',
  description:
    'A Cleveland-built directory of assisted living, memory care, independent living, and nursing homes across Greater Cleveland.',
  url: 'https://getcarelinkai.com/cleveland',
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
  areaServed: counties.map((c) => ({
    '@type': 'AdministrativeArea',
    name: `${c} County, Ohio`,
  })),
  about: careTypes.map((c) => ({ '@type': 'Thing', name: c.title })),
};

export default function ClevelandLandingPage() {
  return (
    <main className="min-h-screen bg-neutral-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* Hero */}
      <section className="bg-white border-b border-neutral-200">
        <div className="max-w-5xl mx-auto px-6 py-16 sm:py-24">
          <p className="text-sm font-semibold text-primary-600 uppercase tracking-wide">
            Cleveland, Ohio
          </p>
          <h1 className="mt-3 text-4xl sm:text-5xl font-bold text-neutral-900 leading-tight">
            Find Senior Care in Cleveland
          </h1>
          <p className="mt-6 text-lg text-neutral-700 max-w-3xl">
            CareLinkAI is a Cleveland-built directory of senior care options across Greater
            Cleveland. We list assisted living, memory care, independent living, and nursing
            homes — with verified information sourced from public Ohio Department of Health
            licensing records and the operators themselves. No broker fees, no call center
            in the middle. You contact the home directly.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/search"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700"
            >
              Search homes
              <FiArrowRight />
            </Link>
            <Link
              href="#care-types"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-neutral-300 text-neutral-900 rounded-lg font-semibold hover:bg-neutral-50"
            >
              Explore care types
            </Link>
          </div>
        </div>
      </section>

      {/* Care types */}
      <section id="care-types" className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-neutral-900">
          Senior care options in Greater Cleveland
        </h2>
        <p className="mt-3 text-neutral-700 max-w-3xl">
          Senior care isn’t one thing. The right setting depends on how much help with
          daily life is needed, whether dementia is part of the picture, and how much medical
          support is involved. Start with the category that fits your situation.
        </p>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          {careTypes.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="block p-6 bg-white border border-neutral-200 rounded-xl hover:border-primary-400 hover:shadow-md transition"
            >
              <h3 className="text-xl font-bold text-neutral-900">{c.title}</h3>
              <p className="mt-2 text-neutral-700">{c.blurb}</p>
              <p className="mt-3 text-sm text-neutral-600 italic">{c.forWho}</p>
              <p className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary-600">
                Learn more
                <FiArrowRight />
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Counties served */}
      <section className="bg-white border-y border-neutral-200">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <h2 className="text-2xl font-bold text-neutral-900">
            Counties we cover in Greater Cleveland
          </h2>
          <p className="mt-3 text-neutral-700 max-w-3xl">
            Our Cleveland directory spans the Greater Cleveland MSA plus the Akron combined
            area — the practical commuting and family-visiting radius for most Cleveland
            families.
          </p>
          <ul className="mt-6 flex flex-wrap gap-3">
            {counties.map((county) => (
              <li
                key={county}
                className="px-4 py-2 bg-neutral-100 border border-neutral-200 rounded-lg text-neutral-800 text-sm font-medium"
              >
                {county} County
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Costs section */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-neutral-900">
          What does senior care cost in Cleveland?
        </h2>
        <p className="mt-3 text-neutral-700 max-w-3xl">
          Costs vary a lot by setting, level of care, and the home itself. These are typical
          monthly ranges for the Cleveland market; verify with the home directly and ask
          what’s included versus billed separately.
        </p>
        <div className="mt-8 overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-left">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="px-6 py-3 text-sm font-semibold text-neutral-700">Setting</th>
                <th className="px-6 py-3 text-sm font-semibold text-neutral-700">Typical monthly cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              <tr>
                <td className="px-6 py-4 text-neutral-900 font-medium">Independent living</td>
                <td className="px-6 py-4 text-neutral-700">$2,500 – $4,000</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-neutral-900 font-medium">Assisted living</td>
                <td className="px-6 py-4 text-neutral-700">$3,500 – $6,000</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-neutral-900 font-medium">Memory care</td>
                <td className="px-6 py-4 text-neutral-700">$5,000 – $8,000</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-neutral-900 font-medium">Nursing home (private pay)</td>
                <td className="px-6 py-4 text-neutral-700">$7,500 – $11,000+</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-neutral-600">
          Ranges reflect the Cleveland-Akron market in 2026. Medicaid (for nursing home care)
          and long-term care insurance can offset costs significantly. Ask each home about
          payment options early.
        </p>
      </section>

      {/* How CareLinkAI is different */}
      <section className="bg-white border-y border-neutral-200">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-neutral-900">How CareLinkAI is different</h2>
          <ul className="mt-8 space-y-4">
            {[
              {
                t: 'No broker fees',
                d: 'We don’t charge homes a placement fee, and we don’t take a cut when a family moves in. You contact the home directly.',
              },
              {
                t: 'Local and verified',
                d: 'Listings start from public Ohio Department of Health licensing records and are claimed and verified by the operators themselves.',
              },
              {
                t: 'No call center',
                d: 'A lot of national senior-care sites route families through a sales call before they ever talk to a home. We don’t.',
              },
              {
                t: 'Built in Cleveland',
                d: 'Founder-run from Cleveland, OH. Focused on Greater Cleveland operators and families, not a national footprint.',
              },
            ].map((item) => (
              <li key={item.t} className="flex gap-4">
                <FiCheck className="mt-1 flex-shrink-0 text-success-600" />
                <div>
                  <p className="font-semibold text-neutral-900">{item.t}</p>
                  <p className="text-neutral-700">{item.d}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-neutral-900">Common questions</h2>
        <dl className="mt-8 space-y-8">
          <div>
            <dt className="text-lg font-semibold text-neutral-900">
              How is assisted living different from a nursing home?
            </dt>
            <dd className="mt-2 text-neutral-700">
              Assisted living provides help with daily activities (bathing, dressing,
              medication management) in a residential setting. Nursing homes provide
              skilled medical care 24/7, including IV therapy, wound care, and complex
              medical management. Most seniors don’t need nursing-home-level care.
            </dd>
          </div>
          <div>
            <dt className="text-lg font-semibold text-neutral-900">
              Does Medicare pay for assisted living in Ohio?
            </dt>
            <dd className="mt-2 text-neutral-700">
              No. Medicare covers short-term skilled nursing after a hospital stay, but does
              not cover ongoing assisted living or memory care. Long-term care insurance,
              private pay, VA benefits (for veterans), and Ohio Medicaid (in certain
              circumstances and at certain levels of care) may help offset costs.
            </dd>
          </div>
          <div>
            <dt className="text-lg font-semibold text-neutral-900">
              How do I know a home is well-run?
            </dt>
            <dd className="mt-2 text-neutral-700">
              Look at three things: Ohio Department of Health survey/inspection history
              (publicly available), staff turnover and staff-to-resident ratios (ask
              directly), and direct conversations with current residents and their families.
              Tour at multiple times of day. CareLinkAI listings include licensing details
              from the state where available.
            </dd>
          </div>
          <div>
            <dt className="text-lg font-semibold text-neutral-900">
              What’s the right time to start looking?
            </dt>
            <dd className="mt-2 text-neutral-700">
              Earlier than most families do. The decision is rarely urgent on paper and
              often urgent in real life — a fall, a hospital discharge, a caregiver
              burnout point. Touring homes when there’s no crisis lets you choose,
              not settle.
            </dd>
          </div>
        </dl>
      </section>

      {/* CTA */}
      <section className="bg-primary-600">
        <div className="max-w-5xl mx-auto px-6 py-12 text-center">
          <h2 className="text-3xl font-bold text-white">
            Ready to find the right home?
          </h2>
          <p className="mt-3 text-primary-100 max-w-2xl mx-auto">
            Search Cleveland homes by location, care type, and amenities. Contact homes
            directly — no broker between you and the operator.
          </p>
          <Link
            href="/search"
            className="mt-6 inline-flex items-center gap-2 px-8 py-3 bg-white text-primary-700 rounded-lg font-semibold hover:bg-primary-50"
          >
            Search homes
            <FiArrowRight />
          </Link>
        </div>
      </section>

      <footer className="max-w-5xl mx-auto px-6 py-8 text-sm text-neutral-500">
        Last updated 2026-05-15. CareLinkAI is an independent Cleveland directory. We do
        not provide medical advice; talk with a healthcare professional before making care
        decisions.
      </footer>
    </main>
  );
}
