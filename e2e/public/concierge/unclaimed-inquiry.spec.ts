/**
 * OL-177 — a family inquiry on an UNCLAIMED listing lands in the admin inbound
 * queue (same table / page as inbound calls) and the family is told
 * "A CareLinkAI advisor will follow up." — no time promise. A claimed home's
 * inquiry does NOT enter the queue (its operator gets it).
 *
 * Fixtures via dev endpoints (ALLOW_DEV_ENDPOINTS=1): an unclaimed home (owned
 * by the directory placeholder, OL-176 seed field) and a claimed control home.
 * RESEND_API_KEY is unset in CI, so the admin alert + family email are skipped,
 * never sent; the unit test covers their content.
 *
 *   npx playwright test --config=playwright.e2e.config.ts e2e/public/concierge/unclaimed-inquiry.spec.ts
 */
import { test, expect, type Browser, type Page } from '@playwright/test';

const ts = Date.now();
const ADMIN = 'admin@carelinkai.com';
const OP_EMAIL = `unclaimed-inquiry-op-${ts}@test.carelinkai.com`;
const UNCLAIMED_HOME = `E2E Unclaimed Inquiry Home ${ts}`;
const CLAIMED_HOME = `E2E Claimed Inquiry Home ${ts}`;
const FAMILY = { name: `Jordan Family ${ts}`, email: `jordan-${ts}@test.carelinkai.com`, phone: '(216) 555-0142' };

let unclaimedId = '';
let claimedId = '';

const CONSENT_INIT = () => {
  try {
    localStorage.setItem('carelinkai_cookie_consent', JSON.stringify({ necessary: true, analytics: false, marketing: false }));
    localStorage.setItem('carelinkai_onboarding_completed_ADMIN', 'true');
  } catch { /* ignore */ }
};

async function adminPage(browser: Browser): Promise<Page> {
  const ctx = await browser.newContext();
  await ctx.addInitScript(CONSENT_INIT);
  const page = await ctx.newPage();
  await page.goto('/');
  const status = await page.evaluate(async (e) => (await fetch('/api/dev/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: e }), credentials: 'include' })).status, ADMIN);
  expect(status, 'dev-login admin').toBe(200);
  return page;
}

async function webRows(admin: Page): Promise<any[]> {
  const r = await admin.evaluate(async () => {
    const res = await fetch('/api/admin/inbound-leads?status=all&callerType=family', { credentials: 'include' });
    return { status: res.status, json: await res.json().catch(() => null) };
  });
  expect(r.status).toBe(200);
  return (r.json?.rows ?? []).filter((row: any) => row.source === 'WEB_INQUIRY');
}

test.describe('@critical OL-177 unclaimed-home inquiry → admin inbound queue', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180_000);

  test.beforeAll(async ({ request }) => {
    await request.post('/api/dev/upsert-admin', { data: { email: ADMIN } });
    const res = await request.post('/api/dev/upsert-operator', {
      data: {
        email: OP_EMAIL,
        companyName: `Unclaimed Inquiry Ops ${ts}`,
        homes: [
          { name: UNCLAIMED_HOME, city: 'Beachwood', zipCode: '44122', careLevel: ['ASSISTED'], unclaimed: true },
          { name: CLAIMED_HOME, city: 'Beachwood', zipCode: '44122', careLevel: ['ASSISTED'] },
        ],
      },
    });
    expect(res.status(), 'dev seed').toBe(200);
    const homes = (await res.json()).homes as Array<{ id: string; name: string }>;
    unclaimedId = homes.find((h) => h.name === UNCLAIMED_HOME)!.id;
    claimedId = homes.find((h) => h.name === CLAIMED_HOME)!.id;
  });

  // Removes both homes, their inquiries (cascade) and the queue rows keyed to them.
  test.afterAll(async ({ request }) => {
    await request.delete('/api/dev/upsert-operator', { data: { email: OP_EMAIL, homeIds: [unclaimedId] } }).catch(() => undefined);
  });

  test('family submits on the unclaimed listing → advisor confirmation, no time promise', async ({ page }) => {
    await page.addInitScript(CONSENT_INIT);
    await page.goto(`/homes/${unclaimedId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1, name: UNCLAIMED_HOME })).toBeVisible({ timeout: 60_000 });

    await page.getByRole('button', { name: 'Send Inquiry' }).click();
    await page.locator('#name').fill(FAMILY.name);
    await page.locator('#email').fill(FAMILY.email);
    await page.locator('#phone').fill(FAMILY.phone);
    await page.locator('#moveInTimeframe').selectOption('Immediately');
    await page.locator('#payerSource').selectOption('PRIVATE_FUNDS');
    await page.getByRole('checkbox', { name: 'Assisted Living' }).check();
    await page.getByRole('button', { name: 'Continue →' }).click();
    const [resp] = await Promise.all([
      page.waitForResponse((r) => r.url().endsWith('/api/inquiries') && r.request().method() === 'POST', { timeout: 60_000 }),
      page.getByRole('button', { name: 'Submit Request' }).click(),
    ]);
    expect(resp.status()).toBe(201);
    expect((await resp.json()).unclaimed).toBe(true);

    const confirm = page.getByTestId('inquiry-confirmation-unclaimed');
    await expect(confirm).toBeVisible({ timeout: 30_000 });
    await expect(confirm).toContainText('A CareLinkAI advisor will follow up.');
    await expect(page.locator('body')).not.toContainText(/within \d+ (hours?|days?)|24 hours|let them know a family is waiting/i);
  });

  test('admin: the inquiry is in the inbound queue as a family web inquiry', async ({ browser }) => {
    const admin = await adminPage(browser);
    const row = (await webRows(admin)).find((r) => r.name === FAMILY.name);
    expect(row, 'queued web inquiry').toBeTruthy();
    expect(row).toMatchObject({
      source: 'WEB_INQUIRY',
      callerType: 'FAMILY',
      status: 'NEW',
      organization: UNCLAIMED_HOME,
      contactEmail: FAMILY.email,
      urgency: 'TODAY',
    });
    expect(row.reason).toContain(UNCLAIMED_HOME);
    expect(row.reason).toContain('Fee-eligible');
    expect(row.reason).toContain('Immediately');
    expect(row.inquiryId).toBeTruthy();

    await admin.goto('/admin/inbound-leads', { waitUntil: 'domcontentloaded' });
    const tr = admin.locator(`[data-testid="inbound-lead-row"][data-lead-id="${row.id}"]`);
    await expect(tr).toBeVisible({ timeout: 30_000 });
    await expect(tr.getByTestId('flag-web-inquiry')).toBeVisible();
    await expect(tr.getByTestId('inbound-lead-email')).toHaveText(FAMILY.email);
    await expect(tr.getByTestId('inbound-lead-inquiry')).toHaveAttribute('href', `/admin/inquiries/${row.inquiryId}`);
  });

  test('claimed home: the inquiry goes to its operator, not the inbound queue', async ({ request, browser }) => {
    const name = `Claimed Control ${ts}`;
    const res = await request.post('/api/inquiries', {
      data: { homeId: claimedId, contactName: name, contactEmail: `claimed-${ts}@test.carelinkai.com`, careNeeds: [], source: 'WEBSITE' },
    });
    expect(res.status()).toBe(201);
    expect((await res.json()).unclaimed).toBe(false);
    const admin = await adminPage(browser);
    expect((await webRows(admin)).some((r) => r.name === name)).toBe(false);
  });
});
