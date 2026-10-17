/**
 * Operator availability-contact card (sprint W5-5).
 *
 *  operator opens their home in the portal → fills the availability contact →
 *  ticks the weekly-email opt-in → Save
 *  → PUT /api/operator/availability-contact stores optedIn + optedInSource
 *    operator_portal + timestamp
 *  → admin pings page lists the home as opted in + eligible
 *  → History has contact.opted_in (source OPERATOR, optedInSource OPERATOR)
 *  PING_ENABLED is still unset in production → nothing sends; nothing is sent
 *  here either (no Resend key).
 */
import { test, expect, type Browser, type Page } from '@playwright/test';

const ts = Date.now();
const OP = `op-contact-${ts}@test.carelinkai.com`;
const ADMIN = 'admin@carelinkai.com';
const HOME = `E2E Contact Home ${ts}`;
const OPT_IN_LABEL = 'Send me a weekly one-line email asking how many beds are open. Reply with a number or STOP.';

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
async function getJson(page: Page, path: string) {
  return page.evaluate(async (p) => {
    const r = await fetch(p, { credentials: 'include' });
    return { status: r.status, json: await r.json().catch(() => null) };
  }, path);
}

test.describe.configure({ mode: 'serial' });

test.describe('@critical operator availability-contact card', () => {
  let homeId = '';

  test.beforeAll(async ({ request }) => {
    // onboarded: true → onboarding complete + BAA/DPA accepted, so the portal renders the home page (no wizard / gate).
    const op = await request.post('/api/dev/upsert-operator', { data: { email: OP, companyName: `Contact Ops ${ts}`, onboarded: true, homes: [{ name: HOME, city: 'Cleveland' }] } });
    expect(op.status()).toBe(200);
    homeId = (await op.json()).homes[0].id;
    await request.post('/api/dev/upsert-admin', { data: { email: ADMIN } });
  });

  test.afterAll(async ({ request }) => {
    await request.post('/api/dev/availability-ping', { data: { action: 'cleanup', homeIds: [homeId], emails: [OP] } }).catch(() => undefined);
  });

  test('operator saves contact + opt-in → admin pings page lists the home as eligible → History has contact.opted_in (OPERATOR)', async ({ browser }) => {
    const op = await login(browser, OP);
    await op.goto(`/operator/homes/${homeId}`, { waitUntil: 'domcontentloaded' });
    const card = op.getByTestId('availability-contact-card');
    await expect(card).toBeVisible({ timeout: 30000 });
    await expect(card).toHaveAttribute('data-loaded', 'true');
    await expect(card.getByTestId('availability-contact-status')).toHaveText('Not opted in');
    await expect(card.getByText(OPT_IN_LABEL)).toBeVisible();

    await card.getByLabel('Contact name').fill('Pat Admissions');
    await card.locator('input[name="email"]').fill(`pat-${ts}@test.carelinkai.com`);
    await card.getByTestId('availability-contact-optin').check();
    const [res] = await Promise.all([
      op.waitForResponse((r) => r.url().includes('/api/operator/availability-contact') && r.request().method() === 'PUT'),
      card.getByTestId('availability-contact-save').click(),
    ]);
    expect(res.status()).toBe(200);
    const saved = await res.json();
    expect(saved.ok).toBe(true);
    expect(saved.contact).toMatchObject({ homeId, optedIn: true, optedInSource: 'operator_portal', preferredChannel: 'EMAIL', email: `pat-${ts}@test.carelinkai.com` });
    expect(saved.contact.optedInAt).toBeTruthy();
    await expect(card.getByTestId('availability-contact-status')).toHaveText('Opted in');
    await expect(card.getByTestId('availability-contact-msg')).toContainText('opted in');

    // The saved state persists (read back through the same API the card loads from —
    // a full page reload here races the CI dev-server memory restart + operator gate).
    const persisted = await getJson(op, `/api/operator/availability-contact?homeId=${homeId}`);
    expect(persisted.status).toBe(200);
    expect(persisted.json.contact).toMatchObject({ optedIn: true, optedInSource: 'operator_portal', name: 'Pat Admissions' });
    // The operator cannot read the admin ping view.
    expect((await getJson(op, '/api/admin/availability-pings')).status).toBe(403);
    await op.context().close();

    // Admin: the contact is listed, opted in and eligible for the weekly ping.
    const admin = await login(browser, ADMIN);
    const list = await getJson(admin, '/api/admin/availability-pings');
    expect(list.status).toBe(200);
    const row = (list.json.rows as any[]).find((x) => x.homeId === homeId);
    expect(row, 'row on the admin pings view').toBeTruthy();
    expect(row.claimed).toBe(true);
    expect(row.eligible).toBe(true);
    expect(row.contact).toMatchObject({ name: 'Pat Admissions', optedIn: true, optedInSource: 'operator_portal' });
    expect(row.lastPing, 'nothing has been sent').toBeNull();
    await admin.goto('/admin/availability-pings', { waitUntil: 'domcontentloaded' });
    await expect(admin.getByTestId('ping-table')).toBeVisible({ timeout: 30000 });
    const tr = admin.locator(`[data-testid="ping-row"][data-home-id="${homeId}"]`);
    await expect(tr).toHaveAttribute('data-eligible', 'true');
    await expect(tr.getByTestId('ping-eligible')).toContainText('eligible');

    // History (W5-1): the opt-in is recorded with source OPERATOR + optedInSource OPERATOR + timestamp; no contact details.
    const events = await getJson(admin, `/api/admin/homes/${homeId}/events`);
    expect(events.status).toBe(200);
    const evt = (events.json.events as any[]).find((e) => e.eventType === 'contact.opted_in');
    expect(evt).toMatchObject({ entityType: 'AVAILABILITY_PING', entityId: homeId, source: 'OPERATOR', field: 'optedIn', newValue: { optedIn: true, optedInSource: 'OPERATOR' } });
    expect(evt.newValue.optedInAt).toBeTruthy();
    expect(JSON.stringify(evt)).not.toContain('test.carelinkai.com');
    expect(JSON.stringify(evt)).not.toContain('Pat Admissions');
    await admin.context().close();
  });
});
