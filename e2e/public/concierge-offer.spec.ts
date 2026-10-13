/**
 * /concierge — family concierge offer with the payer-source screener in front
 * (sprint W3 item 5, W4 0a).
 *
 *  - renders logged-out (200, indexable, canonical); the server HTML carries
 *    the screener but NOT the offer and NO price;
 *  - private-pay / LTC-insurance → the offer with the decided fee model
 *    ($2,500 flat, facility-paid, families pay nothing) + "Request concierge
 *    help" → a request in the EXISTING DP concierge queue tagged
 *    source=concierge_page carrying the screener answer (asserted via the
 *    admin queue API);
 *  - Medicaid / Medicare / VA / not-sure → free help, the offer never renders,
 *    and no dollar price appears anywhere on the page.
 *
 * Runs with the ./e2e config:
 *   npx playwright test --config=playwright.e2e.config.ts e2e/public/concierge-offer.spec.ts
 */
import { test, expect, type Page } from '@playwright/test';

const PRICE = /\$\s?\d/;
const ts = Date.now();

async function answer(page: Page, label: RegExp) {
  await page.goto('/concierge', { waitUntil: 'domcontentloaded' });
  const screener = page.getByTestId('concierge-screener');
  await expect(screener).toBeVisible();
  // The radios are controlled: interact only once React has hydrated.
  await expect(screener).toHaveAttribute('data-hydrated', 'true');
  await screener.getByLabel(label).check();
  const cont = screener.getByRole('button', { name: 'Continue' });
  await expect(cont).toBeEnabled(); // disabled until hydrated + a choice is made
  await cont.click();
}

async function adminFetch(page: Page, path: string) {
  return page.evaluate(async (p) => {
    const r = await fetch(p, { credentials: 'include' });
    return { status: r.status, json: await r.json().catch(() => null) };
  }, path);
}

