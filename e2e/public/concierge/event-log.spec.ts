/**
 * Append-only history (sprint W5-1, Δ14 / G2).
 *
 *  operator sets availability on their own home (PUT /api/operator/homes/:id/availability)
 *  → the admin History panel for that home shows `availability.updated` with the
 *    old / new count and source OPERATOR, newest first
 *  → the events API refuses non-admins
 *  → a second change keeps the first row (append-only)
 *
 * Self-seeds via /api/dev/*. Nothing is emailed.
 */
import { test, expect, type Browser, type Page } from '@playwright/test';

const ts = Date.now();
const OP = `op-events-${ts}@test.carelinkai.com`;
const ADMIN = 'admin@carelinkai.com';
const HOME = `E2E History Home ${ts}`;

// Two fixed overlays intercept clicks in a fresh context (OL-154): the
// cookie-consent banner and, for logged-in users, the onboarding modal.
// Pre-seed both "already done" flags so neither renders.
const CONSENT_INIT = () => {
  try {
    localStorage.setItem('carelinkai_cookie_consent', JSON.stringify({ necessary: true, analytics: false, marketing: false }));
    for (const role of ['ADMIN', 'OPERATOR', 'FAMILY', 'DISCHARGE_PLANNER']) {
      localStorage.setItem(`carelinkai_onboarding_completed_${role}`, 'true');
    }
  } catch {
    /* ignore */
  }
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
async function api(page: Page, method: string, path: string, body?: unknown) {
  return page.evaluate(async ({ method, path, body }) => {
    const r = await fetch(path, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined, credentials: 'include' });
    let json: any = null;
    try { json = await r.json(); } catch { /* none */ }
    return { status: r.status, json };
  }, { method, path, body });
}

test.describe.configure({ mode: 'serial' });

test.describe('@critical append-only history', () => {
  let homeId = '';

  test.beforeAll(async ({ request }) => {
    const op = await request.post('/api/dev/upsert-operator', { data: { email: OP, companyName: `History Ops ${ts}`, homes: [{ name: HOME }] } });
    expect(op.status()).toBe(200);
    homeId = (await op.json()).homes[0].id;
    await request.post('/api/dev/upsert-admin', { data: { email: ADMIN } });
  });

  test.afterAll(async ({ request }) => {
    await request.delete('/api/dev/placement-search', { data: { email: OP } }).catch(() => undefined);
  });

  test('operator availability change → admin History shows availability.updated (old/new count, source OPERATOR)', async ({ browser }) => {
    const op = await login(browser, OP);
    const first = await api(op, 'PUT', `/api/operator/homes/${homeId}/availability`, { count: 3 });
    expect(first.status, JSON.stringify(first.json)).toBe(200);
    expect(first.json.view).toMatchObject({ count: 3, source: 'OPERATOR' });
    const second = await api(op, 'PUT', `/api/operator/homes/${homeId}/availability`, { count: 1 });
    expect(second.status).toBe(200);
    // The operator cannot read admin history.
    expect((await api(op, 'GET', `/api/admin/homes/${homeId}/events`)).status).toBe(403);
    await op.context().close();

    const admin = await login(browser, ADMIN);
    const list = await api(admin, 'GET', `/api/admin/homes/${homeId}/events`);
    expect(list.status).toBe(200);
    const avail = (list.json.events as any[]).filter((e) => e.eventType === 'availability.updated');
    expect(avail.length, 'both changes are kept (append-only)').toBe(2);
    expect(avail[0]).toMatchObject({ entityType: 'AVAILABILITY', entityId: homeId, field: 'availabilityCount', source: 'OPERATOR', actorRole: 'OPERATOR', oldValue: { count: 3 }, newValue: { count: 1, source: 'OPERATOR' } });
    expect(avail[1]).toMatchObject({ oldValue: { count: null }, newValue: { count: 3 } });
    expect(new Date(avail[0].occurredAt).getTime()).toBeGreaterThanOrEqual(new Date(avail[1].occurredAt).getTime());

    // The History tab renders the same rows.
    await admin.goto(`/admin/homes/${homeId}`, { waitUntil: 'domcontentloaded' });
    const historyTab = admin.getByRole('button', { name: /^history$/i });
    await expect(historyTab).toBeVisible({ timeout: 30000 });
    await historyTab.click();
    const panel = admin.getByTestId('home-history');
    await expect(panel).toBeVisible();
    const rows = panel.locator('[data-testid="home-history-row"][data-event-type="availability.updated"]');
    await expect(rows).toHaveCount(2);
    await expect(rows.first()).toHaveAttribute('data-source', 'OPERATOR');
    await expect(rows.first().getByTestId('home-history-old')).toContainText('"count":3');
    await expect(rows.first().getByTestId('home-history-new')).toContainText('"count":1');
    await admin.context().close();
  });
});
