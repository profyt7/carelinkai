import type { Metadata } from 'next';
import Link from 'next/link';
import { BTN_PRIMARY, BTN_SECONDARY, CARD, HERO_BAND } from '@/components/site/brand';
import { FiArrowRight, FiCheck } from 'react-icons/fi';
import { SUBURBS, suburbPath } from '@/lib/directory/suburbs';
import FaqSection from '@/components/site/FaqSection';
import { hubFaqs } from '@/lib/seo/directory-faq';
import { buildBreadcrumbJsonLd, buildPagesItemListJsonLd } from '@/lib/seo/jsonld';
import { PAGE_META, publicMetadata } from '@/lib/seo/page-meta';

// OL-159: static content, but re-rendered at least hourly (and on demand via
// POST /api/admin/revalidate) so the footer build sha and shared copy never
// outlive a deploy.
export const revalidate = 3600;

// OL-172 (a)(b): title without the suffix (root template adds it), 140–155 char description, OG + Twitter.
export const metadata: Metadata = publicMetadata(PAGE_META.cleveland);

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

// ItemList of the directory pages under this hub (sprint W3 item 6b).
const directoryItemList = buildPagesItemListJsonLd({
  url: 'https://getcarelinkai.com/cleveland',
  name: 'Senior care directory pages — Greater Cleveland, OH',
  pages: [
    ...careTypes.map((c) => ({ url: `https://getcarelinkai.com${c.href}`, name: `${c.title} in Cleveland, OH` })),
    ...SUBURBS.map((s) => ({ url: `https://getcarelinkai.com${suburbPath(s)}`, name: s.h1 })),
  ],
});

const breadcrumb = buildBreadcrumbJsonLd([
  { name: 'CareLinkAI', path: '/' },
  { name: 'Cleveland senior care', path: '/cleveland' },
]);

export default function ClevelandLandingPage() {
  return (
    <div className="bg-neutral-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(directoryItemList) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      {/* Hero */}
      <section className={HERO_BAND} data-testid="brand-hero">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary-500 to-secondary-500" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <p className="text-sm font-semibold text-primary-700 uppercase tracking-wide">
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
              className={BTN_PRIMARY}
            >
              Search homes
              <FiArrowRight />
            </Link>
            <Link
              href="#care-types"
              className={BTN_SECONDARY}
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
              className={`block p-6 ${CARD}`}
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

      {/* Home care agencies (cohort landing, sprint W3 item 2) */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <Link
          href="/cleveland/home-care-agencies"
          className={`block p-6 ${CARD}`}
        >
          <p className="text-sm font-semibold text-primary-700 uppercase tracking-wide">Care at home</p>
          <h3 className="mt-2 text-xl font-bold text-neutral-900">Home care agencies in Cleveland</h3>
          <p className="mt-2 text-neutral-700">
            Aides and nurses who come to you. Run a Cleveland home care agency? Claim your free
            agency listing.
          </p>
          <p className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary-600">
            Home care agencies
            <FiArrowRight />
          </p>
        </Link>
      </section>

      {/* OL-172 (e): every suburb page, from the registry */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16" data-testid="suburb-grid">
        <h2 className="text-2xl font-bold text-neutral-900">Assisted living by suburb</h2>
        <p className="mt-2 max-w-3xl text-neutral-700">Suburbs where we list at least two licensed homes, each with its own page of homes, inspection facts and local hospitals.</p>
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {SUBURBS.map((s) => (
            <Link key={s.slug} href={suburbPath(s)} className={`block p-4 ${CARD}`}>
              <p className="font-semibold text-neutral-900">{s.name}</p>
              <p className="mt-0.5 text-xs text-neutral-600">{s.county} County</p>
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

      <FaqSection faqs={hubFaqs(SUBURBS.length)} />

      {/* CTA */}
      <section className="bg-gradient-to-r from-primary-600 to-secondary-500">
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

      <div className="max-w-5xl mx-auto px-6 py-8 text-sm text-neutral-500" data-testid="page-note">
        Last updated 2026-05-15. CareLinkAI is an independent Cleveland directory. We do
        not provide medical advice; talk with a healthcare professional before making care
        decisions.
      </div>
    </div>
  );
}
