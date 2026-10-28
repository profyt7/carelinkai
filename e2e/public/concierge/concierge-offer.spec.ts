/**
 * /concierge — family concierge offer with the payer-source screener in front
 * (sprint W3 item 5, W4 0a, W5-3).
 *
 *  - renders logged-out (200, indexable, canonical); the server HTML carries
 *    the screener but NOT the offer and NO price;
 *  - private-pay / LTC-insurance → the paid offer card ($399 flat, inclusions,
 *    guarantee) + "Request the concierge" (CONCIERGE_CHECKOUT_ENABLED unset in
 *    CI) → a request in the EXISTING DP concierge queue tagged
 *    source=concierge_page carrying the screener answer, plus a ConciergeOrder
 *    REQUESTED_UNPAID (asserted via the admin API);
 *  - not sure yet → BOTH: the free-help panel first, the offer below it as a
 *    secondary option (W5 follow-up decision);
 *  - Medicaid / Medicare / VA → free help, the offer never renders, and no dollar
 *    price appears anywhere on the page; Medicaid lands on the waiver-filtered
 *    directory.
 *
 * Runs with the ./e2e config:
 *   npx playwright test --config=playwright.e2e.config.ts e2e/public/concierge/concierge-offer.spec.ts
 */
import { test, expect, type Page } from '@playwright/test';

