import type { Metadata } from 'next';
import Link from 'next/link';
import CareTypeListingsSection from '@/components/directory/CareTypeListingsSection';
import FaqSection from '@/components/site/FaqSection';
import { CARE_TYPE_PLAN, loadCareTypeListings } from '@/lib/directory/care-type-listings';
import { careTypeFaqs } from '@/lib/seo/directory-faq';
import { buildBreadcrumbJsonLd } from '@/lib/seo/jsonld';
import { PAGE_META, publicMetadata } from '@/lib/seo/page-meta';
import { BTN_PRIMARY, BTN_SECONDARY, CARD, HERO_BAND } from '@/components/site/brand';
import { FiArrowRight, FiCheck } from 'react-icons/fi';
import { verifyClaimToken } from '@/lib/claim-token';
import { CLEVELAND_AGENCIES } from '@/lib/claim-engine/cohorts';
import AgencyClaimForm from './AgencyClaimForm';

/**
 * Cleveland home-care agency cohort landing (sprint W3 item 2 / sprint 1.6, 2.2).
 *
 * Public, indexable, in the sitemap. Pitch = aides + families: agencies get a
 * verified listing families and discharge planners actually see, and a place
 * to post aide shifts. CTA "Claim your agency listing" → the claim form below,
 * tagged cohort=CLEVELAND_AGENCIES. A cohort claim link (/claim?token=…) lands
 * here with the token so the submit is recorded as a claim-link claim.
 *
 * Rendered per-request only because of the optional ?token= (the page itself
 * is static content). No emails, no drip, no Stripe.
 */

const PAGE_URL = 'https://getcarelinkai.com/cleveland/home-care-agencies';

// OL-172 (d): lists live homes (the nearest real alternative) — rendered per request.
export const dynamic = 'force-dynamic';

// OL-172 (a)(b): title without the suffix (root template adds it), 140–155 char description, OG + Twitter.
export const metadata: Metadata = publicMetadata(PAGE_META.homeCareAgencies);

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Home Care Agencies in Cleveland, OH',
  description:
    'Verified listings for Cleveland home care agencies — in front of families and discharge planners, with a local caregiver pool for open shifts.',
  url: PAGE_URL,
  about: { '@type': 'Thing', name: 'Home care agencies' },
  publisher: {
    '@type': 'Organization',
    name: 'CareLinkAI',
    url: 'https://getcarelinkai.com',
    address: { '@type': 'PostalAddress', addressLocality: 'Cleveland', addressRegion: 'OH', addressCountry: 'US' },
  },
};

type SearchParams = Promise<{ token?: string | string[] }>;

