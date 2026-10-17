/**
 * /admin/concierge/metrics + /api/admin/concierge/metrics (sprint 4.4 / W4-3):
 * admin → 200 with the per-DP + overall table; operator / DP / anonymous → 403
 * on the API, redirect to login on the page.
 *
 * Runs with the ./e2e config:
 *   npx playwright test --config=playwright.e2e.config.ts e2e/public/concierge/concierge-metrics.spec.ts
 */
import { test, expect, type Browser, type Page } from '@playwright/test';

const ts = Date.now();
const ADMIN = 'admin@carelinkai.com';
const OP = `metrics-op-${ts}@test.carelinkai.com`;
const DP = `metrics-dp-${ts}@test.carelinkai.com`;

async function login(browser: Browser, email: string): Promise<Page> {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto('/');
  const status = await page.evaluate(async (e) => {
    const r = await fetch('/api/dev/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: e }), credentials: 'include' });
    return r.status;
  }, email);
  expect(status, `dev-login ${email}`).toBe(200);
  return page;
}
async function get(page: Page, path: string) {
  return page.evaluate(async (p) => {
    const r = await fetch(p, { credentials: 'include' });
    let json: any = null;
    try { json = await r.json(); } catch { /* none */ }
    return { status: r.status, json };
  }, path);
}

test.describe('@critical concierge metrics (admin only)', () => {
  test.beforeAll(async ({ request }) => {
    await request.post('/api/dev/upsert-admin', { data: { email: ADMIN } });
    await request.post('/api/dev/upsert-operator', { data: { email: OP, companyName: `Metrics Op ${ts}`, homes: [{ name: `E2E Metrics Home ${ts}` }] } });
    await request.post('/api/dev/upsert-discharge-planner', { data: { email: DP, organization: 'Metrics Clinic' } });
  });
  test.afterAll(async ({ request }) => {
    await request.delete('/api/dev/placement-search', { data: { email: OP } }).catch(() => undefined);
  });

  test('admin: API 200 with overall + perDp blocks; page renders the table', async ({ browser }) => {
    const admin = await login(browser, ADMIN);
    const res = await get(admin, '/api/admin/concierge/metrics');
    expect(res.status).toBe(200);
    expect(res.json.overall).toMatchObject({ key: 'overall', requests: expect.any(Number), payerLaneMix: expect.any(Object) });
    expect(Array.isArray(res.json.perDp)).toBe(true);
    for (const b of [res.json.overall, ...res.json.perDp]) {
      expect(b.requests).toBeGreaterThanOrEqual(b.shortlisted);
      expect(b.acceptRate === null || (b.acceptRate >= 0 && b.acceptRate <= 1)).toBe(true);
      expect(Array.isArray(b.topDeclineReasons)).toBe(true);
    }
    await admin.goto('/admin/concierge/metrics', { waitUntil: 'domcontentloaded' });
    await expect(admin.getByTestId('metrics-table')).toBeVisible({ timeout: 30000 });
    await expect(admin.locator('[data-testid="metrics-row"][data-key="overall"]')).toBeVisible();
    await admin.context().close();
  });

  test('operator, DP and anonymous → 403 on the API; page needs a session', async ({ browser, request }) => {
    for (const email of [OP, DP]) {
      const p = await login(browser, email);
      expect((await get(p, '/api/admin/concierge/metrics')).status, email).toBe(403);
      await p.context().close();
    }
    expect((await request.get('/api/admin/concierge/metrics')).status()).toBe(403);
    const page = await request.get('/admin/concierge/metrics', { maxRedirects: 0 });
    expect([302, 307]).toContain(page.status());
    expect(page.headers()['location']).toMatch(/\/auth\/login/);
  });
});
