'use client';

import React from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { FiMail, FiBook, FiHelpCircle, FiVideo, FiFileText, FiChevronDown, FiChevronUp, FiCheckCircle, FiArrowRight } from 'react-icons/fi';
import { ROLE_GUIDES } from '@/lib/help/getting-started';
import ProductTour from '@/components/marketing/ProductTour';
import TourVideo from '@/components/marketing/TourVideo';
import { CHAPTER_HELP_ANCHOR, type Tour, type TourVideo as TourVideoData } from '@/lib/marketing/product-tour-data';
import { usePaidFeature } from '@/hooks/usePaidFeatures';

/** Role sections the tour's chapter chips link to (ids = CHAPTER_HELP_ANCHOR values). */
const ROLE_SECTIONS: { id: string; role: string; label: string }[] = [
  { id: 'help-family', role: 'FAMILY', label: 'For families' },
  { id: 'help-discharge-planner', role: 'DISCHARGE_PLANNER', label: 'For discharge planners' },
  { id: 'help-operator', role: 'OPERATOR', label: 'For care homes' },
  { id: 'help-caregiver', role: 'CAREGIVER', label: 'For caregivers' },
  { id: 'help-provider', role: 'PROVIDER', label: 'For providers' },
];
// Steps that lead to a flag-off feature stay hidden (the page behind them says "not available yet").
const BACKGROUND_CHECK_HREF = '/caregiver/verification';

const FAQS = [
  {
    q: 'How do I add a new resident?',
    a: 'Navigate to Residents in the sidebar and click "Add Resident." Fill in the required fields and click Save. The resident will appear in your roster immediately.',
  },
  {
    q: 'How do I manage caregiver assignments?',
    a: 'Go to Caregivers, open a caregiver profile, and use the Assignments tab to add, edit, or remove shift assignments.',
  },
  {
    q: 'How do I track certifications and compliance?',
    a: 'Each caregiver and resident profile has a Certifications/Compliance tab where you can upload documents, set expiry dates, and receive automatic reminders.',
  },
  {
    q: 'Can I export data to CSV or PDF?',
    a: 'Yes. Go to Reports in the sidebar, choose a template, click Generate, and select your preferred format (PDF, Excel, or CSV).',
  },
  {
    q: 'How do I reset my password?',
    a: 'Click your profile avatar in the top right, go to Settings → Security, and use the Change Password form.',
  },
  {
    q: 'How does the AI inquiry response work?',
    a: 'When a new inquiry arrives, the AI drafts a response based on your home profile. You can review and edit it before sending, or configure auto-send in Settings.',
  },
  {
    q: 'How do caregivers get verified with a background check?',
    a: 'Caregivers can go to their dashboard and click "Get Verified" to start a background check. Families can also order checks from a caregiver\'s marketplace profile.',
  },
  {
    q: 'Where can I find the education hub?',
    a: 'The Education Hub is linked in your sidebar under the main nav. It has 15+ guides on senior care placement, caregiving, and using CareLinkAI.',
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="border-b border-neutral-100 last:border-0">
      <button
        className="flex w-full items-center justify-between py-4 text-left text-sm font-medium text-neutral-900 hover:text-primary-600"
        onClick={() => setOpen(!open)}
      >
        {q}
        {open ? <FiChevronUp className="shrink-0 text-neutral-500" /> : <FiChevronDown className="shrink-0 text-neutral-500" />}
      </button>
      {open && <p className="pb-4 text-sm text-neutral-600">{a}</p>}
    </div>
  );
}

