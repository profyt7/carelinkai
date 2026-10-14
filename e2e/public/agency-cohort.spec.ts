/**
 * Cleveland home-care agency cohort landing + claim flow (sprint W3 item 2 /
 * sprint 1.6, 2.2).
 *
 *  - /cleveland/home-care-agencies renders logged-out: 200, no redirect, no
 *    noindex, canonical present, listed in the sitemap;
 *  - page → "Claim your agency listing" → submit creates a ClaimRequest tagged
 *    CLEVELAND_AGENCIES (asserted on the real POST /api/claim/request response);
 *  - a cohort claim link (/claim?token=… with cohort=CLEVELAND_AGENCIES, no
 *    homeId) lands on the page with the token, and its submit is recorded as a
 *    claim-link claim (source 'claim_link', verified=true);
 *  - the original operator claim links (homeId, no cohort) are untouched.
 *
 * Needs the same NEXTAUTH_SECRET as the dev server (CI sets it in the job env;
 * locally pass NEXTAUTH_SECRET=<same value> to both). No email is sent.
 *
 * Runs with the ./e2e config:
 *   npx playwright test --config=playwright.e2e.config.ts e2e/public/agency-cohort.spec.ts
 */
import { test, expect } from '@playwright/test';
import { signClaimToken } from '../../src/lib/claim-token';

const PAGE = '/cleveland/home-care-agencies';
const ts = Date.now();
const uniq = (p: string) => `${p}-${ts}-${Math.floor(Math.random() * 1e4)}@test.carelinkai.com`;

// /api/claim/request is rate-limited per client IP (30 / 10 min). Give each
// run its own forwarded IP so repeated local runs / CI retries never trip it.
const RUN_IP = `203.0.113.${(ts % 200) + 1}`;
test.use({ extraHTTPHeaders: { 'x-forwarded-for': RUN_IP } });

const SUBMIT = { name: 'Claim your agency listing' } as const;

function cohortToken(email: string) {
  const secret = process.env.NEXTAUTH_SECRET || '';
  test.skip(!secret, 'NEXTAUTH_SECRET must be set (and match the dev server) to mint a claim link');
  const now = Math.floor(Date.now() / 1000);
  return signClaimToken(
    { operatorEmail: email, clevelandFounder: false, cohort: 'CLEVELAND_AGENCIES', iat: now, exp: now + 3600 },
    secret
  );
}

