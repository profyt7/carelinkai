/**
 * OL-191 — how a featured listing affects ordering. Client-safe (no server imports).
 *
 * Featured is a TIE-BREAK inside a band, never a jump across bands:
 * - /api/search (relevance): results are grouped into bands of
 *   SEARCH_SCORE_BAND_WIDTH points of ranking score (AI match 0–100 plus the
 *   fresh-availability +8 and transparent-pricing +6 boosts, so 0–114). A
 *   featured home sorts first only among homes in the same band; a home in a
 *   higher band always stays above it.
 * - /cleveland hub pages: the band is the availability-freshness tier the page
 *   already sorts by (verified within AVAILABILITY_FRESH_DAYS, older, never
 *   verified). Featured sorts first within its tier; the existing order
 *   (verified date, then Google rating, then name) is kept otherwise.
 */
import { AVAILABILITY_FRESH_DAYS } from '@/lib/availability/availability';

/** True while a home's featured window is open (no expiry = open). */
export function isFeaturedActive(
  home: { isFeatured?: boolean | null; featuredUntil?: Date | string | null },
  now: Date | number = Date.now(),
): boolean {
  if (!home.isFeatured) return false;
  if (!home.featuredUntil) return true;
  return new Date(home.featuredUntil).getTime() > new Date(now).getTime();
}

/**
 * 5 points ≈ one fresh-availability or transparent-pricing boost (8 / 6):
 * narrow enough that featured never outweighs a real quality signal, wide
 * enough that near-equal matches can break the tie.
 */
export const SEARCH_SCORE_BAND_WIDTH = 5;

export function searchScoreBand(score: number): number {
  return Math.floor((Number.isFinite(score) ? score : 0) / SEARCH_SCORE_BAND_WIDTH);
}

/** Relevance order: higher band first; featured first within a band; then higher score. Stable for full ties. */
export function compareSearchRank(
  a: { rankScore: number; featured?: boolean },
  b: { rankScore: number; featured?: boolean },
): number {
  const band = searchScoreBand(b.rankScore) - searchScoreBand(a.rankScore);
  if (band !== 0) return band;
  const feat = Number(!!b.featured) - Number(!!a.featured);
  if (feat !== 0) return feat;
  return b.rankScore - a.rankScore;
}

const DAY_MS = 86_400_000;

/** 0 = verified within AVAILABILITY_FRESH_DAYS, 1 = verified earlier, 2 = never verified. */
export function hubFreshnessBand(verifiedAt: Date | string | null | undefined, now: number = Date.now()): number {
  if (!verifiedAt) return 2;
  const t = new Date(verifiedAt).getTime();
  if (!Number.isFinite(t)) return 2;
  return now - t <= AVAILABILITY_FRESH_DAYS * DAY_MS ? 0 : 1;
}

/**
 * Re-rank hub rows that arrive in the page's existing order (verified date
 * desc, rating desc, name). `rows` = the page's top rows plus any active
 * featured rows (duplicates by id are dropped, first occurrence wins).
 * Returns the top `take`.
 */
export function rankHubRows<
  T extends { id: string; availabilityVerifiedAt?: Date | string | null; isFeatured?: boolean | null; featuredUntil?: Date | string | null },
>(rows: readonly T[], take: number, now: number = Date.now()): T[] {
  const seen = new Set<string>();
  const unique = rows.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
  // Featured rows may come from a separate query, so rebuild the base order before tie-breaking.
  const verified = (r: T) => (r.availabilityVerifiedAt ? new Date(r.availabilityVerifiedAt).getTime() : -Infinity);
  const index = new Map(unique.map((r, i) => [r.id, i]));
  return [...unique]
    .sort((a, b) => {
      const band = hubFreshnessBand(a.availabilityVerifiedAt, now) - hubFreshnessBand(b.availabilityVerifiedAt, now);
      if (band !== 0) return band;
      const feat = Number(isFeaturedActive(b, now)) - Number(isFeaturedActive(a, now));
      if (feat !== 0) return feat;
      const v = verified(b) - verified(a);
      if (v !== 0) return v;
      return (index.get(a.id) ?? 0) - (index.get(b.id) ?? 0);
    })
    .slice(0, take);
}
