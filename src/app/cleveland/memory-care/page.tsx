import type { Metadata } from 'next';
import Link from 'next/link';
import { FiArrowRight, FiCheck } from 'react-icons/fi';

export const metadata: Metadata = {
  title: 'Memory Care in Cleveland, OH | CareLinkAI',
  description:
    'Memory care for Alzheimer’s and dementia in Greater Cleveland. What memory care covers, costs, what to look for. No broker fees.',
  alternates: { canonical: 'https://getcarelinkai.com/cleveland/memory-care' },
  openGraph: {
    title: 'Memory Care in Cleveland, OH | CareLinkAI',
    description:
      'Local guide to memory care in Cleveland — dementia-specific care, costs, and what to look for.',
    type: 'website',
    url: 'https://getcarelinkai.com/cleveland/memory-care',
    siteName: 'CareLinkAI',
  },
};

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Memory Care in Cleveland, OH',
  description:
    'Guide to memory care in Greater Cleveland — for families navigating Alzheimer’s and other forms of dementia.',
  url: 'https://getcarelinkai.com/cleveland/memory-care',
  about: { '@type': 'Thing', name: 'Memory Care' },
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

export default function ClevelandMemoryCarePage() {
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
            <span className="text-neutral-900 font-medium">Memory care</span>
          </nav>
          <h1 className="mt-4 text-4xl sm:text-5xl font-bold text-neutral-900 leading-tight">
            Memory Care in Cleveland, OH
          </h1>
          <p className="mt-6 text-lg text-neutral-700 max-w-3xl">
            Memory care is specialized assisted living for residents with Alzheimer’s or
            another form of dementia. Communities are designed for safety, staffed by
            people trained in dementia-specific care, and built around routines that work
            with — not against — how memory loss progresses.
          </p>
          <div className="mt-8">
            <Link
              href="/search?careLevel=MEMORY_CARE"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700"
            >
              Browse Cleveland memory care homes
              <FiArrowRight />
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-neutral-900">
          Signs it’s time to consider memory care
        </h2>
        <p className="mt-3 text-neutral-700 max-w-3xl">
          The decision usually arrives gradually, then suddenly. A few things that often
          tip the scales:
        </p>
        <ul className="mt-6 space-y-3 max-w-3xl">
          {[
            'Wandering or getting lost — even within familiar places.',
            'Becoming agitated, fearful, or aggressive in ways that are out of character.',
            'Forgetting to eat, drink, or take medications, with weight loss or hospitalizations.',
            'Sundowning — late-day confusion that disrupts sleep for the whole household.',
            'A primary caregiver who is exhausted, isolated, or both.',
            'Safety incidents: a fall, a stove left on, a fender-bender.',
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
            What memory care provides that assisted living usually doesn’t
          </h2>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                t: 'Secured environment',
                d: 'Coded doors, enclosed outdoor space, alarms — designed so a wandering resident can move freely without becoming unsafe.',
              },
              {
                t: 'Dementia-trained staff',
                d: 'Staff trained specifically in dementia behaviors, redirection techniques, and non-pharmacological approaches first.',
              },
              {
                t: 'Lower staff-to-resident ratios',
                d: 'Memory care typically staffs more heavily than general assisted living, because residents need more frequent prompts and supervision.',
              },
              {
                t: 'Structured routines',
                d: 'Predictable daily schedules reduce anxiety. Activities are tailored to cognitive level — not the same program as a general AL community.',
              },
              {
                t: 'Behavior-aware design',
                d: 'Clear sight lines, calming colors, memory boxes outside each room, dining rooms sized for less stimulation. Small things matter.',
              },
              {
                t: 'Family communication tooling',
                d: 'Good memory care communities check in with families regularly. Ask how — and how often — they reach out when something changes.',
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
        <h2 className="text-3xl font-bold text-neutral-900">
          Cost of memory care in Cleveland
        </h2>
        <p className="mt-3 text-neutral-700 max-w-3xl">
          Memory care in Greater Cleveland typically runs <strong>$5,000–$8,000 per
          month</strong> — roughly $1,000–$2,000 above comparable assisted living, due to
          the higher staffing and specialized environment. Medicare does not cover it.
          Long-term care insurance often does, with documentation of cognitive impairment.
          Ohio Medicaid waiver programs can apply in narrow circumstances; ask each home
          whether they accept waiver funding.
        </p>
      </section>

      <section className="bg-white border-y border-neutral-200">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-neutral-900">
            Questions worth asking on a tour
          </h2>
          <ol className="mt-6 space-y-4 max-w-3xl list-decimal list-inside text-neutral-700">
            <li>
              <strong className="text-neutral-900">What dementia-specific training does staff complete, and how often is it refreshed?</strong>{' '}
              State minimums are a floor, not a goal.
            </li>
            <li>
              <strong className="text-neutral-900">What’s your approach when a resident is agitated?</strong>{' '}
              Listen for non-pharmacological strategies first — redirection, environment,
              activity, food. Medication-first is a yellow flag.
            </li>
            <li>
              <strong className="text-neutral-900">How do you handle wandering?</strong>{' '}
              You want a clear, calm, specific answer — not vague reassurance.
            </li>
            <li>
              <strong className="text-neutral-900">What happens as my parent declines?</strong>{' '}
              Can the home support late-stage dementia, or is there a transfer point?
            </li>
            <li>
              <strong className="text-neutral-900">May I observe an activity?</strong>{' '}
              Watch how staff interact with residents. The texture of those interactions
              tells you everything.
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

      <section className="bg-primary-600">
        <div className="max-w-5xl mx-auto px-6 py-12 text-center">
          <h2 className="text-3xl font-bold text-white">Find memory care in Cleveland</h2>
          <p className="mt-3 text-primary-100 max-w-2xl mx-auto">
            Search by neighborhood, size, and care level. Contact homes directly.
          </p>
          <Link
            href="/search?careLevel=MEMORY_CARE"
            className="mt-6 inline-flex items-center gap-2 px-8 py-3 bg-white text-primary-700 rounded-lg font-semibold hover:bg-primary-50"
          >
            See memory care homes
            <FiArrowRight />
          </Link>
        </div>
      </section>

      <footer className="max-w-5xl mx-auto px-6 py-8 text-sm text-neutral-500">
        Last updated 2026-05-15. Not medical advice. A dementia diagnosis should be made
        and managed by a qualified healthcare professional.
      </footer>
    </main>
  );
}