test.describe('@critical agency cohort landing', () => {
  test(`GET ${PAGE} → 200 logged-out, indexable, canonical, H1 + CTA`, async ({ request }) => {
    const res = await request.get(PAGE, { maxRedirects: 0 });
    expect(res.status()).toBe(200);
    expect(res.headers()['location']).toBeUndefined();
    expect((res.headers()['x-robots-tag'] ?? '').toLowerCase()).not.toContain('noindex');
    const html = await res.text();
    expect(html).not.toMatch(/<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i);
    expect(html).toMatch(/<link[^>]+rel="canonical"[^>]+getcarelinkai\.com\/cleveland\/home-care-agencies/);
    expect(html).toContain('Home Care Agencies in Cleveland, OH');
    expect(html).toContain('Claim your agency listing');
    expect(html).not.toMatch(/\/auth\/login\?callbackUrl/);
  });

  test('is listed in sitemap.xml', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain('https://getcarelinkai.com/cleveland/home-care-agencies');
  });

  test('page → claim submit creates a CLEVELAND_AGENCIES claim request', async ({ page }) => {
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Home Care Agencies in Cleveland/);

    await page.getByTestId('agency-claim-cta').click();
    const form = page.getByTestId('agency-claim-form');
    await expect(form).toBeVisible();
    // The submit button is disabled until React has hydrated (AgencyClaimForm);
    // the checkboxes are controlled, so interact only once that is true.
    await expect(form.getByRole('button', SUBMIT)).toBeEnabled();

    await form.locator('input[name="orgName"]').fill(`E2E Home Care ${ts}`);
    await form.locator('input[name="contactName"]').fill('E2E Scheduler');
    await form.locator('input[name="contactEmail"]').fill(uniq('agency'));
    await form.locator('input[name="phone"]').fill('216-555-0100');
    await form.locator('input[name="city"]').fill('Lakewood');
    await form.getByLabel('Personal care / companionship').check();
    await form.getByLabel('Respite care').check();

    const [res] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/claim/request') && r.request().method() === 'POST'),
      form.getByRole('button', SUBMIT).click(),
    ]);
    expect(res.status()).toBe(201);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.serviceTypes).toBe(2);
    expect(json.id).toBeTruthy();
    expect(json.cohort).toBe('CLEVELAND_AGENCIES');
    expect(json.source).toBe('landing_page');
    expect(json.verified).toBe(false);

    await expect(page.getByTestId('agency-claim-success')).toBeVisible();
  });

  test('cohort claim link → landing page with token → submit tagged CLEVELAND_AGENCIES + claim_link', async ({ page, request }) => {
    const email = uniq('agency-link');
    const token = cohortToken(email);

    // /claim hands a cohort token (no homeId) to the cohort landing page.
    const hop = await request.get(`/claim?token=${encodeURIComponent(token)}`, { maxRedirects: 0 });
    expect([302, 307]).toContain(hop.status());
    const loc = hop.headers()['location'] ?? '';
    expect(loc).toContain('/cleveland/home-care-agencies?token=');
    expect(loc).not.toContain('/auth/register');

    await page.goto(loc, { waitUntil: 'domcontentloaded' });
    const form = page.getByTestId('agency-claim-form');
    await expect(form).toBeVisible();
    await expect(form.locator('input[name="contactEmail"]')).toHaveValue(email);
    await expect(form.getByRole('button', SUBMIT)).toBeEnabled(); // hydrated
    await form.locator('input[name="orgName"]').fill(`E2E Linked Agency ${ts}`);

    const [res] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/claim/request') && r.request().method() === 'POST'),
      form.getByRole('button', SUBMIT).click(),
    ]);
    expect(res.status()).toBe(201);
    const json = await res.json();
    expect(json.cohort).toBe('CLEVELAND_AGENCIES');
    expect(json.source).toBe('claim_link');
    expect(json.verified).toBe(true);
    await expect(page.getByTestId('agency-claim-success')).toBeVisible();
  });

  test('an invalid cohort token is ignored and the page still renders', async ({ request }) => {
    const res = await request.get(`${PAGE}?token=not-a-token`, { maxRedirects: 0 });
    expect(res.status()).toBe(200);
    expect(await res.text()).not.toContain('You opened a claim link');
  });

  test('operator claim links (homeId, no cohort) keep their register redirect', async ({ request }) => {
    const secret = process.env.NEXTAUTH_SECRET || '';
    test.skip(!secret, 'NEXTAUTH_SECRET must be set');
    const now = Math.floor(Date.now() / 1000);
    const token = signClaimToken(
      { operatorEmail: uniq('operator'), homeId: 'home-does-not-matter', clevelandFounder: true, iat: now, exp: now + 3600 },
      secret
    );
    const res = await request.get(`/claim?token=${encodeURIComponent(token)}`, { maxRedirects: 0 });
    expect([302, 307]).toContain(res.status());
    expect(res.headers()['location'] ?? '').toContain('/auth/register?role=OPERATOR&claimToken=');
  });
});

test.describe('claim request API guards', () => {
  test('rejects an unknown cohort and a missing email', async ({ request }) => {
    const bad = await request.post('/api/claim/request', { data: { cohort: 'NOPE', orgName: 'X', contactEmail: 'a@b.co' } });
    expect(bad.status()).toBe(400);
    const noEmail = await request.post('/api/claim/request', { data: { cohort: 'CLEVELAND_AGENCIES', orgName: 'X' } });
    expect(noEmail.status()).toBe(400);
  });

  test('honeypot submissions are swallowed (201, no id)', async ({ request }) => {
    const res = await request.post('/api/claim/request', {
      data: { cohort: 'CLEVELAND_AGENCIES', orgName: 'Bot Co', contactEmail: uniq('bot'), company_url: 'http://spam' },
    });
    expect(res.status()).toBe(201);
    expect((await res.json()).id).toBeNull();
  });
});
