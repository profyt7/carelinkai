/**
 * /concierge — family concierge offer with the payer-source screener in front
 * (sprint W3 item 5 / sprint 3.1).
 *
 *  - renders logged-out (200, indexable, canonical); the server HTML carries
 *    the screener but NOT the offer section;
 *  - private-pay / LTC-insurance → the offer + "Request concierge help" CTA
 *    (placeholder into the existing intake);
 *  - Medicaid / Medicare / VA / not-sure → free help, the offer never renders,
 *    and no dollar price appears anywhere on the page.
 *
 * Runs with the ./e2e config:
 *   npx playwright test --config=playwright.e2e.config.ts e2e/public/concierge-offer.spec.ts
 */
import { test, expect, type Page } from '@playwright/test';

const PRICE = /\$\s?\d/;

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

test.describe('@critical /concierge offer + payer screener', () => {
  test('GET /concierge → 200 logged-out, indexable, screener in HTML, offer NOT in HTML', async ({ request }) => {
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
    // Visible text only — the RSC payload in <script> uses "$3"-style refs.
    const visible = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
    expect(visible).not.toMatch(PRICE);
  });

  test('is in sitemap.xml', async ({ request }) => {
    expect(await (await request.get('/sitemap.xml')).text()).toContain('https://getcarelinkai.com/concierge');
  });

  test('private funds → offer + "Request concierge help" CTA into the existing intake', async ({ page }) => {
    await answer(page, /Private funds/);
    const offer = page.getByTestId('concierge-offer');
    await expect(offer).toBeVisible();
    await expect(page.getByTestId('concierge-free-lane')).toHaveCount(0);
    await expect(offer.getByTestId('concierge-fee-model')).toContainText('flat fee');
    const cta = offer.getByTestId('concierge-request-cta');
    await expect(cta).toHaveText(/Request concierge help/);
    await expect(cta).toHaveAttribute('href', /^\/get-started\?from=concierge&payerSource=PRIVATE_FUNDS$/);
    // no dollar amount yet — Chris adds the price
    expect(await page.getByTestId('concierge-page').innerText()).not.toMatch(PRICE);
  });

  test('long-term care insurance → offer too', async ({ page }) => {
    await answer(page, /Long-term care insurance/);
    await expect(page.getByTestId('concierge-offer')).toBeVisible();
    await expect(page.getByTestId('concierge-request-cta')).toHaveAttribute('href', /payerSource=LTC_INSURANCE/);
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
      await expect(page.getByTestId('concierge-request-cta')).toHaveCount(0);
      const text = await page.getByTestId('concierge-page').innerText();
      expect(text).not.toMatch(PRICE);
      expect(text).toMatch(/free/i);
      await expect(page.getByRole('link', { name: 'Start the free search' })).toHaveAttribute('href', '/search');
    });
  }

  test('"Change my answer" returns to the screener', async ({ page }) => {
    await answer(page, /VA benefits/);
    await page.getByRole('button', { name: 'Change my answer' }).click();
    await expect(page.getByTestId('concierge-screener')).toBeVisible();
  });
});
