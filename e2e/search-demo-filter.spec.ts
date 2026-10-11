/**
 * OL-112: demo/tutorial homes never surface in the public directory for a
 * logged-out visitor.
 *
 * Seeds (via /api/dev/upsert-operator, ALLOW_DEV_ENDPOINTS=1) one LIVE and one
 * DEMO home under the same operator, then — with no cookies at all — checks:
 *   - GET /api/search            lists the live home, not the demo home
 *   - GET /api/search?markers=1  (map) same
 *   - GET /api/homes/search      same
 *   - GET /api/homes/{demo}      → 404 ; GET /api/homes/{live} → 200
 *   - the rendered /search page never shows the demo home's name
 *
 * Runs with the ./e2e config: npx playwright test --config=playwright.e2e.config.ts e2e/search-demo-filter.spec.ts
 */
import { test, expect } from '@playwright/test';

const OPERATOR_EMAIL = 'e2e-demo-filter-op@test.carelinkai.com';
const LIVE_NAME = 'E2E Live Directory Home';
const DEMO_NAME = 'E2E Tutorial Demo Home';

let liveId = '';
let demoId = '';

test.describe('@critical public directory hides demo homes (OL-112)', () => {
  test.beforeAll(async ({ request }) => {
    const res = await request.post('/api/dev/upsert-operator', {
      data: {
        email: OPERATOR_EMAIL,
        companyName: 'E2E Demo Filter Ops',
        homes: [
          { name: LIVE_NAME, capacity: 10 },
          { name: DEMO_NAME, capacity: 10, isDemo: true },
        ],
      },
    });
    expect(res.ok()).toBeTruthy();
    const j = await res.json();
    liveId = j.homes.find((h: any) => h.name === LIVE_NAME).id;
    demoId = j.homes.find((h: any) => h.name === DEMO_NAME).id;
    expect(liveId).toBeTruthy();
    expect(demoId).toBeTruthy();
  });

  test('GET /api/search (list + markers) excludes the demo home logged-out', async ({ request }) => {
    const list = await request.get('/api/search?limit=50');
    expect(list.status()).toBe(200);
    const body = await list.json();
    const ids = (body.results as any[]).map((r) => r.id);
    expect(ids).toContain(liveId);
    expect(ids).not.toContain(demoId);
    expect(JSON.stringify(body)).not.toContain(DEMO_NAME);

    const markers = await request.get('/api/search?markers=1');
    expect(markers.status()).toBe(200);
    const mj = await markers.json();
    const mids = (mj.markers as any[]).map((m) => m.id);
    expect(mids).toContain(liveId);
    expect(mids).not.toContain(demoId);
  });

  test('GET /api/homes/search excludes the demo home logged-out', async ({ request }) => {
    const res = await request.get('/api/homes/search?limit=50');
    expect(res.status()).toBe(200);
    const body = await res.json();
    const ids = (body.data.homes as any[]).map((h) => h.id);
    expect(ids).toContain(liveId);
    expect(ids).not.toContain(demoId);
  });

  test('GET /api/homes/{id}: demo → 404, live → 200 logged-out', async ({ request }) => {
    const demo = await request.get(`/api/homes/${demoId}`);
    expect(demo.status()).toBe(404);
    const live = await request.get(`/api/homes/${liveId}`);
    expect(live.status()).toBe(200);
  });

  test('rendered /search never shows the demo home', async ({ page }) => {
    await page.goto('/search', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/auth\/login/);
    await expect(page.getByText(LIVE_NAME).first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(DEMO_NAME)).toHaveCount(0);
  });
});
