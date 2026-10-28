/**
 * OL-179 — "Schedule a Tour" on an UNCLAIMED listing reaches the admin
 * inbound queue (tagged "web tour request"), never a black hole:
 *   - anonymous visitor: the button opens the listing form; step 2's tour
 *     date/time posts to /api/inquiries (tourDate is now saved);
 *   - signed-in family: the button opens the tour modal; the request posts to
 *     /api/family/tours/request.
 * Both confirm "A CareLinkAI advisor will follow up." with no time promise.
 * RESEND_API_KEY is unset in CI → the admin alert + family email are skipped,
 * never sent (the unit test covers their content).
 *
 *   npx playwright test --config=playwright.e2e.config.ts e2e/public/concierge/unclaimed-tour-request.spec.ts
 */
import { test, expect, type Browser, type Page } from '@playwright/test';

const ts = Date.now();
const ADMIN = 'admin@carelinkai.com';
const FAMILY_EMAIL = `tour-family-${ts}@test.carelinkai.com`;
const OP_EMAIL = `unclaimed-tour-op-${ts}@test.carelinkai.com`;
const HOME = `E2E Unclaimed Tour Home ${ts}`;
const ANON = { name: `Casey Visitor ${ts}`, email: `casey-${ts}@test.carelinkai.com` };

let homeId = '';

const CONSENT_INIT = () => {
  try {
    localStorage.setItem('carelinkai_cookie_consent', JSON.stringify({ necessary: true, analytics: false, marketing: false }));
    for (const r of ['ADMIN', 'FAMILY']) localStorage.setItem(`carelinkai_onboarding_completed_${r}`, 'true');
  } catch { /* ignore */ }
};

async function loginAs(browser: Browser, email: string): Promise<Page> {
  const ctx = await browser.newContext();
  await ctx.addInitScript(CONSENT_INIT);
  const page = await ctx.newPage();
  await page.goto('/');
  const status = await page.evaluate(async (e) => (await fetch('/api/dev/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: e }), credentials: 'include' })).status, email);
  expect(status, `dev-login ${email}`).toBe(200);
  return page;
}

async function tourRows(admin: Page): Promise<any[]> {
  const r = await admin.evaluate(async () => {
    const res = await fetch('/api/admin/inbound-leads?status=all&callerType=family', { credentials: 'include' });
    return { status: res.status, json: await res.json().catch(() => null) };
  });
  expect(r.status).toBe(200);
  return (r.json?.rows ?? []).filter((row: any) => row.source === 'WEB_TOUR_REQUEST');
}

test.describe('@critical OL-179 unclaimed-home tour request → admin inbound queue', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180_000);

  test.beforeAll(async ({ request }) => {
    await request.post('/api/dev/upsert-admin', { data: { email: ADMIN } });
    expect((await request.post('/api/dev/upsert-family', { data: { email: FAMILY_EMAIL, payerSource: 'PRIVATE_FUNDS' } })).ok(), 'family seed').toBe(true);
    const res = await request.post('/api/dev/upsert-operator', {
      data: { email: OP_EMAIL, companyName: `Unclaimed Tour Ops ${ts}`, homes: [{ name: HOME, city: 'Beachwood', zipCode: '44122', careLevel: ['ASSISTED'], unclaimed: true }] },
    });
    expect(res.status(), 'dev seed').toBe(200);
    homeId = (await res.json()).homeId;
  });

  // Removes the home, its inquiries / tour requests (cascade) and the queue rows keyed to it.
  test.afterAll(async ({ request }) => {
    await request.delete('/api/dev/upsert-operator', { data: { email: OP_EMAIL, homeIds: [homeId] } }).catch(() => undefined);
  });

  test('anonymous: Schedule a Tour → listing form with a tour date → advisor confirmation → queued', async ({ page, browser }) => {
    await page.addInitScript(CONSENT_INIT);
    await page.goto(`/homes/${homeId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1, name: HOME })).toBeVisible({ timeout: 60_000 });

    await page.getByRole('button', { name: 'Schedule a Tour', exact: true }).first().click();
    await page.locator('#name').fill(ANON.name);
    await page.locator('#email').fill(ANON.email);
    await page.getByRole('checkbox', { name: 'Assisted Living' }).check();
    await page.getByRole('button', { name: 'Continue →' }).click();
    const day = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
    await page.locator('#tourDate').fill(day);
    await page.locator('#tourTime').selectOption('10:00 AM');
    const [resp] = await Promise.all([
      page.waitForResponse((r) => r.url().endsWith('/api/inquiries') && r.request().method() === 'POST', { timeout: 60_000 }),
      page.getByRole('button', { name: 'Submit Request' }).click(),
    ]);
    expect(resp.status()).toBe(201);
    const body = await resp.json();
    expect(body.unclaimed).toBe(true);
    expect(body.inquiry.tourDate, 'the picked tour time is saved').toBeTruthy();
    await expect(page.getByTestId('inquiry-confirmation-unclaimed')).toContainText('A CareLinkAI advisor will follow up.');

    const admin = await loginAs(browser, ADMIN);
    const row = (await tourRows(admin)).find((r) => r.name === ANON.name);
    expect(row, 'queued web tour request').toBeTruthy();
    expect(row).toMatchObject({ source: 'WEB_TOUR_REQUEST', callerType: 'FAMILY', organization: HOME, contactEmail: ANON.email, inquiryId: body.inquiry.id, tourRequestId: null });
    expect(row.reason).toContain(`Web tour request on unclaimed listing: ${HOME} · requested `);

    await admin.goto('/admin/inbound-leads', { waitUntil: 'domcontentloaded' });
    const tr = admin.locator(`[data-testid="inbound-lead-row"][data-lead-id="${row.id}"]`);
    await expect(tr).toBeVisible({ timeout: 30_000 });
    await expect(tr.getByTestId('flag-web-tour-request')).toHaveText('web tour request');
  });

  test('signed-in family: Schedule a Tour opens the modal; the tour request is queued with their payer lane', async ({ browser }) => {
    const fam = await loginAs(browser, FAMILY_EMAIL);
    await fam.goto(`/homes/${homeId}`, { waitUntil: 'domcontentloaded' });
    // Signed in, the member shell repeats the name in its own <h1>.
    await expect(fam.getByRole('heading', { level: 1, name: HOME }).first()).toBeVisible({ timeout: 60_000 });
    await fam.getByRole('button', { name: 'Schedule a Tour', exact: true }).first().click();
    await expect(fam.getByText('Select Date Range')).toBeVisible({ timeout: 30_000 }); // the tour modal's first step

    const when = new Date(Date.now() + 4 * 86_400_000);
    when.setUTCHours(15, 0, 0, 0);
    const res = await fam.evaluate(async ({ id, iso }) => {
      const r = await fetch('/api/family/tours/request', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ homeId: id, requestedTimes: [iso] }) });
      return { status: r.status, json: await r.json().catch(() => null) };
    }, { id: homeId, iso: when.toISOString() });
    expect(res.status).toBe(200);
    expect(res.json).toMatchObject({ success: true, unclaimed: true });

    const admin = await loginAs(browser, ADMIN);
    const row = (await tourRows(admin)).find((r) => r.tourRequestId === res.json.tourRequest.id);
    expect(row, 'queued web tour request').toBeTruthy();
    expect(row).toMatchObject({ source: 'WEB_TOUR_REQUEST', callerType: 'FAMILY', organization: HOME, contactEmail: FAMILY_EMAIL, inquiryId: null, urgency: 'THIS_WEEK' });
    expect(row.reason).toContain('Fee-eligible');
  });
});
