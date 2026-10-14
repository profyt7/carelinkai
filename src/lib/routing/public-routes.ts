/**
 * Route classification shared by src/middleware.ts and its tests.
 *
 * Edge-safe: no Node imports — this module is bundled into the Edge middleware.
 *
 * Two lists live here:
 *
 *  1. PUBLIC_PAGE_PREFIXES — pages that never require a session. A logged-out
 *     visitor (or Googlebot) must get a 200 here, never a redirect to /auth/login.
 *     Every URL in src/app/sitemap.ts MUST be covered by this list.
 *
 *  2. KNOWN_APP_SEGMENTS — every top-level directory under src/app that is a
 *     real route. Anything outside this list cannot be a page, so the
 *     middleware answers 404 instead of bouncing the request to the login page
 *     (which is what withAuth does for any unknown, non-public path). Keeping
 *     this fail-closed: a NEW top-level route that is missing here 404s for
 *     everyone — loud and obvious in dev — rather than silently skipping auth.
 *     __tests__/public-routes.unit.test.ts asserts this list matches the
 *     filesystem so a forgotten entry fails CI.
 */

/** Pages that are public regardless of session or mock mode. */
export const PUBLIC_PAGE_PREFIXES: readonly string[] = [
  '/',
  '/help',
  '/search',
  '/homes',
  '/privacy',
  '/terms',
  '/learn',
  '/availability',
  '/quote',
  '/lead',
  '/founder',
  // Facility accept / decline link (sprint W4-2): no-login, token-gated page.
  '/facility',
  // SEO landing pages (sitemap.ts) — the Cleveland directory and its care-type children.
  '/cleveland',
  // Claim-link landing (/claim?token=…). The page decides what to do from the
  // signed token + session (register redirect for new operators, cohort
  // landing page for cohort links, confirm step for the addressed operator) —
  // withAuth bouncing it to /auth/login made the email links a dead end for
  // anyone without an account (sprint W3 item 2).
  '/claim',
  // Family concierge offer page (sprint W3 item 5) — public, screener in front.
  '/concierge',
];

/**
 * Top-level src/app route segments (directories that resolve to pages or
 * layouts). Do NOT include file-only entries (page.tsx, layout.tsx, robots.ts,
 * sitemap.ts) — those are handled before this check or by the matcher.
 */
export const KNOWN_APP_SEGMENTS: readonly string[] = [
  'admin',
  'affiliate',
  'api',
  'auth',
  'availability',
  'background-checks',
  'calendar',
  'caregiver',
  'claim',
  'cleveland',
  'concierge',
  'dashboard',
  'demo',
  'design-preview',
  'discharge-planner',
  'facility',
  'family',
  'favorites',
  'founder',
  'get-started',
  'help',
  'homes',
  'lead',
  'learn',
  'llms.txt', // route handler (GET /llms.txt) — excluded from the matcher, listed so the fs guard passes
  'marketplace',
  'messages',
  'operator',
  'privacy',
  'provider',
  'quote',
  'reports',
  'rides',
  'search',
  'settings',
  'shifts',
  'terms',
  'timesheets',
];

/**
 * Non-page paths served by Next.js itself that the middleware must let through
 * untouched (they are not under src/app but are valid URLs).
 */
export const KNOWN_NON_PAGE_SEGMENTS: readonly string[] = [
  // Sentry browser tunnel (next.config.js `tunnelRoute: '/monitoring'`). The
  // browser SDK POSTs here from EVERY page, logged-out included — it must never
  // be redirected to /auth/login or client-side errors from visitors are lost.
  'monitoring',
];

/** First path segment, e.g. "/cleveland/memory-care" → "cleveland"; "/" → "". */
export function firstSegment(pathname: string): string {
  const trimmed = pathname.replace(/^\/+/, '');
  const idx = trimmed.indexOf('/');
  return idx === -1 ? trimmed : trimmed.slice(0, idx);
}

/** True for pages that must load without a session. */
export function isPublicPage(pathname: string): boolean {
  if (pathname === '/') return true;
  return PUBLIC_PAGE_PREFIXES.some(
    (p) => p !== '/' && (pathname === p || pathname.startsWith(p + '/'))
  );
}

/**
 * True when the first segment maps to a real src/app route (or a known
 * non-page path like the Sentry tunnel). False → there is no such page, so the
 * request should 404 rather than be sent to the login page.
 */
export function isKnownAppPath(pathname: string): boolean {
  if (pathname === '/') return true;
  const seg = firstSegment(pathname);
  if (!seg) return true;
  return KNOWN_APP_SEGMENTS.includes(seg) || KNOWN_NON_PAGE_SEGMENTS.includes(seg);
}
