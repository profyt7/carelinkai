/**
 * OL-226 conversion measurement: the ONLY funnel events the app may emit, and the ONLY
 * properties each may carry. `track()` drops any other key, screens every string
 * (./sanitize), and sends nothing without analytics consent.
 *
 * Destination (analytics consent only): the first-party endpoint /api/analytics/track
 * (anonymous per-tab session id, no cookies, no IP, no user id). It stores funnel events for
 * the admin funnel and forwards the same sanitized data to GA4 server-side (./ga-mp). No
 * Google, Meta or Microsoft script runs in the browser (OL-228/229).
 */
import { getConsent } from '@/lib/consent';
import {
  sanitizePath,
  intBetween,
  isBool,
  listOf,
  oneOf,
  opaqueId,
  pickAllowed,
  routePatternValue,
  type Validator,
} from './sanitize';

export const CARE_LEVEL_VALUES = ['INDEPENDENT', 'ASSISTED', 'MEMORY_CARE', 'SKILLED_NURSING'] as const;
export const RESULT_COUNT_BUCKETS = ['0', '1-5', '6-20', '21+'] as const;
export const LISTING_SOURCES = ['search', 'directory', 'ai_match', 'favorites'] as const;
export const INQUIRY_ENTRIES = ['rail', 'inline', 'cta_bar'] as const;

type AvailabilityState = 'verified' | 'unverified';
type Entry = (typeof INQUIRY_ENTRIES)[number];

export type FunnelEvents = {
  search_performed: {
    care_levels?: (typeof CARE_LEVEL_VALUES)[number][];
    has_budget_filter: boolean;
    has_location_filter: boolean;
    verified_only: boolean;
    medicaid_waiver: boolean;
    view: 'grid' | 'list' | 'map';
    result_count_bucket: (typeof RESULT_COUNT_BUCKETS)[number];
  };
  listing_clicked: {
    listing_id: string;
    position: number;
    source: (typeof LISTING_SOURCES)[number];
    availability_state: AvailabilityState;
    has_photo: boolean;
    has_price: boolean;
    /** Omitted where the source surface doesn't know (AI match, favorites). */
    claimed?: boolean;
  };
  profile_viewed: {
    listing_id: string;
    availability_state: AvailabilityState;
    has_photo: boolean;
    has_price: boolean;
    claimed: boolean;
    has_inspection: boolean;
  };
  inquiry_started: { listing_id: string; entry: Entry };
  inquiry_submitted: { listing_id: string; entry: Entry };
  tour_requested: { listing_id: string; entry: Entry };
  /** source_page is a route pattern, e.g. '/homes/[id]' — never a concrete URL. */
  concierge_clicked: { source_page: string };
};

export type FunnelEventName = keyof FunnelEvents;

const availability = oneOf(['verified', 'unverified']);
const entry = oneOf(INQUIRY_ENTRIES);

/** The allowlist. A key that isn't here never leaves the browser and is never stored. */
export const EVENT_SCHEMA: { [K in FunnelEventName]: Record<keyof FunnelEvents[K], Validator> } = {
  search_performed: {
    care_levels: listOf(CARE_LEVEL_VALUES, CARE_LEVEL_VALUES.length),
    has_budget_filter: isBool,
    has_location_filter: isBool,
    verified_only: isBool,
    medicaid_waiver: isBool,
    view: oneOf(['grid', 'list', 'map']),
    result_count_bucket: oneOf(RESULT_COUNT_BUCKETS),
  },
  listing_clicked: {
    listing_id: opaqueId,
    position: intBetween(1, 500),
    source: oneOf(LISTING_SOURCES),
    availability_state: availability,
    has_photo: isBool,
    has_price: isBool,
    claimed: isBool,
  },
  profile_viewed: {
    listing_id: opaqueId,
    availability_state: availability,
    has_photo: isBool,
    has_price: isBool,
    claimed: isBool,
    has_inspection: isBool,
  },
  inquiry_started: { listing_id: opaqueId, entry },
  inquiry_submitted: { listing_id: opaqueId, entry },
  tour_requested: { listing_id: opaqueId, entry },
  concierge_clicked: { source_page: routePatternValue },
};

export const FUNNEL_EVENT_NAMES = Object.keys(EVENT_SCHEMA) as FunnelEventName[];

export function isFunnelEventName(name: unknown): name is FunnelEventName {
  return typeof name === 'string' && Object.prototype.hasOwnProperty.call(EVENT_SCHEMA, name);
}

/** Allowlist + screen a payload for `name`. Unknown name → null. */
export function sanitizeEvent(name: unknown, props: unknown): { name: FunnelEventName; props: Record<string, unknown> } | null {
  if (!isFunnelEventName(name)) return null;
  return { name, props: pickAllowed(props, EVENT_SCHEMA[name] as Record<string, Validator>).clean };
}

/** '0' | '1-5' | '6-20' | '21+' — the result count is never sent raw. */
export function resultCountBucket(n: number): FunnelEvents['search_performed']['result_count_bucket'] {
  if (!Number.isFinite(n) || n <= 0) return '0';
  if (n <= 5) return '1-5';
  if (n <= 20) return '6-20';
  return '21+';
}

// ---- client transport ---------------------------------------------------------------------

export const ANON_SESSION_KEY = 'carelinkai_anon_sid';

export function hasAnalyticsConsent(): boolean {
  return getConsent()?.analytics === true;
}

/** Random per-tab id, created only after analytics consent. Not a cookie; no fingerprinting. */
export function anonSessionId(): string | null {
  if (typeof window === 'undefined' || !hasAnalyticsConsent()) return null;
  try {
    let sid = sessionStorage.getItem(ANON_SESSION_KEY);
    if (!sid) {
      sid = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : null;
      if (!sid) return null;
      sessionStorage.setItem(ANON_SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return null;
  }
}

export const PAGE_VIEW_EVENT = 'page_view' as const;
type Transport = (name: FunnelEventName | typeof PAGE_VIEW_EVENT, props: Record<string, unknown>, sid: string) => void;

const defaultTransport: Transport = (name, props, sid) => {
  // The page path is sanitized here (only `view` / `page` params survive) and again server-side.
  const path = sanitizePath(window.location.pathname + window.location.search);
  try {
    void fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, props, sid, path, consent: 'analytics' }),
      keepalive: true,
      credentials: 'omit',
    }).catch(() => {});
  } catch {
    /* never break the page for analytics */
  }
};

let transport: Transport = defaultTransport;

/** Test seam: replace the network transport (jest). Returns a restore function. */
export function setTransportForTests(t: Transport): () => void {
  transport = t;
  return () => { transport = defaultTransport; };
}

/**
 * Emit one funnel event. No analytics consent → nothing happens (no network, no storage).
 * Only allowlisted, screened props are sent.
 */
export function track<K extends FunnelEventName>(name: K, props: FunnelEvents[K]): void {
  if (typeof window === 'undefined' || !hasAnalyticsConsent()) return;
  const event = sanitizeEvent(name, props);
  const sid = anonSessionId();
  if (!event || !sid) return;
  transport(event.name, event.props, sid);
}

/** One page view (sanitized path only). No analytics consent → nothing happens. */
export function trackPageView(): void {
  if (typeof window === 'undefined' || !hasAnalyticsConsent()) return;
  const sid = anonSessionId();
  if (!sid) return;
  transport(PAGE_VIEW_EVENT, {}, sid);
}
