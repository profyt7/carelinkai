/**
 * OL-161 — non-GET requests to PAGE routes answer a clean 405 instead of
 * rendering Next's error page (which Sentry recorded as `POST /_error`).
 *
 * Pure decision for the edge middleware. Allowed through:
 *   - GET / HEAD / OPTIONS (pages);
 *   - /api/* and /monitoring (route handlers / Sentry tunnel own their methods);
 *   - server actions: a `Next-Action` header, or a no-JS form post
 *     (multipart / urlencoded body) which carries its action id in the body.
 * Everything else (a JSON / empty POST, PUT, DELETE, PATCH … to a page) → 405.
 */

export const PAGE_ALLOWED_METHODS = ['GET', 'HEAD', 'OPTIONS'] as const;

type HeaderReader = { get(name: string): string | null };

export function isPageMethodAllowed(method: string, pathname: string, headers: HeaderReader): boolean {
  const m = method.toUpperCase();
  if ((PAGE_ALLOWED_METHODS as readonly string[]).includes(m)) return true;
  if (pathname.startsWith('/api/') || pathname === '/monitoring') return true;
  if (headers.get('next-action')) return true;
  const ct = (headers.get('content-type') ?? '').toLowerCase();
  if (m === 'POST' && (ct.startsWith('multipart/form-data') || ct.startsWith('application/x-www-form-urlencoded'))) return true;
  return false;
}

export function methodNotAllowedHeaders(): Record<string, string> {
  return {
    allow: PAGE_ALLOWED_METHODS.join(', '),
    'content-type': 'application/json',
    'cache-control': 'no-store',
    'x-robots-tag': 'noindex',
  };
}
