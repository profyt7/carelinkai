import type { Metadata } from 'next';
import Link from 'next/link';
import { FiArrowRight, FiCheck } from 'react-icons/fi';

export const metadata: Metadata = {
  title: 'Nursing Homes in Cleveland, OH | CareLinkAI',
  description:
    'Nursing homes in Greater Cleveland with skilled medical care. What nursing homes cover, costs, Medicaid in Ohio, and what to look for.',
  alternates: { canonical: 'https://getcarelinkai.com/cleveland/nursing-homes' },
  openGraph: {
    title: 'Nursing Homes in Cleveland, OH | CareLinkAI',
    description:
      'Skilled nursing facilities in Greater Cleveland — when nursing home care is right, costs, and how to choose.',
    type: 'website',
    url: 'https://getcarelinkai.com/cleveland/nursing-homes',
    siteName: 'CareLinkAI',
  },
};

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Nursing Homes in Cleveland, OH',
  description:
    'Guide to nursing homes (skilled nursing facilities) in Greater Cleveland — when they are the right setting, what they cover, and how to choose.',
  url: 'https://getcarelinkai.com/cleveland/nursing-homes',
  about: { '@type': 'Thing', name: 'Nursing Home' },
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

export default function ClevelandNursingHomesPage() {
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
            <span className="text-neutral-900 font-medium">Nursing homes</span>
          </nav>
          <h1 className="mt-4 text-4xl sm:text-5xl font-bold text-neutral-900 leading-tight">
            Nursing Homes in Cleveland, OH
          </h1>
          <p className="mt-6 text-lg text-neutral-700 max-w-3xl">
            A nursing home — formally a <strong>skilled nursing facility</strong> — provides
            24-hour medical care for residents with significant medical needs. They’re not
            an upgrade from assisted living; they’re a different category, with licensed
            nurses on every shift and physician oversight.
          </p>
          <div className="mt-8">
            <Link
              href="/search?careLevel=SKILLED_NURSING"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700"
            >
              Browse Cleveland nursing homes
              <FiArrowRight />
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-neutral-900">
          When a nursing home is the right setting
        </h2>
        <p className="mt-3 text-neutral-700 max-w-3xl">
          Most seniors never need nursing-home-level care, and the families who do reach
          this point often arrive via a hospitalization rather than a planned decision.
          Common situations where skilled nursing is appropriate:
        </p>
        <ul className="mt-6 space-y-3 max-w-3xl">
          {[
            'Short-term rehabilitation after a hospital stay (stroke, hip replacement, cardiac event).',
            'Ongoing complex medical needs — feeding tubes, wound care, IV therapy, ventilator support.',
            'Late-stage dementia paired with significant medical complications.',
            'A long-term-care decision where assisted living and memory care can’t meet the medical needs anymore.',
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
          <h2 className="text-3xl font-bold text-neutral-900">
            What a nursing home provides
          </h2>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                t: '24/7 licensed nursing',
                d: 'RNs and LPNs on every shift, with nursing aides delivering hands-on care.',
              },
              {
                t: 'Physician oversight',
                d: 'A medical director on staff and a primary attending physician for each resident.',
              },
              {
                t: 'Rehabilitation services',
                d: 'PT, OT, and speech therapy — usually on-site daily. The main path home after a hospital stay.',
              },
              {
                t: 'Complex care',
                d: 'Wound management, IV therapy, ventilator and tracheostomy care, hospice services, end-of-life support.',
              },
              {
                t: 'Medication administration by nurses',
                d: 'Not assistance — administration. A different regulatory category from assisted living.',
              },
              {
                t: 'Three meals plus snacks',
                d: 'With dietary management — diabetic, renal, dysphagia-modified, etc.',
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

      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-neutral-900">Cost and Medicaid in Ohio</h2>
        <p className="mt-3 text-neutral-700 max-w-3xl">
          Private-pay nursing home rates in Greater Cleveland typically run{' '}
          <strong>$7,500–$11,000+ per month</strong>. Three things pay for that:
        </p>
        <ul className="mt-4 space-y-3 max-w-3xl">
          <li className="flex gap-3">
            <FiCheck className="mt-1 flex-shrink-0 text-success-600" />
            <span className="text-neutral-700">
              <strong className="text-neutral-900">Medicare</strong> covers short-term
              skilled nursing — up to 100 days after a qualifying hospital stay (with
              copays starting day 21). It does not cover long-term residence.
            </span>
          </li>
          <li className="flex gap-3">
            <FiCheck className="mt-1 flex-shrink-0 text-success-600" />
            <span className="text-neutral-700">
              <strong className="text-neutral-900">Long-term care insurance</strong> can
              cover daily rates up to policy limits, with documentation of need.
            </span>
          </li>
          <li className="flex gap-3">
            <FiCheck className="mt-1 flex-shrink-0 text-success-600" />
            <span className="text-neutral-700">
              <strong className="text-neutral-900">Ohio Medicaid</strong> covers long-term
              nursing-home care for residents who meet income and asset criteria. Most
              long-term residents in Ohio nursing homes are on Medicaid eventually. The
              spend-down rules and look-back period are complex; an Ohio elder-law
              attorney is worth the consultation.
            </span>
          </li>
        </ul>
      </section>

      <section className="bg-white border-y border-neutral-200">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-neutral-900">How to evaluate a nursing home</h2>
          <ol className="mt-6 space-y-4 max-w-3xl list-decimal list-inside text-neutral-700">
            <li>
              <strong className="text-neutral-900">Medicare Care Compare ratings.</strong>{' '}
              Every CMS-certified nursing home gets a star rating across health
              inspections, staffing, and quality measures. Useful, but not the whole story.
            </li>
            <li>
              <strong className="text-neutral-900">Read the most recent state survey.</strong>{' '}
              Ohio Department of Health surveys nursing homes annually and publishes the
              deficiency reports. Read them. Citations and the home’s response tell you a lot.
            </li>
            <li>
              <strong className="text-neutral-900">Ask about staffing levels per shift.</strong>{' '}
              Especially nights and weekends. CMS payroll-based staffing data shows the
              actual numbers — compare to the home’s answer.
            </li>
            <li>
              <strong className="text-neutral-900">Tour, then tour again unannounced.</strong>{' '}
              Smell the hallways. Look at residents — are they engaged or parked?
            </li>
            <li>
              <strong className="text-neutral-900">Ask about Medicaid acceptance and bed availability.</strong>{' '}
              Some homes accept Medicaid only after a private-pay period. Know the policy
              before you move in.
            </li>
          </ol>
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
            href="/cleveland/independent-living"
            className="block p-5 bg-white border border-neutral-200 rounded-xl hover:border-primary-400 hover:shadow-md transition"
          >
            <p className="font-semibold text-neutral-900">Independent living →</p>
            <p className="mt-1 text-sm text-neutral-600">For active seniors who don’t need daily help.</p>
          </Link>
        </div>
      </section>

      <section className="bg-primary-600">
        <div className="max-w-5xl mx-auto px-6 py-12 text-center">
          <h2 className="text-3xl font-bold text-white">Find a nursing home in Cleveland</h2>
          <p className="mt-3 text-primary-100 max-w-2xl mx-auto">
            Browse Cleveland skilled nursing facilities. Compare ratings, location, and
            Medicaid acceptance.
          </p>
          <Link
            href="/search?careLevel=SKILLED_NURSING"
            className="mt-6 inline-flex items-center gap-2 px-8 py-3 bg-white text-primary-700 rounded-lg font-semibold hover:bg-primary-50"
          >
            See nursing homes
            <FiArrowRight />
          </Link>
        </div>
      </section>

      <footer className="max-w-5xl mx-auto px-6 py-8 text-sm text-neutral-500">
        Last updated 2026-05-15. Not medical or legal advice. Medicaid eligibility,
        spend-down rules, and look-back periods are complex; consult an Ohio elder-law
        attorney for your specific situation.
      </footer>
    </main>
  );
}