// Any dollar amount EXCEPT the v2 headline's "$5,000 mistake" (OL-165): that is
// the cost of a wrong move, not a price, and it is on the page for every lane.
const PRICE = /\$\s?(?!5,000\b)\d/;
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
    expect(html).not.toContain('$399');
    // Visible text only — the RSC payload in <script> uses "$3"-style refs.
    const visible = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
    expect(visible).not.toMatch(PRICE);
    // Copy honesty (W5-3 d) + v2 framing (OL-165).
    expect(visible).toContain('Homes never pay to be listed, ranked or recommended.');
    expect(visible).not.toContain('homes never pay us to be recommended');
    expect(visible).toContain('We keep you from making the $5,000 mistake under pressure.');
    expect(visible).not.toMatch(/legwork/i);
  });

  test('is in sitemap.xml', async ({ request }) => {
    expect(await (await request.get('/sitemap.xml')).text()).toContain('https://getcarelinkai.com/concierge');
  });

  test('private funds → paid offer card ($399 + inclusions + guarantee) → "Request the concierge" (flag unset) creates a REQUESTED_UNPAID order in the admin queue', async ({ page, browser, request }) => {
    await answer(page, /Private funds/);
    const offer = page.getByTestId('concierge-offer');
    await expect(offer).toBeVisible();
    await expect(page.getByTestId('concierge-free-lane')).toHaveCount(0);
    await expect(offer.getByTestId('concierge-price')).toContainText('$399');
    const inclusions = offer.getByTestId('concierge-inclusions').locator('li');
    await expect(inclusions).toHaveCount(9); // v2 items 1–9 (OL-165)
    await expect(inclusions.first()).toContainText('20-minute intake call');
    await expect(offer.getByTestId('concierge-inclusions')).toContainText('3–5 homes within 2 business days');
    await expect(offer.getByTestId('concierge-inclusions')).toContainText('Medicaid runway plan');
    await expect(offer.getByTestId('concierge-inclusions')).toContainText('contract red-flag review');
    await expect(offer.getByTestId('concierge-guarantee')).toContainText('full refund');
    await expect(offer.getByTestId('concierge-not-included')).toContainText('Medicaid application filing');
    await expect(offer.getByTestId('concierge-not-included')).toContainText('negotiating on the family’s behalf');

    const form = offer.getByTestId('concierge-request-form');
    await expect(form).toBeVisible();
    // CI has CONCIERGE_CHECKOUT_ENABLED unset → the unpaid request path.
    await expect(form).toHaveAttribute('data-mode-loaded', 'true');
    await expect(form).toHaveAttribute('data-mode', 'request');
    await expect(form.getByTestId('concierge-request-cta')).toHaveText('Request the concierge');
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
    expect(json).toMatchObject({ ok: true, source: 'concierge_page', status: 'SUBMITTED', orderStatus: 'REQUESTED_UNPAID' });
    expect(json.id).toBeTruthy();
    expect(json.orderId).toBeTruthy();
    await expect(page.getByTestId('concierge-request-success')).toBeVisible();

    // The request is in the EXISTING DP concierge queue (/admin/concierge), tagged + carrying the lane + the order.
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
    expect(row.conciergeOrders?.[0]).toMatchObject({ id: json.orderId, status: 'REQUESTED_UNPAID', amountCents: 39900 });
    const detail = await adminFetch(admin, `/api/admin/concierge/${json.id}`);
    expect(detail.status).toBe(200);
    expect(detail.json?.request?.patientInfo?.contactEmail).toBe(email);
    expect(detail.json?.request?.patientInfo?.medicalNeeds).toContain(`E2ECONCIERGEPAGE${ts}`);
    // Visible in the admin queue UI with the source badge + unpaid chip.
    await admin.goto('/admin/concierge', { waitUntil: 'domcontentloaded' });
    await expect(admin.getByText(`E2ECONCIERGEPAGE${ts}`, { exact: false }).first()).toBeVisible({ timeout: 30000 });
    await expect(admin.getByTestId('source-badge').first()).toHaveText('concierge_page');
    await expect(admin.locator('[data-testid="order-chip"][data-order-status="REQUESTED_UNPAID"]').first()).toBeVisible();
    await ctx.close();
  });

  test('long-term care insurance → offer + form too', async ({ page }) => {
    await answer(page, /Long-term care insurance/);
    await expect(page.getByTestId('concierge-offer')).toBeVisible();
    await expect(page.getByTestId('concierge-offer')).toHaveAttribute('data-secondary', 'false');
    await expect(page.getByTestId('concierge-price')).toContainText('$399');
    await expect(page.getByTestId('concierge-request-form')).toBeVisible();
    await expect(page.getByTestId('concierge-free-lane')).toHaveCount(0);
  });

  test('not sure yet → BOTH: free help first (directory, waiver filter, guides, "if Medicaid may be involved…"), then the offer as a secondary option', async ({ page }) => {
    await answer(page, /Not sure yet/);
    const both = page.getByTestId('concierge-both');
    await expect(both).toBeVisible();
    const free = page.getByTestId('concierge-free-lane');
    const offer = page.getByTestId('concierge-offer');
    await expect(free).toBeVisible();
    await expect(offer).toBeVisible();
    // Free help is the lead: first in DOM order and above the offer on the page.
    await expect(both.locator('[data-testid="concierge-free-lane"], [data-testid="concierge-offer"]').first()).toHaveAttribute('data-testid', 'concierge-free-lane');
    const [fb, ob] = await Promise.all([free.boundingBox(), offer.boundingBox()]);
    expect(fb!.y).toBeLessThan(ob!.y);
    await expect(free).toContainText('If Medicaid may be involved, our help is free.');
    expect(await free.innerText()).not.toMatch(PRICE);
    await expect(free.getByRole('link', { name: /Browse the Cleveland directory/ })).toHaveAttribute('href', '/cleveland');
    await expect(free.getByRole('link', { name: /Medicaid Assisted Living Waiver/ })).toHaveAttribute('href', '/cleveland/assisted-living?waiver=1');
    await expect(free.getByRole('link', { name: /Medicare/ })).toBeVisible();
    await expect(free.getByTestId('concierge-free-cta')).toHaveAttribute('href', '/cleveland');
    // The offer is marked secondary, still complete (price, inclusions, form) so a private-pay family can proceed.
    await expect(offer).toHaveAttribute('data-secondary', 'true');
    await expect(offer.getByTestId('concierge-secondary-lead')).toContainText('optional Family Concierge');
    await expect(offer.getByTestId('concierge-price')).toContainText('$399');
    await expect(offer.getByTestId('concierge-request-form')).toBeVisible();
  });

  for (const [label, name] of [
    [/Medicaid/, 'Medicaid / waiver'],
    [/Medicare/, 'Medicare / Medicare Advantage'],
    [/VA benefits/, 'VA benefits'],
  ] as const) {
    test(`${name} → free help, never the offer, never a price`, async ({ page }) => {
      await answer(page, label);
      await expect(page.getByTestId('concierge-free-lane')).toBeVisible();
      await expect(page.getByTestId('concierge-offer')).toHaveCount(0);
      await expect(page.getByTestId('concierge-request-form')).toHaveCount(0);
      // OL-166b: the free lane gets its own hero — no dollar figure ANYWHERE on the page (not even the $5,000 headline).
      await expect(page.getByTestId('concierge-hero')).toHaveAttribute('data-lane', 'free');
      await expect(page.getByTestId('concierge-headline')).toHaveText('Free help for Medicaid, Medicare and VA families');
      const text = await page.getByTestId('concierge-page').innerText();
      expect(text).not.toMatch(/\$\s?\d/);
      expect(text).not.toContain('399');
      expect(text).not.toContain('5,000');
      expect(text).toMatch(/free/i);
      // Medicaid lands on the directory with the waiver filter preset (W5-2); the others on the free search.
      const cta = page.getByTestId('concierge-free-cta');
      if (name === 'Medicaid / waiver') {
        await expect(cta).toHaveText(/See homes accepting the Medicaid waiver/);
        await expect(cta).toHaveAttribute('href', '/cleveland/assisted-living?waiver=1');
      } else {
        await expect(cta).toHaveText(/Start the free search/);
        await expect(cta).toHaveAttribute('href', '/search');
      }
    });
  }

  test('the API refuses a free-lane request even if posted directly (request + checkout)', async ({ request }) => {
    const data = { payerSource: 'MEDICAID_WAIVER', contactName: 'X Y', contactEmail: `x-${ts}@test.carelinkai.com`, careNeeds: 'memory care please' };
    const res = await request.post('/api/concierge/request', { headers: { 'x-forwarded-for': `203.0.113.${(ts % 200) + 1}` }, data });
    expect(res.status()).toBe(400);
    expect((await res.json()).freeHelp).toBe('/cleveland/assisted-living?waiver=1');
    const co = await request.post('/api/concierge/checkout', { headers: { 'x-forwarded-for': `203.0.113.${(ts % 200) + 2}` }, data });
    expect(co.status()).toBe(400);
  });

  test('checkout is closed while CONCIERGE_CHECKOUT_ENABLED is unset (409 → fallback request)', async ({ request }) => {
    const offer = await request.get('/api/concierge/offer');
    expect(offer.status()).toBe(200);
    expect(await offer.json()).toMatchObject({ mode: 'request', checkoutEnabled: false, priceDisplay: '$399' });
    const co = await request.post('/api/concierge/checkout', {
      headers: { 'x-forwarded-for': `203.0.113.${(ts % 200) + 3}` },
      data: { payerSource: 'PRIVATE_FUNDS', contactName: 'X Y', contactEmail: `co-${ts}@test.carelinkai.com`, careNeeds: 'memory care please' },
    });
    expect(co.status()).toBe(409);
    expect((await co.json()).fallback).toBe('request');
  });

  test('"Change my answer" returns to the screener', async ({ page }) => {
    await answer(page, /VA benefits/);
    await page.getByRole('button', { name: 'Change my answer' }).click();
    await expect(page.getByTestId('concierge-screener')).toBeVisible();
  });
});
