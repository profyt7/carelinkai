/**
 * OL-172 (d) — the listings a care-type hub shows. Each hub asks for its own
 * care level; when the directory has no verified home of that type it shows
 * the nearest real alternative and SAYS SO — never placeholder homes.
 */

import type { CareLevel } from '@prisma/client';
import { countPublicListings, fetchPublicListings, type PublicListing } from '@/lib/directory/public-listings';
import type { CareTypeKey } from '@/lib/seo/directory-faq';

export type CareTypePlan = {
  /** What the hub is about, e.g. "memory care". */
  label: string;
  /** Care level that matches the hub; null = no home-based data exists for this type. */
  level: CareLevel | null;
  /** Nearest real alternatives, tried in order when `level` has no listings. */
  fallbacks: ReadonlyArray<{ level: CareLevel; label: string; why: string }>;
};

export const CARE_TYPE_PLAN: Record<Exclude<CareTypeKey, 'assisted-living'>, CareTypePlan> = {
  'memory-care': {
    label: 'memory care',
    level: 'MEMORY_CARE',
    fallbacks: [{ level: 'ASSISTED', label: 'assisted living', why: 'Ask each home whether it has a secure memory care unit or accepts residents with early dementia.' }],
  },
  'independent-living': {
    label: 'independent living',
    level: 'INDEPENDENT',
    fallbacks: [{ level: 'ASSISTED', label: 'assisted living', why: 'Many of these communities also rent apartments without care services — ask each one.' }],
  },
  'nursing-homes': {
    label: 'skilled nursing',
    level: 'SKILLED_NURSING',
    fallbacks: [
      { level: 'MEMORY_CARE', label: 'memory care', why: 'Nursing homes are licensed separately in Ohio; Medicare’s Care Compare lists every Medicare-certified nursing home with its federal inspection results.' },
      { level: 'ASSISTED', label: 'assisted living', why: 'Nursing homes are licensed separately in Ohio; Medicare’s Care Compare lists every Medicare-certified nursing home with its federal inspection results.' },
    ],
  },
  'home-care-agencies': {
    label: 'home care',
    level: null,
    fallbacks: [{ level: 'ASSISTED', label: 'assisted living', why: 'If staying at home is no longer safe, these licensed residential care homes are the nearest setting we can list with verified data.' }],
  },
};

export type CareTypeListingsResult = {
  listings: PublicListing[];
  total: number;
  acceptingWaiver: number;
  /** Label of what is actually shown (the hub's type, or the fallback's). */
  shownLabel: string;
  /** Set when the hub's own type had no listings and a fallback is shown. */
  fallback: { label: string; why: string } | null;
};

export async function loadCareTypeListings(plan: CareTypePlan, take = 12): Promise<CareTypeListingsResult> {
  const tryLevel = async (level: CareLevel) => {
    const [total, acceptingWaiver] = await Promise.all([
      countPublicListings({ careLevel: level }).catch(() => 0),
      countPublicListings({ careLevel: level, medicaidWaiver: true }).catch(() => 0),
    ]);
    const listings = total > 0 ? await fetchPublicListings({ careLevel: level, take }).catch(() => []) : [];
    return { total, acceptingWaiver, listings };
  };
  if (plan.level) {
    const own = await tryLevel(plan.level);
    if (own.total > 0) return { ...own, shownLabel: plan.label, fallback: null };
  }
  for (const f of plan.fallbacks) {
    const alt = await tryLevel(f.level);
    if (alt.total > 0) return { ...alt, shownLabel: f.label, fallback: { label: f.label, why: f.why } };
  }
  return { listings: [], total: 0, acceptingWaiver: 0, shownLabel: plan.label, fallback: null };
}
