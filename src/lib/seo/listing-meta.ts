/**
 * OL-172 — listing (/homes/[id]) SEO helpers, pure:
 *  - title ≤ 60 characters once the root template adds " | CareLinkAI";
 *  - meta description 140–155 characters (the home's own text when long
 *    enough, otherwise a factual sentence built from the listing);
 *  - (f) the links every listing carries back to its suburb page and its
 *    care-type hubs, and the matching BreadcrumbList trail.
 */

import { suburbForCity, suburbPath } from '@/lib/directory/suburbs';
import { DESCRIPTION_MAX, DESCRIPTION_MIN, TITLE_MAX, TITLE_SUFFIX, clampText } from '@/lib/seo/page-meta';

export type CareLevelKey = 'ASSISTED' | 'MEMORY_CARE' | 'INDEPENDENT' | 'SKILLED_NURSING';

export const CARE_HUB: Record<CareLevelKey, { label: string; href: string }> = {
  ASSISTED: { label: 'Assisted living in Cleveland', href: '/cleveland/assisted-living' },
  MEMORY_CARE: { label: 'Memory care in Cleveland', href: '/cleveland/memory-care' },
  INDEPENDENT: { label: 'Independent living in Cleveland', href: '/cleveland/independent-living' },
  SKILLED_NURSING: { label: 'Nursing homes in Cleveland', href: '/cleveland/nursing-homes' },
};

const CARE_WORD: Record<CareLevelKey, string> = {
  ASSISTED: 'assisted living',
  MEMORY_CARE: 'memory care',
  INDEPENDENT: 'independent living',
  SKILLED_NURSING: 'skilled nursing',
};

export type ListingLinkInput = { name: string; city?: string | null; state?: string | null; careLevels?: readonly string[] | null };

const levels = (l: ListingLinkInput): CareLevelKey[] =>
  (l.careLevels ?? []).filter((c): c is CareLevelKey => c in CARE_HUB);

/** (f) The suburb page and care-type hubs this listing links back to. */
export function listingRelatedLinks(l: ListingLinkInput): { suburb: { name: string; href: string } | null; hubs: Array<{ label: string; href: string }> } {
  const s = suburbForCity(l.city);
  const hubs = levels(l).map((c) => CARE_HUB[c]);
  return {
    suburb: s ? { name: `Assisted living in ${s.name}`, href: suburbPath(s) } : null,
    hubs: hubs.length ? hubs : [CARE_HUB.ASSISTED],
  };
}

/** BreadcrumbList trail: Cleveland › primary care hub › suburb (when the city has a page) › the home. */
export function listingBreadcrumb(l: ListingLinkInput & { id: string }): Array<{ name: string; path: string }> {
  const s = suburbForCity(l.city);
  const primary = levels(l)[0] ?? 'ASSISTED';
  const hubName = CARE_WORD[primary].replace(/^\w/, (c) => c.toUpperCase());
  return [
    { name: 'Cleveland senior care', path: '/cleveland' },
    { name: hubName, path: CARE_HUB[primary].href },
    ...(s && primary === 'ASSISTED' ? [{ name: s.name, path: suburbPath(s) }] : []),
    { name: l.name, path: `/homes/${l.id}` },
  ];
}

/** Title base (no suffix) that fits in 60 characters with the suffix. */
export function listingTitle(l: ListingLinkInput): string {
  const max = TITLE_MAX - TITLE_SUFFIX.length;
  const where = l.city ? `, ${l.city}${l.state ? `, ${l.state}` : ''}` : '';
  if (`${l.name}${where}`.length <= max) return `${l.name}${where}`;
  if (l.name.length <= max) return l.name;
  return clampText(l.name, max);
}

/** Meta description, 140–155 characters. */
export function listingDescription(l: ListingLinkInput, raw?: string | null): string {
  const own = (raw ?? '').replace(/\s+/g, ' ').trim();
  if (own.length >= DESCRIPTION_MIN) return clampText(own, DESCRIPTION_MAX);
  const care = levels(l).map((c) => CARE_WORD[c]);
  const careText = care.length ? care.join(' and ') : 'senior care';
  const where = l.city ? ` in ${l.city}, ${l.state ?? 'OH'}` : ' in Greater Cleveland';
  const facts = `${l.name} is a licensed ${careText} home${where}. See Ohio inspection facts, Medicaid waiver status and availability, and contact the home directly.`;
  if (facts.length > DESCRIPTION_MAX) {
    const short = `Licensed ${careText} home${where}: Ohio inspection facts, Medicaid waiver status and availability. Contact the home directly. Free for families.`;
    return short.length >= DESCRIPTION_MIN ? clampText(short, DESCRIPTION_MAX) : clampText(`${short} No placement fee to families.`, DESCRIPTION_MAX);
  }
  if (facts.length >= DESCRIPTION_MIN) return facts;
  const padded = `${facts} Free for families.`;
  return padded.length >= DESCRIPTION_MIN ? clampText(padded, DESCRIPTION_MAX) : clampText(`${padded} Listing from the Ohio roster.`, DESCRIPTION_MAX);
}
