'use client';

import React from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { FiMail, FiBook, FiHelpCircle, FiVideo, FiFileText, FiChevronDown, FiChevronUp, FiCheckCircle, FiArrowRight } from 'react-icons/fi';
import DashboardLayout from '@/components/layout/DashboardLayout';

const ROLE_GUIDES: Record<string, { title: string; steps: Array<{ label: string; href: string }> }> = {
  OPERATOR: {
    title: 'Getting Started as an Operator',
    steps: [
      { label: 'Complete your home profile', href: '/operator/homes' },
      { label: 'Add your first resident', href: '/operator/residents' },
      { label: 'Set up your caregiver roster', href: '/operator/caregivers' },
      { label: 'Create your first open shift', href: '/operator/shifts' },
      { label: 'Review marketplace applications', href: '/marketplace/listings' },
      { label: 'Configure billing & payouts', href: '/settings/payouts/operator' },
    ],
  },
  CAREGIVER: {
    title: 'Getting Started as a Caregiver',
    steps: [
      { label: 'Complete your caregiver profile', href: '/settings/aide' },
      { label: 'Upload your certifications', href: '/settings/credentials' },
      { label: 'Get background verified', href: '/caregiver/verification' },
      { label: 'Browse open job listings', href: '/marketplace?tab=jobs' },
      { label: 'Apply for your first position', href: '/marketplace?tab=jobs' },
      { label: 'Check your applications status', href: '/caregiver/applications' },
    ],
  },
  FAMILY: {
    title: 'Getting Started as a Family Member',
    steps: [
      { label: 'Set up your family profile', href: '/settings/family' },
      { label: 'Browse assisted living homes', href: '/discharge-planner' },
      { label: 'Browse caregivers', href: '/marketplace/aides' },
      { label: 'Submit a care inquiry', href: '/marketplace/aides' },
      { label: 'Upload care documents', href: '/family' },
      { label: 'Set up emergency contacts', href: '/family' },
    ],
  },
  PROVIDER: {
    title: 'Getting Started as a Provider',
    steps: [
      { label: 'Complete your provider profile', href: '/settings/provider' },
      { label: 'Add your service offerings', href: '/settings/provider' },
      { label: 'Browse families and operators', href: '/marketplace?tab=providers' },
      { label: 'Respond to care inquiries', href: '/messages' },
      { label: 'View your reviews', href: '/marketplace/providers' },
    ],
  },
};

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

export default function HelpPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const guide = role ? ROLE_GUIDES[role] : null;

  return (
    <DashboardLayout title="Help & Support" showSearch={false}>
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <FiHelpCircle className="mx-auto h-14 w-14 text-primary-600 mb-4" />
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Help & Support</h1>
          <p className="text-neutral-600">Find answers fast or reach the team directly.</p>
        </div>

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
            href="/?demo=1#request-demo"
            className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 hover:border-primary-400 hover:bg-primary-50 transition-all"
          >
            <FiVideo className="h-5 w-5 text-secondary-600 shrink-0" />
            <div>
              <p className="font-medium text-neutral-900">Watch Demo</p>
              <p className="text-xs text-neutral-500">See all features in action</p>
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

        {/* Step-by-step guide for logged-in role */}
        {guide && (
          <div className="rounded-xl border border-primary-200 bg-primary-50 p-6 mb-10">
            <h2 className="text-lg font-semibold text-primary-900 mb-4">{guide.title}</h2>
            <ol className="space-y-3">
              {guide.steps.map((step, i) => (
                <li key={step.href + i} className="flex items-center gap-3">
                  <span className="h-6 w-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <Link
                    href={step.href}
                    className="text-sm text-primary-800 hover:text-primary-600 font-medium flex items-center gap-1 group"
                  >
                    {step.label}
                    <FiArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        )}

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
    </DashboardLayout>
  );
}
