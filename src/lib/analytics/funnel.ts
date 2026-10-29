/**
 * OL-226 admin funnel: pure aggregation over AnalyticsEvent rows (sanitized props only).
 * Ratios use unique anonymous sessions; every rate carries its raw counts, and a rate on a
 * denominator under MIN_RELIABLE_N is flagged as too few events to trust.
 */
import { FUNNEL_EVENT_NAMES, type FunnelEventName } from './events';

export const MIN_RELIABLE_N = 30;
export const RANGE_DAYS = [7, 14, 30] as const;
export type RangeDays = (typeof RANGE_DAYS)[number];

export function parseRangeDays(v: unknown): RangeDays {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return (RANGE_DAYS as readonly number[]).includes(n) ? (n as RangeDays) : 7;
}

export type EventRow = { name: string; anonSessionId: string; listingId: string | null; propsJson: unknown };

export type EventTotals = Record<FunnelEventName, { total: number; sessions: number }>;

export type Rate = { from: FunnelEventName; to: FunnelEventName; numerator: number; denominator: number; rate: number | null; reliable: boolean };

export type Segment = { label: string; views: number; submitted: number; rate: number | null; reliable: boolean };

export const FUNNEL_STEPS: Array<[FunnelEventName, FunnelEventName]> = [
  ['search_performed', 'listing_clicked'],
  ['listing_clicked', 'profile_viewed'],
  ['profile_viewed', 'inquiry_started'],
  ['inquiry_started', 'inquiry_submitted'],
  ['profile_viewed', 'tour_requested'],
];

const rate = (numerator: number, denominator: number) => ({
  numerator,
  denominator,
  rate: denominator > 0 ? numerator / denominator : null,
  reliable: denominator >= MIN_RELIABLE_N,
});

export function totalsByEvent(rows: EventRow[]): EventTotals {
  const out = {} as EventTotals;
  const sessions = {} as Record<string, Set<string>>;
  for (const n of FUNNEL_EVENT_NAMES) { out[n] = { total: 0, sessions: 0 }; sessions[n] = new Set(); }
  for (const r of rows) {
    if (!(r.name in out)) continue;
    out[r.name as FunnelEventName].total += 1;
    sessions[r.name].add(r.anonSessionId);
  }
  for (const n of FUNNEL_EVENT_NAMES) out[n].sessions = sessions[n].size;
  return out;
}

/**
 * Step ratios on unique sessions: of the sessions that did `from`, how many also did `to`
 * in the range. (Counting only sessions present in both keeps the rate ≤ 100%.)
 */
export function funnelRates(rows: EventRow[]): Rate[] {
  const by = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!by.has(r.name)) by.set(r.name, new Set());
    by.get(r.name)!.add(r.anonSessionId);
  }
  return FUNNEL_STEPS.map(([from, to]) => {
    const a = by.get(from) ?? new Set<string>();
    const b = by.get(to) ?? new Set<string>();
    let both = 0;
    a.forEach((s) => { if (b.has(s)) both += 1; });
    return { from, to, ...rate(both, a.size) };
  });
}

const prop = (row: EventRow, key: string): unknown =>
  row.propsJson && typeof row.propsJson === 'object' ? (row.propsJson as Record<string, unknown>)[key] : undefined;

/**
 * profile_viewed → inquiry_submitted for the same session + listing, split by what the profile
 * showed: availability state, photo, price.
 */
export function profileToInquiryBreakdown(rows: EventRow[]): { availability: Segment[]; photo: Segment[]; price: Segment[] } {
  const views = new Map<string, EventRow>();
  const submitted = new Set<string>();
  for (const r of rows) {
    if (!r.listingId) continue;
    const key = `${r.anonSessionId}|${r.listingId}`;
    if (r.name === 'profile_viewed') views.set(key, r);
    if (r.name === 'inquiry_submitted') submitted.add(key);
  }
  const split = (label: (row: EventRow) => string, order: string[]): Segment[] => {
    const acc = new Map<string, { views: number; submitted: number }>(order.map((o) => [o, { views: 0, submitted: 0 }]));
    views.forEach((row, key) => {
      const l = label(row);
      const bucket = acc.get(l) ?? { views: 0, submitted: 0 };
      bucket.views += 1;
      if (submitted.has(key)) bucket.submitted += 1;
      acc.set(l, bucket);
    });
    return Array.from(acc.entries()).map(([l, v]) => {
      const r = rate(v.submitted, v.views);
      return { label: l, views: v.views, submitted: v.submitted, rate: r.rate, reliable: r.reliable };
    });
  };
  return {
    availability: split((r) => (prop(r, 'availability_state') === 'verified' ? 'Verified availability' : 'Unverified availability'), ['Verified availability', 'Unverified availability']),
    photo: split((r) => (prop(r, 'has_photo') === true ? 'Has photos' : 'No photos'), ['Has photos', 'No photos']),
    price: split((r) => (prop(r, 'has_price') === true ? 'Has a price' : 'No price'), ['Has a price', 'No price']),
  };
}

export const EVENT_LABELS: Record<FunnelEventName, string> = {
  search_performed: 'Search performed',
  listing_clicked: 'Listing clicked',
  profile_viewed: 'Profile viewed',
  inquiry_started: 'Inquiry started',
  inquiry_submitted: 'Inquiry submitted',
  tour_requested: 'Tour requested',
  concierge_clicked: 'Concierge clicked',
};
