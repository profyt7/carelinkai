/**
 * /admin/inbound-leads + /api/admin/inbound-leads (OL-167c) smoke:
 * seed a planner lead via /api/dev/inbound-lead (no webhook secret needed),
 * admin sees the row with a tel: link, marks it contacted, closes it; the
 * concierge metrics payload carries the per-day planner count; non-admins 403.
 *
 * Runs with the ./e2e config:
 *   npx playwright test --config=playwright.e2e.config.ts e2e/public/concierge/inbound-leads.spec.ts
 */
import { test, expect, type Browser, type Page } from '@playwright/test';

const ts = Date.now();
const ADMIN = 'admin@carelinkai.com';
const DP = `inbound-dp-${ts}@test.carelinkai.com`;
const CONV_PREFIX = `e2e_inbound_${ts}_`;
const CONV = `${CONV_PREFIX}planner`;
const NAME = `Pat Planner ${ts}`;

const CONSENT_INIT = () => {
  try {
    localStorage.setItem('carelinkai_cookie_consent', JSON.stringify({ necessary: true, analytics: false, marketing: false }));
    for (const role of ['ADMIN', 'OPERATOR', 'FAMILY', 'DISCHARGE_PLANNER']) localStorage.setItem(`carelinkai_onboarding_completed_${role}`, 'true');
  } catch { /* ignore */ }
};

async function login(browser: Browser, email: string): Promise<Page> {
  const ctx = await browser.newContext();
  await ctx.addInitScript(CONSENT_INIT);
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

test.describe('@critical inbound leads (admin)', () => {
  test.beforeAll(async ({ request }) => {
    await request.post('/api/dev/upsert-admin', { data: { email: ADMIN } });
    await request.post('/api/dev/upsert-discharge-planner', { data: { email: DP, organization: 'Inbound Clinic' } });
    const seed = await request.post('/api/dev/inbound-lead', { data: { conversationId: CONV, callerType: 'planner', name: NAME, organization: 'MetroHealth', callbackPhone: '+12165550199', urgency: 'today', reason: 'needs a bed this week' } });
    expect(seed.status(), 'seed inbound lead').toBe(200);
    // Warm the lazily compiled routes (next dev) so the UI clicks below are
    // not waiting on a first-hit compile.
    await request.get('/api/admin/inbound-leads');
    await request.patch('/api/admin/inbound-leads/warm-up', { data: { action: 'close' } });
    await request.get('/api/admin/concierge/metrics');
  });
  test.afterAll(async ({ request }) => {
    await request.delete('/api/dev/inbound-lead', { data: { conversationIdPrefix: CONV_PREFIX } }).catch(() => undefined);
  });

  test('admin: row renders with tel: link; Mark contacted → Close; metrics carry the planner daily count', async ({ browser }) => {
    const admin = await login(browser, ADMIN);

    const api = await get(admin, '/api/admin/inbound-leads?status=open&callerType=planner');
    expect(api.status).toBe(200);
    const seeded = api.json.rows.find((r: any) => r.conversationId === CONV);
    expect(seeded).toMatchObject({ callerType: 'PLANNER', name: NAME, callbackPhone: '+12165550199', urgency: 'TODAY', status: 'NEW', phiFlag: false });

    await admin.goto('/admin/inbound-leads', { waitUntil: 'domcontentloaded' });
    await expect(admin.getByTestId('inbound-leads-table')).toBeVisible({ timeout: 30000 });
    const row = admin.locator(`[data-testid="inbound-lead-row"][data-lead-id="${seeded.id}"]`);
    await expect(row).toBeVisible();
    await expect(row.getByTestId('inbound-lead-phone')).toHaveAttribute('href', 'tel:+12165550199');
    await expect(row.getByTestId('inbound-lead-recording')).toHaveAttribute('href', /elevenlabs/);
    await expect(row.getByTestId('inbound-lead-transcript')).toHaveAttribute('href', /elevenlabs/);
    await expect(row.getByTestId('inbound-lead-reason')).toHaveText('needs a bed this week');

    await row.getByTestId('inbound-lead-contacted').click();
    await expect(admin.locator(`[data-testid="inbound-lead-row"][data-lead-id="${seeded.id}"]`)).toHaveAttribute('data-status', 'CONTACTED', { timeout: 45000 });
    await admin.locator(`[data-testid="inbound-lead-row"][data-lead-id="${seeded.id}"]`).getByTestId('inbound-lead-close').click();
    // Closed rows leave the default "open" view once the reload lands.
    await expect(admin.locator(`[data-testid="inbound-lead-row"][data-lead-id="${seeded.id}"]`)).toHaveCount(0, { timeout: 45000 });
    await admin.getByTestId('inbound-leads-status').selectOption('closed');
    await expect(admin.locator(`[data-testid="inbound-lead-row"][data-lead-id="${seeded.id}"]`)).toHaveAttribute('data-status', 'CLOSED', { timeout: 45000 });

    const after = await get(admin, '/api/admin/inbound-leads?status=closed');
    const closed = after.json.rows.find((r: any) => r.id === seeded.id);
    expect(closed.contactedAt).toBeTruthy();
    expect(closed.closedAt).toBeTruthy();

    const metrics = await get(admin, '/api/admin/concierge/metrics');
    expect(metrics.status).toBe(200);
    expect(metrics.json.plannerLeads.days).toHaveLength(14);
    expect(metrics.json.plannerLeads.total).toBeGreaterThanOrEqual(1);
    await admin.goto('/admin/concierge/metrics', { waitUntil: 'domcontentloaded' });
    await expect(admin.getByTestId('planner-leads-daily')).toBeVisible({ timeout: 30000 });

    await admin.context().close();
  });

  test('DP and anonymous → 403 on the API; page needs a session', async ({ browser, request }) => {
    const dp = await login(browser, DP);
    expect((await get(dp, '/api/admin/inbound-leads')).status).toBe(403);
    await dp.context().close();
    expect((await request.get('/api/admin/inbound-leads')).status()).toBe(403);
    expect((await request.patch('/api/admin/inbound-leads/nope', { data: { action: 'close' } })).status()).toBe(403);
    const page = await request.get('/admin/inbound-leads', { maxRedirects: 0 });
    expect([302, 307]).toContain(page.status());
    expect(page.headers()['location']).toMatch(/\/auth\/login/);
  });
});