export default async function ClevelandHomeCareAgenciesPage({ searchParams }: { searchParams: SearchParams }) {
  const plan = CARE_TYPE_PLAN['home-care-agencies'];
  const result = await loadCareTypeListings(plan);
  const faqs = careTypeFaqs('home-care-agencies', { label: plan.label, total: result.fallback ? 0 : result.total, acceptingWaiver: result.acceptingWaiver, fallbackNote: result.fallback ? `The nearest real option we list is licensed ${result.fallback.label}, shown on this page.` : null });
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'Cleveland senior care', path: '/cleveland' },
    { name: 'Home care agencies', path: PAGE_META.homeCareAgencies.path },
  ]);
  const sp = (await searchParams) ?? {};
  const rawToken = Array.isArray(sp.token) ? sp.token[0] : sp.token;
  // Only a validly signed CLEVELAND_AGENCIES token is handed to the form;
  // anything else is simply ignored (the page is the same for everyone).
  const payload = rawToken ? verifyClaimToken(rawToken, process.env['NEXTAUTH_SECRET'] || '') : null;
  const token = payload && payload.cohort === CLEVELAND_AGENCIES ? rawToken : undefined;
  const tokenEmail = token ? payload?.operatorEmail : undefined;

  return (
    <div className="bg-neutral-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      {/* Hero */}
      <section className={HERO_BAND} data-testid="brand-hero">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary-500 to-secondary-500" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-16">
          <nav aria-label="Breadcrumb" className="text-sm text-neutral-600">
            <Link href="/cleveland" className="hover:text-primary-600">
              Cleveland senior care
            </Link>
            <span className="mx-2 text-neutral-400">/</span>
            <span className="text-neutral-900 font-medium">Home care agencies</span>
          </nav>
          <p className="mt-4 text-sm font-semibold text-primary-700 uppercase tracking-wide">For Cleveland home care agencies</p>
          <h1 className="mt-3 text-4xl sm:text-5xl font-bold text-neutral-900 leading-tight">
            Home Care Agencies in Cleveland, OH
          </h1>
          <p className="mt-6 text-lg text-neutral-700 max-w-3xl">
            Families and hospital discharge planners come to CareLinkAI to find senior care in
            Greater Cleveland. Most of them need care <em>at home</em> first. Claim your agency
            listing so they find <strong>you</strong> — verified, direct, and free — and tap a
            local pool of aides for the shifts you can’t fill.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#claim"
              className={BTN_PRIMARY}
              data-testid="agency-claim-cta"
            >
              Claim your agency listing
              <FiArrowRight />
            </a>
            <Link
              href="/cleveland"
              className={BTN_SECONDARY}
            >
              See the Cleveland directory
            </Link>
          </div>
        </div>
      </section>

      {/* Two audiences */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-neutral-900">Two problems every Cleveland agency has</h2>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-white rounded-xl border border-neutral-200">
            <p className="text-sm font-semibold text-primary-700 uppercase tracking-wide">Families</p>
            <h3 className="mt-2 text-xl font-bold text-neutral-900">Being found by the right families</h3>
            <p className="mt-3 text-neutral-700">
              National lead sites sell the same family to five agencies and charge you for the
              call. On CareLinkAI a family (or the discharge planner helping them) contacts your
              agency directly — no resold leads, no call-center screen, no placement fee.
            </p>
          </div>
          <div className="p-6 bg-white rounded-xl border border-neutral-200">
            <p className="text-sm font-semibold text-primary-700 uppercase tracking-wide">Aides</p>
            <h3 className="mt-2 text-xl font-bold text-neutral-900">Covering the shifts you can’t staff</h3>
            <p className="mt-3 text-neutral-700">
              STNAs, HHAs and companions in Greater Cleveland use CareLinkAI’s marketplace to find
              work close to home. A claimed agency can post open shifts and reach local
              caregivers without a staffing-agency markup.
            </p>
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="bg-white border-y border-neutral-200">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-neutral-900">What a claimed agency listing includes</h2>
          <ul className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              'A verified agency profile: services, service area, languages, payer sources accepted (private pay, Ohio Medicaid waiver, VA, long-term care insurance).',
              'Direct inquiries from families and discharge planners — delivered to you, never resold.',
              'A “Verified” badge once we have confirmed your Ohio licensure and contact details.',
              'Open-shift posts to the Cleveland caregiver marketplace.',
              'Free to claim and keep. No broker fees. No charge to families.',
              'Founder-run from Cleveland — our automated front desk answers 24/7 and a person calls you back within one business day, not a ticket queue.',
            ].map((line) => (
              <li key={line} className="flex gap-3">
                <FiCheck className="mt-1 flex-shrink-0 text-success-600" />
                <span className="text-neutral-700">{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-neutral-900">How claiming works</h2>
        <ol className="mt-6 space-y-4 max-w-3xl list-decimal list-inside text-neutral-700">
          <li>
            <strong className="text-neutral-900">Submit the claim form below.</strong> Agency name, a
            work email, and the services you offer. Two minutes.
          </li>
          <li>
            <strong className="text-neutral-900">We verify by hand.</strong> We check your Ohio
            licensure and confirm the contact details with you before anything goes live.
          </li>
          <li>
            <strong className="text-neutral-900">Your listing goes live — and you control it.</strong>{' '}
            Update services, service area and open shifts any time.
          </li>
        </ol>
      </section>

      {/* Claim form */}
      <section id="claim" className="bg-white border-y border-neutral-200 scroll-mt-16">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-neutral-900">Claim your agency listing</h2>
          <p className="mt-3 text-neutral-700">
            Free, no obligation. A person from CareLinkAI follows up — we don’t send marketing
            email.
          </p>
          <div className="mt-8">
            <AgencyClaimForm token={token} tokenEmail={tokenEmail} />
          </div>
        </div>
      </section>

      <CareTypeListingsSection path={PAGE_META.homeCareAgencies.path} typeLabel={plan.label} heading="Home care agencies in Greater Cleveland" result={result} />

      {/* Related */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold text-neutral-900">Also on CareLinkAI</h2>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/cleveland/assisted-living" className={`block p-5 ${CARD}`}>
            <p className="font-semibold text-neutral-900">Assisted living →</p>
            <p className="mt-1 text-sm text-neutral-600">When care at home is no longer enough.</p>
          </Link>
          <Link href="/cleveland/memory-care" className={`block p-5 ${CARD}`}>
            <p className="font-semibold text-neutral-900">Memory care →</p>
            <p className="mt-1 text-sm text-neutral-600">Specialized care for dementia.</p>
          </Link>
          <Link href="/marketplace" className={`block p-5 ${CARD}`}>
            <p className="font-semibold text-neutral-900">Caregiver marketplace →</p>
            <p className="mt-1 text-sm text-neutral-600">Local aides, open shifts.</p>
          </Link>
        </div>
      </section>

      <FaqSection faqs={faqs} />

      <div className="max-w-5xl mx-auto px-6 py-8 text-sm text-neutral-500" data-testid="page-note">
        Last updated 2026-10-13. CareLinkAI does not provide care and is not a licensed home
        health agency; listings are verified against public Ohio records and the agency’s own
        confirmation.
      </div>
    </div>
  );
}
