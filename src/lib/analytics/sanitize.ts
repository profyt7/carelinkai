/**
 * OL-226 privacy guard for conversion measurement. Pure functions, safe on client and server.
 *
 * Every outbound funnel event, every page_view and everything /api/analytics/track accepts
 * passes through here:
 *   - page paths keep only an allowlist of non-sensitive query params (never q, name, email…);
 *   - a value that looks like an email, a phone number or free text (> 40 chars) is rejected;
 *   - only allowlisted keys with allowlisted value shapes survive (see ./events).
 */

/** Query params that may stay on a page path. Everything else (q, name, email, …) is dropped. */
export const ALLOWED_QUERY_PARAMS = ['view', 'page'] as const;
const ALLOWED_QUERY_VALUE = /^[A-Za-z0-9_-]{1,20}$/;

export const MAX_TEXT_LENGTH = 40;
const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/;
// A whole value shaped like a phone number: digits with optional + ( ) . - and spaces, 7+ digits.
const PHONE_VALUE = /^\+?[\d\s().-]{7,24}$/;
// A phone number inside text (text has spaces; opaque ids never do, and may hold digit runs).
const PHONE_IN_TEXT = /(?:\+?\d[\s().-]?){7,}/;

function digitCount(s: string): number {
  return (s.match(/\d/g) || []).length;
}

/** True when a string must never reach analytics: an email, a phone number or free text. */
export function looksSensitive(value: string): boolean {
  if (value.length > MAX_TEXT_LENGTH || EMAIL.test(value)) return true;
  if (PHONE_VALUE.test(value) && digitCount(value) >= 7) return true;
  return /\s/.test(value) && PHONE_IN_TEXT.test(value);
}

/**
 * Reduce a URL or path to `pathname` + allowlisted params. Accepts absolute URLs too
 * (GA's page_location). Unparseable input → '/'. Never returns a fragment.
 */
export function sanitizePath(input: string, origin?: string): string {
  let url: URL;
  try {
    url = new URL(input, origin ?? 'https://x.invalid');
  } catch {
    return '/';
  }
  const kept = new URLSearchParams();
  for (const key of ALLOWED_QUERY_PARAMS) {
    const v = url.searchParams.get(key);
    if (v && ALLOWED_QUERY_VALUE.test(v)) kept.set(key, v);
  }
  const qs = kept.toString();
  const path = url.pathname || '/';
  const out = qs ? `${path}?${qs}` : path;
  return origin && /^https?:/i.test(input) ? `${url.origin}${out}` : out;
}

/** Collapse a concrete pathname to its route pattern, e.g. /homes/abc123 → /homes/[id]. */
export function routePattern(pathname: string): string {
  const path = sanitizePath(pathname).split('?')[0];
  const parts = path.split('/').filter(Boolean);
  if (parts[0] === 'homes' && parts[1] && parts[1] !== 'match') return '/homes/[id]';
  if (parts[0] === 'cleveland' && parts.length === 3) return `/cleveland/${parts[1]}/[suburb]`;
  const mapped = parts.map((seg) => (/\d/.test(seg) && seg.length >= 12 ? '[id]' : seg.toLowerCase()));
  return `/${mapped.join('/')}`.slice(0, 60);
}

// ---- value validators (closed shapes only) ----------------------------------------------

export type Validator = (v: unknown) => boolean;

export const isBool: Validator = (v) => typeof v === 'boolean';
export const oneOf = (values: readonly string[]): Validator => (v) => typeof v === 'string' && values.includes(v);
export const listOf = (values: readonly string[], max = 8): Validator => (v) =>
  Array.isArray(v) && v.length <= max && v.every((x) => typeof x === 'string' && values.includes(x));
export const intBetween = (min: number, max: number): Validator => (v) =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
/** Opaque record id (cuid / uuid / slug-like): no spaces, at least one letter, ≤ 40 chars. */
export const opaqueId: Validator = (v) =>
  typeof v === 'string' && /^(?=.*[A-Za-z])[A-Za-z0-9_-]{1,40}$/.test(v) && !looksSensitive(v);
export const routePatternValue: Validator = (v) =>
  typeof v === 'string' && /^\/[a-z0-9/_\-[\]]{0,59}$/.test(v);

/**
 * Keep only `allowed` keys whose value passes its validator. Strings are also screened by
 * looksSensitive. Returns the cleaned object and the keys that were dropped.
 */
export function pickAllowed(
  props: unknown,
  allowed: Record<string, Validator>,
): { clean: Record<string, unknown>; dropped: string[] } {
  const clean: Record<string, unknown> = {};
  const dropped: string[] = [];
  if (!props || typeof props !== 'object' || Array.isArray(props)) return { clean, dropped };
  for (const [key, value] of Object.entries(props as Record<string, unknown>)) {
    const check = Object.prototype.hasOwnProperty.call(allowed, key) ? allowed[key] : undefined;
    const stringOk = typeof value !== 'string' || !looksSensitive(value);
    if (check && stringOk && check(value)) clean[key] = Array.isArray(value) ? [...value] : value;
    else dropped.push(key);
  }
  return { clean, dropped };
}
