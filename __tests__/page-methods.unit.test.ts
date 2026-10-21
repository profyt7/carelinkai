/**
 * OL-161 — non-GET on page routes → 405; API routes, the Sentry tunnel,
 * server actions (Next-Action header or a no-JS form post) pass through.
 */

import { isPageMethodAllowed, methodNotAllowedHeaders, PAGE_ALLOWED_METHODS } from '@/lib/routing/page-methods';

const h = (o: Record<string, string> = {}) => new Headers(o);

describe('isPageMethodAllowed', () => {
  it('GET / HEAD / OPTIONS always pass', () => {
    for (const m of PAGE_ALLOWED_METHODS) expect(isPageMethodAllowed(m, '/', h())).toBe(true);
    expect(isPageMethodAllowed('get', '/cleveland', h())).toBe(true);
  });
  it('POST / PUT / DELETE / PATCH to a page without an action → 405', () => {
    for (const m of ['POST', 'PUT', 'DELETE', 'PATCH']) {
      expect(isPageMethodAllowed(m, '/', h({ 'content-type': 'application/json' }))).toBe(false);
      expect(isPageMethodAllowed(m, '/cleveland/assisted-living', h())).toBe(false);
    }
  });
  it('route handlers and the Sentry tunnel own their methods', () => {
    expect(isPageMethodAllowed('POST', '/api/concierge/request', h())).toBe(true);
    expect(isPageMethodAllowed('DELETE', '/api/dev/upsert-operator', h())).toBe(true);
    expect(isPageMethodAllowed('POST', '/monitoring', h())).toBe(true);
  });
  it('server actions pass: Next-Action header, or a no-JS form post', () => {
    expect(isPageMethodAllowed('POST', '/operator/residents', h({ 'next-action': 'abc123' }))).toBe(true);
    expect(isPageMethodAllowed('POST', '/operator/residents', h({ 'content-type': 'multipart/form-data; boundary=x' }))).toBe(true);
    expect(isPageMethodAllowed('POST', '/operator/residents', h({ 'content-type': 'application/x-www-form-urlencoded' }))).toBe(true);
    expect(isPageMethodAllowed('PUT', '/operator/residents', h({ 'content-type': 'application/x-www-form-urlencoded' }))).toBe(false);
  });
  it('405 headers: Allow, JSON, no-store, noindex', () => {
    expect(methodNotAllowedHeaders()).toEqual({ allow: 'GET, HEAD, OPTIONS', 'content-type': 'application/json', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' });
  });
});
