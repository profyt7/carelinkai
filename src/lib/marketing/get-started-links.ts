/**
 * OL-248 h — the homepage "Get started on your own" panel's role links. Each target is a real route,
 * checked against the app and current flags (see __tests__/get-started-panel.unit.test.tsx):
 *
 *  - Families → /search (public search; no account needed).
 *  - Care homes → /cleveland/assisted-living. There is no self-serve claim page without an emailed claim
 *    link (/claim needs a signed token); the real claim entry is "Claim this listing" on each unclaimed
 *    listing, so the panel sends care homes to the directory to find their own community.
 *  - Discharge planners → /discharge-planner/concierge (the in-app referral form; a logged-out visitor is
 *    sent to log in or sign up and comes back to it).
 *  - Caregivers → /auth/register?role=caregiver. Open shifts need a caregiver account
 *    (/api/shifts/open is auth-only) and live inventory can't be confirmed from the code, so the label is
 *    "Explore caregiver opportunities", not "Browse open shifts".
 *  - Providers → /auth/register?role=provider, only when PROVIDER_LISTING_ENABLED is on.
 */

export type GetStartedLink = { key: string; audience: string; label: string; href: string; hint?: string };

export function getStartedLinks(flags: { providerListingOn: boolean }): GetStartedLink[] {
  const links: GetStartedLink[] = [
    { key: 'families', audience: 'Families', label: 'Find care near you', href: '/search' },
    { key: 'care-homes', audience: 'Care homes', label: 'Claim your free listing', href: '/cleveland/assisted-living', hint: 'Find your community, then choose “Claim this listing.”' },
    { key: 'discharge-planners', audience: 'Discharge planners', label: 'Send a referral', href: '/discharge-planner/concierge' },
    { key: 'caregivers', audience: 'Caregivers', label: 'Explore caregiver opportunities', href: '/auth/register?role=caregiver' },
  ];
  if (flags.providerListingOn) links.push({ key: 'providers', audience: 'Providers', label: 'List your services free', href: '/auth/register?role=provider' });
  return links;
}

export const GET_STARTED_ANCHOR = 'get-started';
