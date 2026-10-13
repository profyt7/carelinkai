/**
 * Suburb empty-state guard (sprint W4 0c, follow-up to the W3 suburb pages).
 *
 * A suburb page that matches no live, non-demo ASSISTED home silently renders
 * the "still verifying" empty state — bad for the SEO page and invisible
 * unless someone loads it. This module makes it loud:
 *
 *   - `suburbListingsQuery(s)` is THE query the page uses, so the count the
 *     guard reports is the count the page renders;
 *   - `describeSuburbFilter(s)` is the human-readable filter that goes in the
 *     log line, so the warning says exactly what was matched;
 *   - `reportSuburbListings()` counts every suburb (the `check-suburb-listings`
 *     script prints it; run it against the target DB before/after a sweep);
 *   - `warnSuburbEmptyState()` is what the page calls when it is about to
 *     render the empty state: a WARN log with the live count + the filter.
 *     If the live count is > 0 while the page got no rows, the fetch failed
 *     (that error already went to Sentry) and the log says so.
 */

import type { CareLevel } from '@prisma/client';
import { countPublicListings, type PublicListingsQuery } from '@/lib/directory/public-listings';
import { SUBURBS, type Suburb } from '@/lib/directory/suburbs';
import { logger } from '@/lib/logger';

export const SUBURB_CARE_LEVEL: CareLevel = 'ASSISTED';

export function suburbListingsQuery(s: Pick<Suburb, 'cities'>, take?: number): PublicListingsQuery {
  return { cities: s.cities, careLevel: SUBURB_CARE_LEVEL, ...(take ? { take } : {}) };
}

/** The filter in words — what a human needs to re-run the query by hand. */
export function describeSuburbFilter(s: Pick<Suburb, 'cities'>): string {
  return `status=ACTIVE isDemo=false careLevel has ${SUBURB_CARE_LEVEL} address.city in [${s.cities.join(', ')}] (case-insensitive)`;
}

export type SuburbListingReport = {
  slug: string;
  name: string;
  cities: readonly string[];
  filter: string;
  /** Live non-demo count for the page's filter; null when the count query failed. */
  count: number | null;
  /** True when the page would render the empty state. */
  empty: boolean;
  error?: string;
};

export async function reportSuburb(s: Suburb): Promise<SuburbListingReport> {
  const base = { slug: s.slug, name: s.name, cities: s.cities, filter: describeSuburbFilter(s) };
  try {
    const count = await countPublicListings(suburbListingsQuery(s));
    return { ...base, count, empty: count === 0 };
  } catch (e) {
    return { ...base, count: null, empty: true, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Live listing count per suburb page, in registry order. Never throws. */
export async function reportSuburbListings(suburbs: readonly Suburb[] = SUBURBS): Promise<SuburbListingReport[]> {
  const out: SuburbListingReport[] = [];
  for (const s of suburbs) out.push(await reportSuburb(s));
  return out;
}

type WarnSink = Pick<typeof logger, 'warn'>;

/**
 * Called by the suburb page right before it renders the empty state.
 * `rendered` is how many rows the page actually got (0 in the empty state).
 */
export async function warnSuburbEmptyState(s: Suburb, rendered: number, log: WarnSink = logger): Promise<SuburbListingReport> {
  const report = await reportSuburb(s);
  const liveCount = report.count;
  const reason =
    liveCount === null
      ? 'count query failed'
      : liveCount > 0 && rendered === 0
        ? 'listings query failed (see Sentry) — the DB has matching homes'
        : 'no live non-demo ASSISTED home matches the filter — seed/activate homes or fix the cities list';
  log.warn(`suburb page would render the empty state: /cleveland/assisted-living/${s.slug}`, {
    feature: 'suburb-empty-state',
    suburb: s.slug,
    liveCount,
    rendered,
    filter: report.filter,
    reason,
    ...(report.error ? { error: report.error } : {}),
  });
  return report;
}
