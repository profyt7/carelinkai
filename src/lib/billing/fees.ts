/**
 * The one place fee amounts are read from env (OL-187). Read at call time so a
 * changed env applies without a code change; a missing, non-numeric or
 * negative value falls back to the coded default.
 */

/** Marketplace hire access fee for operators without an included-hires plan. Default $99. */
export const DEFAULT_MARKETPLACE_HIRE_FEE_CENTS = 9900;

/**
 * Placement fee queued on Convert (FEE_ELIGIBLE lane only, behind
 * PLACEMENT_FEE_ENABLED). Default $2,500; the founder sets the real value.
 */
export const DEFAULT_PLACEMENT_FEE_CENTS = 250000;

/** Featured listing, one 30-day window (OL-190). Default $79. */
export const DEFAULT_FEATURED_LISTING_FEE_CENTS = 7900;

function centsFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const n = Number(raw.trim());
  return Number.isInteger(n) && n >= 0 ? n : fallback;
}

export function marketplaceHireFeeCents(): number {
  return centsFromEnv('MARKETPLACE_HIRE_FEE_CENTS', DEFAULT_MARKETPLACE_HIRE_FEE_CENTS);
}

export function placementFeeCents(): number {
  return centsFromEnv('PLACEMENT_FEE_CENTS', DEFAULT_PLACEMENT_FEE_CENTS);
}

export function featuredListingFeeCents(): number {
  return centsFromEnv('FEATURED_LISTING_FEE_CENTS', DEFAULT_FEATURED_LISTING_FEE_CENTS);
}
