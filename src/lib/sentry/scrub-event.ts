/**
 * OL-226 / OL-230: keep free-text search queries and inquiry fields out of Sentry.
 *
 * - Every URL Sentry records (request url, query_string, navigation/fetch breadcrumbs, span
 *   attributes and descriptions, transaction names) loses its query string, except the
 *   allowlisted `view` / `page` params (same rule as the GA page path, ./analytics/sanitize).
 * - Console breadcrumbs are dropped (they can hold any string the app logged).
 * - Prisma validation messages echo the invocation arguments (names, emails, notes): only the
 *   first line ("Invalid `prisma.x.create()` invocation") is kept. Zod "received" values are
 *   redacted.
 * Pure functions; used by sentry.server.config.ts, sentry.edge.config.ts and
 * src/instrumentation-client.ts.
 */
import type { Breadcrumb, Event } from '@sentry/nextjs';
import { sanitizePath } from '@/lib/analytics/sanitize';

// An absolute URL, or a root-relative path at the start / after a delimiter, then a query
// string. (No lookbehind: older Safari can't parse it, and this runs in the browser.)
const URL_WITH_QUERY = /(https?:\/\/[^\s"'<>?#]+|(^|[\s"'(=])(\/[^\s"'<>?#]*))\?[^\s"'<>#]*/g;

/** Strip query strings (except allowlisted params) from every URL inside a string. */
export function scrubUrlsInString(value: string): string {
  if (!value || value.indexOf('?') === -1) return value;
  return value.replace(URL_WITH_QUERY, (match: string, _url: string, lead?: string, path?: string) => {
    if (path !== undefined) return `${lead ?? ''}${sanitizePath(match.slice((lead ?? '').length))}`;
    try {
      return sanitizePath(match, new URL(match).origin);
    } catch {
      return match.split('?')[0];
    }
  });
}

const PRISMA_INVOCATION = /^([\s\S]*?Invalid `[^`]+` invocation[^\n]*)[\s\S]*$/;
const ZOD_RECEIVED = /("received"\s*:\s*)"(?:[^"\\]|\\.)*"/g;

/** Trim error text that can echo submitted values. */
export function scrubErrorText(value: string): string {
  let out = value;
  const prisma = out.match(PRISMA_INVOCATION);
  if (prisma) out = prisma[1];
  out = out.replace(ZOD_RECEIVED, '$1"[Filtered]"');
  return scrubUrlsInString(out);
}

const URL_KEYS = new Set(['url', 'from', 'to', 'href', 'http.url', 'url.full', 'http.target', 'url.path', 'http.route', 'server.address']);
const QUERY_KEYS = new Set(['http.query', 'url.query', 'query', 'query_string', 'http.fragment', 'url.fragment']);

function scrubData<T>(data: T): T {
  if (!data || typeof data !== 'object') return data;
  const out: Record<string, unknown> = Array.isArray(data) ? ([] as unknown as Record<string, unknown>) : {};
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    if (QUERY_KEYS.has(k)) continue;
    if (typeof v === 'string') out[k] = URL_KEYS.has(k) || v.includes('?') ? scrubUrlsInString(v) : v;
    else if (v && typeof v === 'object') out[k] = scrubData(v);
    else out[k] = v;
  }
  return out as T;
}

/** beforeBreadcrumb: drop console crumbs; strip query strings from URLs. */
export function scrubBreadcrumb<B extends Breadcrumb>(breadcrumb: B): B | null {
  if (breadcrumb.category === 'console') return null;
  if (typeof breadcrumb.message === 'string') breadcrumb.message = scrubUrlsInString(breadcrumb.message);
  if (breadcrumb.data) breadcrumb.data = scrubData(breadcrumb.data);
  return breadcrumb;
}

/** beforeSend / beforeSendTransaction: scrub every URL and error text on the event. */
export function scrubEvent<E extends Event>(event: E): E {
  if (typeof event.message === 'string') event.message = scrubErrorText(event.message);
  if (typeof event.transaction === 'string') event.transaction = scrubUrlsInString(event.transaction);
  if (event.request) {
    delete event.request.query_string;
    if (typeof event.request.url === 'string') event.request.url = scrubUrlsInString(event.request.url);
  }
  for (const ex of event.exception?.values ?? []) {
    if (typeof ex.value === 'string') ex.value = scrubErrorText(ex.value);
  }
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((b) => scrubBreadcrumb({ ...b })).filter((b): b is Breadcrumb => b !== null);
  }
  for (const span of event.spans ?? []) {
    if (typeof span.description === 'string') span.description = scrubUrlsInString(span.description);
    if (span.data) span.data = scrubData(span.data);
  }
  if (event.contexts?.trace?.data) event.contexts.trace.data = scrubData(event.contexts.trace.data);
  if (event.tags) event.tags = scrubData(event.tags);
  return event;
}
