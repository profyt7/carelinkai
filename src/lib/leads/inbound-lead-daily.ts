/**
 * Per-day PLANNER lead count (OL-167c) — PURE, no Prisma import, so the
 * concierge metrics module can stay import-clean for unit tests.
 */

export type DailyCount = { date: string; count: number };

const BUSINESS_TZ = 'America/New_York';
const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

/** Calendar day (YYYY-MM-DD) in the business timezone. */
export const toBusinessDay = (d: Date | string): string => dayFmt.format(new Date(d));

/**
 * One bucket per calendar day for the trailing `days` days (oldest first,
 * zero-filled), counted in America/New_York. Dates outside the window are ignored.
 */
export function plannerLeadsPerDay(receivedAts: Array<Date | string>, now: Date = new Date(), days = 14): { days: DailyCount[]; total: number } {
  const buckets = new Map<string, number>();
  // Step back by CALENDAR days from today's business day (not by 24h — across a DST change two 24h steps
  // can land on the same local day, giving 13 or 15 buckets).
  const [y, m, d] = toBusinessDay(now).split('-').map(Number);
  for (let i = days - 1; i >= 0; i--) buckets.set(new Date(Date.UTC(y, m - 1, d - i)).toISOString().slice(0, 10), 0);
  let total = 0;
  for (const at of receivedAts) {
    const key = toBusinessDay(at);
    if (!buckets.has(key)) continue;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
    total++;
  }
  return { days: [...buckets.entries()].map(([date, count]) => ({ date, count })), total };
}
