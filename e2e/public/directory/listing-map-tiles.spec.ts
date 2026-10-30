/**
 * OL-178 — the listing map's tiles come from MapTiler, never OpenStreetMap's
 * tile servers (403 "Access blocked" in production) or CARTO.
 *
 * Needs NEXT_PUBLIC_MAPTILER_KEY at build/dev time — the e2e-public-directory
 * job sets a FAKE key. Every api.maptiler.com request is intercepted and
 * answered with a 1×1 PNG, so nothing reaches MapTiler; any OSM / CARTO tile
 * request is recorded and fails the test. Also checks that tiles carry the
 * origin as Referer (key restrictions) and never the page path.
 *
 *   NEXT_PUBLIC_MAPTILER_KEY=e2e-fake-maptiler-key npx playwright test --config=playwright.e2e.config.ts e2e/public/directory/listing-map-tiles.spec.ts
 */
import { test, expect, type Request } from '@playwright/test';

const KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? '';
const ts = Date.now();
const OP_EMAIL = `map-tiles-op-${ts}@test.carelinkai.com`;
const HOME_NAME = `E2E Map Tiles Home ${ts}`;
// 1×1 transparent PNG.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

let homeId = '';

test.describe('@critical OL-178 listing map tiles → MapTiler only', () => {
  // Locally the spec skips without a key; in CI a missing key is a wiring bug, so it fails.
  test.skip(!KEY && !process.env.CI, 'NEXT_PUBLIC_MAPTILER_KEY not set for this run (the CI job sets a fake one)');
  test.beforeAll(() => {
    expect(KEY, 'e2e-public-directory must set NEXT_PUBLIC_MAPTILER_KEY (fake)').not.toBe('');
  });

  test.beforeAll(async ({ request }) => {
    const res = await request.post('/api/dev/upsert-operator', {
      data: { email: OP_EMAIL, companyName: `Map Tiles Ops ${ts}`, homes: [{ name: HOME_NAME, city: 'Beachwood', zipCode: '44122', careLevel: ['ASSISTED'] }] },
    });
    expect(res.status(), 'dev seed').toBe(200);
    homeId = (await res.json()).homeId;
  });

  test.afterAll(async ({ request }) => {
    await request.delete('/api/dev/upsert-operator', { data: { email: OP_EMAIL } }).catch(() => undefined);
  });

  test('tile requests go to api.maptiler.com with the key and an origin-only referrer; none to OSM or CARTO', async ({ page, baseURL }) => {
    const maptiler: Request[] = [];
    const forbidden: string[] = [];
    page.on('request', (r) => {
      const u = r.url();
      if (/tile\.openstreetmap\.org|cartocdn\.com/i.test(u)) forbidden.push(u);
    });
    await page.route('https://api.maptiler.com/**', async (route) => {
      maptiler.push(route.request());
      await route.fulfill({ status: 200, contentType: route.request().url().endsWith('.svg') ? 'image/svg+xml' : 'image/png', body: PNG });
    });
    await page.addInitScript(() => {
      try { localStorage.setItem('carelinkai_cookie_consent', JSON.stringify({ necessary: true, analytics: false, marketing: false })); } catch { /* ignore */ }
    });

    await page.goto(`/homes/${homeId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1, name: HOME_NAME })).toBeVisible({ timeout: 60_000 });
    await page.getByRole('heading', { level: 2, name: 'Location' }).scrollIntoViewIfNeeded();
    const leaflet = page.locator('#map-container.leaflet-container');
    await expect(leaflet).toBeVisible({ timeout: 30_000 });
    await expect(leaflet.locator('img.leaflet-tile-loaded').first()).toBeAttached({ timeout: 30_000 });

    const tiles = maptiler.filter((r) => r.url().includes('/maps/streets-v2/256/'));
    expect(tiles.length, 'MapTiler tile requests').toBeGreaterThan(0);
    for (const r of tiles) {
      const u = new URL(r.url());
      expect(u.pathname).toMatch(/^\/maps\/streets-v2\/256\/\d+\/\d+\/\d+(@2x)?\.png$/);
      expect(u.searchParams.get('key')).toBe(KEY);
      const referer = (await r.allHeaders())['referer'] ?? '';
      expect(referer, 'tile Referer is the origin only').toBe(`${new URL(baseURL ?? 'http://localhost:3000').origin}/`);
    }
    expect(forbidden, 'no OSM / CARTO tile requests').toEqual([]);

    // MapTiler's terms: attribution (MapTiler + OSM, linked) and the logo.
    const attribution = leaflet.locator('.leaflet-control-attribution');
    await expect(attribution.locator('a[href="https://www.maptiler.com/copyright/"]')).toContainText('MapTiler');
    await expect(attribution.locator('a[href="https://www.openstreetmap.org/copyright"]')).toContainText('OpenStreetMap contributors');
    await expect(leaflet.locator('a.maptiler-logo[href="https://www.maptiler.com/"] img')).toBeAttached();
    await expect(page.getByTestId('map-placeholder')).toHaveCount(0);
  });

  test('390: the map (attribution included) never paints over the sticky site header', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route('https://api.maptiler.com/**', (route) => route.fulfill({ status: 200, contentType: 'image/png', body: PNG }));
    await page.goto(`/homes/${homeId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1, name: HOME_NAME })).toBeVisible({ timeout: 60_000 });
    const leaflet = page.locator('#map-container.leaflet-container');
    await leaflet.scrollIntoViewIfNeeded();
    await expect(leaflet.locator('.leaflet-control-attribution')).toBeVisible({ timeout: 30_000 });
    const header = page.getByTestId('site-header');
    const hb = await header.boundingBox();
    expect(hb, 'sticky header').not.toBeNull();
    // Scroll so the map's bottom edge (where the attribution sits) slides under the header.
    const mb = (await leaflet.boundingBox())!;
    await page.mouse.wheel(0, mb.y + mb.height - (hb!.y + hb!.height / 2));
    await page.waitForTimeout(300);
    const m2 = (await leaflet.boundingBox())!;
    const h2 = (await header.boundingBox())!;
    expect(m2.y, 'map is under the header').toBeLessThan(h2.y + h2.height);
    // Every point of the header that overlaps the map must hit the header, not a Leaflet layer.
    const hits = await page.evaluate(({ y, x0, x1 }) => {
      const out: boolean[] = [];
      for (let x = x0 + 4; x < x1 - 4; x += 24) {
        const el = document.elementFromPoint(x, y);
        out.push(Boolean(el && el.closest('[data-testid="site-header"]')));
      }
      return out;
    }, { y: h2.y + h2.height - 6, x0: Math.max(m2.x, 0), x1: Math.min(m2.x + m2.width, 390) });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every(Boolean), 'header wins over every map layer').toBe(true);
  });

  test('the page itself no longer sends Referrer-Policy: no-referrer', async ({ request }) => {
    const res = await request.get(`/homes/${homeId}`);
    expect(res.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });
});
