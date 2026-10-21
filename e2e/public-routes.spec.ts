/**
 * Logged-out reachability of the SEO landing pages + 404 for unknown paths.
 *
 * Regression guard for the middleware public-route list (src/lib/routing/public-routes.ts):
 *  - every sitemap landing page answers 200 with NO redirect, NO noindex meta
 *    and NO X-Robots-Tag: noindex for a cookie-less fetcher (Googlebot, a planner
 *    clicking from email, Chris in an incognito tab);
 *  - made-up / probe paths answer 404, never a 307 to /auth/login;
 *  - protected areas still bounce to login (the fix must not widen access).
 *
 * Runs with the ./e2e config: npx playwright test --config=playwright.e2e.config.ts e2e/public-routes.spec.ts
 */
import { test, expect } from '@playwright/test';

const LANDING_PAGES = [
  '/cleveland',
  '/cleveland/assisted-living',
  '/cleveland/memory-care',
  '/cleveland/independent-living',
  '/cleveland/nursing-homes',
];

const OTHER_PUBLIC = ['/', '/search', '/learn'];

const UNKNOWN_PATHS = ['/zzz-nope', '/.env', '/wp-admin', '/cleveland-nope'];

test.describe('@critical public routes reachable logged-out', () => {
  for (const path of LANDING_PAGES) {
    test(`GET ${path} → 200, indexable, no redirect`, async ({ request }) => {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status(), `${path} should be 200`).toBe(200);
      expect(res.headers()['location']).toBeUndefined();
      const robotsHeader = res.headers()['x-robots-tag'] ?? '';
      expect(robotsHeader.toLowerCase()).not.toContain('noindex');
      const html = await res.text();
      expect(html).not.toMatch(/<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i);
      // It is the landing page, not the login page.
      expect(html).not.toMatch(/\/auth\/login\?callbackUrl/);
      expect(html).toMatch(/<link[^>]+rel="canonical"[^>]+getcarelinkai\.com/);
    });
  }

  for (const path of OTHER_PUBLIC) {
    test(`GET ${path} still 200 logged-out`, async ({ request }) => {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status()).toBe(200);
    });
  }

  test('rendered: /cleveland/memory-care is not redirected to login', async ({ page }) => {
    await page.goto('/cleveland/memory-care', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/auth\/login/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});

test.describe('@critical non-GET on page routes → clean 405 (OL-161)', () => {
  for (const path of ['/', '/cleveland/assisted-living', '/concierge']) {
    test(`POST ${path} → 405 with Allow, no redirect, no error page`, async ({ request }) => {
      const res = await request.post(path, { maxRedirects: 0, data: { probe: true } });
      expect(res.status()).toBe(405);
      expect(res.headers()['allow']).toBe('GET, HEAD, OPTIONS');
      expect(res.headers()['location']).toBeUndefined();
      expect(await res.json()).toEqual({ error: 'Method Not Allowed' });
    });
  }
  test('PUT / DELETE on a page → 405; GET / still 200; API routes keep their own methods', async ({ request }) => {
    expect((await request.put('/', { maxRedirects: 0 })).status()).toBe(405);
    expect((await request.delete('/cleveland', { maxRedirects: 0 })).status()).toBe(405);
    expect((await request.get('/', { maxRedirects: 0 })).status()).toBe(200);
    // An API route is not a page: the method reaches the handler (401 here, not 405).
    expect((await request.post('/api/availability/voice-result', { data: {} })).status()).not.toBe(405);
  });
});

test.describe('@critical unknown paths 404 instead of login', () => {
  for (const path of UNKNOWN_PATHS) {
    test(`GET ${path} → 404`, async ({ request }) => {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status(), `${path} should be 404`).toBe(404);
      expect(res.headers()['location']).toBeUndefined();
    });
  }
});

test.describe('protected areas still require a session', () => {
  for (const path of ['/operator', '/admin', '/settings']) {
    test(`GET ${path} logged-out → redirect to /auth/login`, async ({ request }) => {
      const res = await request.get(path, { maxRedirects: 0 });
      expect([302, 307]).toContain(res.status());
      expect(res.headers()['location']).toMatch(/\/auth\/login/);
    });
  }
});
