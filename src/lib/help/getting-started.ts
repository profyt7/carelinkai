/**
 * Role-specific "Getting Started" checklists shown on /help.
 *
 * Every href MUST point to a real, role-accessible route. Broken or
 * role-gated targets (e.g. sending a FAMILY user to /discharge-planner) make
 * the help links appear "dead." The companion test
 * `__tests__/help.getting-started.unit.test.ts` asserts each path resolves to
 * an app route so this can't regress.
 */

export interface GettingStartedStep {
  label: string;
  href: string;
}

export interface GettingStartedGuide {
  title: string;
  steps: GettingStartedStep[];
}

export const ROLE_GUIDES: Record<string, GettingStartedGuide> = {
  OPERATOR: {
    title: 'Getting Started as an Operator',
    steps: [
      { label: 'Complete your home profile', href: '/operator/homes' },
      { label: 'Add your first resident', href: '/operator/residents' },
      { label: 'Set up your caregiver roster', href: '/operator/caregivers' },
      { label: 'Create your first open shift', href: '/operator/shifts' },
      { label: 'Review marketplace hires & applications', href: '/marketplace/hires' },
      { label: 'Configure billing & payouts', href: '/settings/payouts/operator' },
    ],
  },
  CAREGIVER: {
    title: 'Getting Started as a Caregiver',
    steps: [
      { label: 'Complete your caregiver profile', href: '/settings/profile' },
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
      { label: 'Browse assisted living homes', href: '/search' },
      { label: 'Browse caregivers', href: '/marketplace' },
      { label: 'Find care with AI matching', href: '/dashboard/find-care' },
      { label: 'Manage residents & care documents', href: '/family/residents' },
      { label: 'Set up emergency contacts', href: '/family/emergency' },
    ],
  },
  PROVIDER: {
    title: 'Getting Started as a Provider',
    steps: [
      { label: 'Complete your provider profile', href: '/settings/provider' },
      { label: 'Add your service offerings', href: '/settings/provider' },
      { label: 'Browse the marketplace', href: '/marketplace' },
      { label: 'Respond to care inquiries', href: '/messages' },
      { label: 'View your public provider listing', href: '/marketplace/providers' },
    ],
  },
  DISCHARGE_PLANNER: {
    title: 'Getting Started as a Discharge Planner',
    steps: [
      { label: 'Open your discharge planner dashboard', href: '/discharge-planner' },
      { label: 'Run an AI placement search', href: '/discharge-planner/search' },
      { label: 'Request a care-team shortlist & track it', href: '/discharge-planner/concierge' },
      { label: 'Review your search history', href: '/discharge-planner/history' },
      { label: 'View placement analytics', href: '/discharge-planner/analytics' },
    ],
  },
  AFFILIATE: {
    title: 'Getting Started as an Affiliate',
    steps: [
      { label: 'Open your affiliate dashboard', href: '/affiliate/dashboard' },
      { label: 'Explore the Education Hub', href: '/learn' },
    ],
  },
};