export default function HelpPageClient({ tour = null, tourVideo = null }: { tour?: Tour | null; tourVideo?: TourVideoData | null }) {
  const { data: session } = useSession();
  const { enabled: bgChecksOn } = usePaidFeature('BACKGROUND_CHECKS');
  const visibleSteps = (steps: { label: string; href: string }[]) => steps.filter((st) => bgChecksOn || st.href !== BACKGROUND_CHECK_HREF);
  const role = (session?.user as any)?.role as string | undefined;
  const guide = role ? ROLE_GUIDES[role] : null;
  const ownSectionRole = ROLE_SECTIONS.some((r) => r.role === role) ? role : null;

  return (
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <FiHelpCircle className="mx-auto h-14 w-14 text-primary-600 mb-4" />
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Help & Support</h1>
          <p className="text-neutral-600">Find answers fast or reach the team directly.</p>
        </div>

        {/* Start here: the narrated video, then the slide tour; its chapter chips jump to that role's section below. */}
        {(tour || tourVideo) && (
          <section id="start-here" className="mb-10 space-y-5" aria-labelledby="start-here-title">
            <h2 id="start-here-title" className="text-lg font-semibold text-neutral-900">Start here</h2>
            {tourVideo && (
              <div className="rounded-xl overflow-hidden shadow-lg border border-neutral-200">
                <TourVideo video={tourVideo} />
              </div>
            )}
            <ProductTour tour={tour} chapterHref={(c) => (CHAPTER_HELP_ANCHOR[c] ? `#${CHAPTER_HELP_ANCHOR[c]}` : undefined)} />
          </section>
        )}

        {/* Contact cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          <a
            href="mailto:support@getcarelinkai.com"
            className="flex items-start gap-4 rounded-xl border border-neutral-200 bg-white p-5 hover:border-primary-400 hover:shadow-sm transition-all"
          >
            <div className="rounded-lg bg-primary-50 p-2.5">
              <FiMail className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">Email Support</h3>
              <p className="text-sm text-neutral-500 mt-0.5">Response within 24 hours</p>
              <p className="text-sm text-primary-600 font-medium mt-1">support@getcarelinkai.com</p>
            </div>
          </a>

          <a
            href="mailto:support@getcarelinkai.com?subject=Onboarding Support"
            className="flex items-start gap-4 rounded-xl border border-neutral-200 bg-white p-5 hover:border-primary-400 hover:shadow-sm transition-all"
          >
            <div className="rounded-lg bg-success-50 p-2.5">
              <FiCheckCircle className="h-5 w-5 text-success-600" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">Onboarding Support</h3>
              <p className="text-sm text-neutral-500 mt-0.5">Getting started? We'll walk you through it</p>
              <p className="text-sm text-success-600 font-medium mt-1">Email us →</p>
            </div>
          </a>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          <Link
            href="/learn"
            className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 hover:border-primary-400 hover:bg-primary-50 transition-all"
          >
            <FiBook className="h-5 w-5 text-primary-600 shrink-0" />
            <div>
              <p className="font-medium text-neutral-900">Education Hub</p>
              <p className="text-xs text-neutral-500">15+ guides on senior care</p>
            </div>
          </Link>

          <Link
            href="/#get-started"
            className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 hover:border-primary-400 hover:bg-primary-50 transition-all"
          >
            <FiVideo className="h-5 w-5 text-secondary-600 shrink-0" />
            <div>
              <p className="font-medium text-neutral-900">Get started on your own</p>
              <p className="text-xs text-neutral-500">Watch the 90-second tour, then jump to your role</p>
            </div>
          </Link>

          <a
            href="mailto:hello@getcarelinkai.com?subject=Feature Request"
            className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 hover:border-primary-400 hover:bg-primary-50 transition-all"
          >
            <FiFileText className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-medium text-neutral-900">Feature Requests</p>
              <p className="text-xs text-neutral-500">Tell us what you need</p>
            </div>
          </a>

          <a
            href="mailto:hello@getcarelinkai.com?subject=Bug Report"
            className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 hover:border-primary-400 hover:bg-primary-50 transition-all"
          >
            <FiHelpCircle className="h-5 w-5 text-error-600 shrink-0" />
            <div>
              <p className="font-medium text-neutral-900">Report a Bug</p>
              <p className="text-xs text-neutral-500">Found something broken?</p>
            </div>
          </a>
        </div>

        {/* A logged-in role without its own section below (e.g. affiliate) keeps its guide here. */}
        {guide && !ownSectionRole && (
          <div className="rounded-xl border border-primary-200 bg-primary-50 p-6 mb-10">
            <h2 className="text-lg font-semibold text-primary-900 mb-4">{guide.title}</h2>
            <ol className="space-y-3">
              {visibleSteps(guide.steps).map((step, i) => (
                <li key={step.href + i} className="flex items-center gap-3">
                  <span className="h-6 w-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                  <Link href={step.href} className="text-sm text-primary-800 hover:text-primary-600 font-medium flex items-center gap-1 group">
                    {step.label}
                    <FiArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Guides by role. Only your own role's steps are links: the others are role-gated pages. */}
        <div className="space-y-4 mb-10" data-testid="help-role-sections">
          {ROLE_SECTIONS.map(({ id, role: r, label }) => {
            const g = ROLE_GUIDES[r];
            if (!g) return null;
            const own = r === role;
            return (
              <section key={id} id={id} className={`scroll-mt-24 rounded-xl border p-6 ${own ? 'border-primary-200 bg-primary-50' : 'border-neutral-200 bg-white'}`}>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className={`text-lg font-semibold ${own ? 'text-primary-900' : 'text-neutral-900'}`}>{label}</h2>
                  {own && <span className="rounded-full bg-primary-600 px-2 py-0.5 text-xs font-semibold text-white">Your role</span>}
                </div>
                <ol className="space-y-3">
                  {visibleSteps(g.steps).map((step, i) => (
                    <li key={step.href + i} className="flex items-center gap-3">
                      <span className={`h-6 w-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${own ? 'bg-primary-100 text-primary-700' : 'bg-neutral-100 text-neutral-600'}`}>{i + 1}</span>
                      {own ? (
                        <Link href={step.href} className="text-sm text-primary-800 hover:text-primary-600 font-medium flex items-center gap-1 group">
                          {step.label}
                          <FiArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      ) : (
                        <span className="text-sm text-neutral-700">{step.label}</span>
                      )}
                    </li>
                  ))}
                </ol>
              </section>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Frequently Asked Questions</h2>
          <div>
            {FAQS.map((item) => (
              <FAQItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-neutral-400">
          Still stuck? Email us at{' '}
          <a href="mailto:support@getcarelinkai.com" className="text-primary-600 hover:underline">
            support@getcarelinkai.com
          </a>{' '}
          and we'll get back to you within one business day.
        </p>
      </div>
  );
}