test.describe('@critical /concierge offer + payer screener', () => {
  test('GET /concierge → 200 logged-out, indexable, screener in HTML, offer + price NOT in HTML', async ({ request }) => {
    const res = await request.get('/concierge', { maxRedirects: 0 });
    expect(res.status()).toBe(200);
    expect(res.headers()['location']).toBeUndefined();
    expect((res.headers()['x-robots-tag'] ?? '').toLowerCase()).not.toContain('noindex');
    const html = await res.text();
    expect(html).not.toMatch(/<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i);
    expect(html).toMatch(/<link[^>]+rel="canonical"[^>]+getcarelinkai\.com\/concierge/);
    expect(html).toContain('Family Concierge');
    expect(html).toContain('data-testid="concierge-screener"');
    expect(html).not.toContain('data-testid="concierge-offer"');
    expect(html).not.toContain('2,500');
    // Visible text only — the RSC payload in <script> uses "$3"-style refs.
    const visible = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
    expect(visible).not.toMatch(PRICE);
  });

  test('is in sitemap.xml', async ({ request }) => {
    expect(await (await request.get('/sitemap.xml')).text()).toContain('https://getcarelinkai.com/concierge');
  });

  test('private funds → offer with the $2,500 facility-paid fee model → request lands in the admin concierge queue as concierge_page', async ({ page, browser, request }) => {
    await answer(page, /Private funds/);
    const offer = page.getByTestId('concierge-offer');
    await expect(offer).toBeVisible();
    await expect(page.getByTestId('concierge-free-lane')).toHaveCount(0);
    const fee = offer.getByTestId('concierge-fee-model');
    await expect(fee).toContainText('$2,500');
    await expect(fee).toContainText(/paid by the facility/i);
    await expect(fee).toContainText(/families pay nothing/i);
    await expect(fee).toContainText(/Medicaid, Medicare or the VA/);

    const form = offer.getByTestId('concierge-request-form');
    await expect(form).toBeVisible();
    const email = `family-${ts}@test.carelinkai.com`;
    await form.locator('input[name="contactName"]').fill('E2E Family');
    await form.locator('input[name="contactEmail"]').fill(email);
    await form.locator('input[name="contactPhone"]').fill('216-555-0199');
    await form.locator('input[name="location"]').fill('Westlake');
    await form.locator('textarea[name="careNeeds"]').fill(`E2ECONCIERGEPAGE${ts} memory care with medication help`);
    await form.locator('select[name="timeline"]').selectOption('urgent');
    const [res] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/concierge/request') && r.request().method() === 'POST'),
      form.getByTestId('concierge-request-cta').click(),
    ]);
    expect(res.status()).toBe(201);
    const json = await res.json();
    expect(json).toMatchObject({ ok: true, source: 'concierge_page', status: 'SUBMITTED' });
    expect(json.id).toBeTruthy();
    await expect(page.getByTestId('concierge-request-success')).toBeVisible();

    // The request is in the EXISTING DP concierge queue (/admin/concierge), tagged + carrying the lane.
    const adminEmail = 'admin@carelinkai.com';
    await request.post('/api/dev/upsert-admin', { data: { email: adminEmail } });
    const ctx = await browser.newContext();
    const admin = await ctx.newPage();
    await admin.goto('/');
    const login = await admin.evaluate(async (e) => {
      const r = await fetch('/api/dev/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: e }), credentials: 'include' });
      return r.status;
    }, adminEmail);
    expect(login).toBe(200);
    const queue = await adminFetch(admin, '/api/admin/concierge?status=SUBMITTED');
    expect(queue.status).toBe(200);
    const row = (queue.json?.requests ?? []).find((r: any) => r.id === json.id);
    expect(row, 'row in admin queue').toBeTruthy();
    expect(row.source).toBe('concierge_page');
    expect(row.payerSource).toBe('PRIVATE_FUNDS');
    expect(row.conciergeStatus).toBe('SUBMITTED');
    const detail = await adminFetch(admin, `/api/admin/concierge/${json.id}`);
    expect(detail.status).toBe(200);
    expect(detail.json?.request?.patientInfo?.contactEmail).toBe(email);
    expect(detail.json?.request?.patientInfo?.medicalNeeds).toContain(`E2ECONCIERGEPAGE${ts}`);
    // Visible in the admin queue UI with the source badge.
    await admin.goto('/admin/concierge', { waitUntil: 'domcontentloaded' });
    await expect(admin.getByText(`E2ECONCIERGEPAGE${ts}`, { exact: false }).first()).toBeVisible({ timeout: 30000 });
    await expect(admin.getByTestId('source-badge').first()).toHaveText('concierge_page');
    await ctx.close();
  });

  test('long-term care insurance → offer + form too', async ({ page }) => {
    await answer(page, /Long-term care insurance/);
    await expect(page.getByTestId('concierge-offer')).toBeVisible();
    await expect(page.getByTestId('concierge-request-form')).toBeVisible();
  });

  for (const [label, name] of [
    [/Medicaid/, 'Medicaid / waiver'],
    [/Medicare/, 'Medicare / Medicare Advantage'],
    [/VA benefits/, 'VA benefits'],
    [/Not sure yet/, 'not sure yet'],
  ] as const) {
    test(`${name} → free help, never the offer, never a price`, async ({ page }) => {
      await answer(page, label);
      await expect(page.getByTestId('concierge-free-lane')).toBeVisible();
      await expect(page.getByTestId('concierge-offer')).toHaveCount(0);
      await expect(page.getByTestId('concierge-request-form')).toHaveCount(0);
      const text = await page.getByTestId('concierge-page').innerText();
      expect(text).not.toMatch(PRICE);
      expect(text).not.toContain('2,500');
      expect(text).toMatch(/free/i);
      await expect(page.getByRole('link', { name: 'Start the free search' })).toHaveAttribute('href', '/search');
    });
  }

  test('the API refuses a free-lane request even if posted directly', async ({ request }) => {
    const res = await request.post('/api/concierge/request', {
      headers: { 'x-forwarded-for': `203.0.113.${(ts % 200) + 1}` },
      data: { payerSource: 'MEDICAID_WAIVER', contactName: 'X Y', contactEmail: `x-${ts}@test.carelinkai.com`, careNeeds: 'memory care please' },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).freeHelp).toBe('/cleveland');
  });

  test('"Change my answer" returns to the screener', async ({ page }) => {
    await answer(page, /VA benefits/);
    await page.getByRole('button', { name: 'Change my answer' }).click();
    await expect(page.getByTestId('concierge-screener')).toBeVisible();
  });
});
