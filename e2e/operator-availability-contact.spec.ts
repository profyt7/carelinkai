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
 *
 *  Runs in the e2e-operator-claim CI job (operator-portal specs), not the
 *  81-spec e2e-concierge job: the operator portal page is the heaviest route the
 *  dev server compiles, and on the concierge job's shared server that first
 *  compile tipped it over its memory ceiling (restart mid-test, OL-146 residual).
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
// First hit of the operator portal compiles it lazily in `next dev`; on a 2-core
// runner that plus the save can take well over Playwright's default budget.
test.setTimeout(240_000);

test.describe('@critical operator availability-contact card', () => {
  let homeId = '';

  test.beforeAll(async ({ request }) => {
    // onboarded: true → onboarding complete + BAA/DPA accepted, so the portal renders the home page (no wizard / gate).
    // The CI dev server restarts itself near its memory ceiling (OL-146 residual); seeding retries through that.
    await expect(async () => {
      const op = await request.post('/api/dev/upsert-operator', { data: { email: OP, companyName: `Contact Ops ${ts}`, onboarded: true, homes: [{ name: HOME, city: 'Cleveland' }] } });
      expect(op.status()).toBe(200);
      homeId = (await op.json()).homes[0].id;
      expect((await request.post('/api/dev/upsert-admin', { data: { email: ADMIN } })).status()).toBe(200);
    }).toPass({ timeout: 90_000, intervals: [2000, 5000, 10000] });
  });

  test.afterAll(async ({ request }) => {
    await request.post('/api/dev/availability-ping', { data: { action: 'cleanup', homeIds: [homeId], emails: [OP] } }).catch(() => undefined);
  });

  test('operator saves contact + opt-in → admin pings page lists the home as eligible → History has contact.opted_in (OPERATOR)', async ({ browser }) => {
    const op = await login(browser, OP);
    const card = op.getByTestId('availability-contact-card');
    // Open the portal page until the card has loaded its contact (a dev-server restart
    // mid-navigation leaves data-loaded=false — reload and try again, no fixed sleeps).
    await expect(async () => {
      await op.goto(`/operator/homes/${homeId}`, { waitUntil: 'domcontentloaded' });
      await expect(card).toBeVisible({ timeout: 20000 });
      await expect(card).toHaveAttribute('data-loaded', 'true', { timeout: 15000 });
    }).toPass({ timeout: 120_000, intervals: [1000, 3000, 5000] });
    await expect(card.getByTestId('availability-contact-status')).toHaveText('Not opted in');
    await expect(card.getByText(OPT_IN_LABEL)).toBeVisible();

    await card.getByLabel('Contact name').fill('Pat Admissions');
    await card.locator('input[name="email"]').fill(`pat-${ts}@test.carelinkai.com`);
    await card.getByTestId('availability-contact-optin').check();
    let saved: any = null;
    await expect(async () => {
      const [res] = await Promise.all([
        op.waitForResponse((r) => r.url().includes('/api/operator/availability-contact') && r.request().method() === 'PUT', { timeout: 45_000 }),
        card.getByTestId('availability-contact-save').click(),
      ]);
      expect(res.status()).toBe(200);
      saved = await res.json();
    }).toPass({ timeout: 120_000, intervals: [2000, 5000] });
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
