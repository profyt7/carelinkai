/**
 * Claim cohorts (sprint W3 item 2).
 *
 * A cohort is an outreach segment that gets its own landing page + claim
 * records tagged with the cohort name, so "how many agencies raised their
 * hand?" is one query. The first cohort is Cleveland home-care agencies
 * (sprint items 1.6 / 2.2).
 *
 * A cohort claim link is an ordinary signed claim token
 * (src/lib/claim-token.ts) with `cohort` set and no `homeId`: /claim?token=…
 * routes it to the cohort landing page, and the claim submit there is tagged
 * with the cohort from the token.
 *
 * Edge-safe + dependency-free (shared by pages, API routes and scripts).
 */

export const CLAIM_COHORTS = ['CLEVELAND_AGENCIES'] as const;
export type ClaimCohort = (typeof CLAIM_COHORTS)[number];

export const CLEVELAND_AGENCIES: ClaimCohort = 'CLEVELAND_AGENCIES';

export function isClaimCohort(value: unknown): value is ClaimCohort {
  return typeof value === 'string' && (CLAIM_COHORTS as readonly string[]).includes(value);
}

/** Public landing page that carries the claim form for a cohort. */
export const COHORT_LANDING_PATH: Record<ClaimCohort, string> = {
  CLEVELAND_AGENCIES: '/cleveland/home-care-agencies',
};

/** Service types an agency can tick on the claim form (stored verbatim). */
export const AGENCY_SERVICE_TYPES = [
  'Home health aides (HHA / STNA)',
  'Personal care / companionship',
  'Skilled nursing at home',
  'Respite care',
  'Live-in care',
  'Hospice support',
  'Ohio Medicaid waiver (PASSPORT / MyCare)',
  'VA home care programs',
] as const;

export const CLAIM_REQUEST_SOURCES = ['landing_page', 'claim_link'] as const;
export type ClaimRequestSource = (typeof CLAIM_REQUEST_SOURCES)[number];
