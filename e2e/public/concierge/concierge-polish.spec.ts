/**
 * /concierge polish (OL-174).
 *
 *  - shared header + footer render on /concierge and /concierge/thanks (OL-171),
 *    with exactly one <main>;
 *  - the two lanes as two cards: no answer → both cards, the private-pay card
 *    labeled "Private pay only" with NO price in the server HTML; private pay
 *    / not sure → the price renders client-side in that card; Medicaid /
 *    Medicare / VA → the private-pay card is gone and no dollar figure anywhere;
 *  - the hero + private card carry the published number as a tel: link with
 *    the no-patient-details line, and the 2-business-day promise near the CTA;
 *  - the FAQ block's visible text equals the FAQPage JSON-LD, and has no price.
 *
 *   npx playwright test --config=playwright.e2e.config.ts e2e/public/concierge/concierge-polish.spec.ts
 */
import { test, expect, type Page } from '@playwright/test';

const SUBHEAD = 'A verified shortlist in 2 business days — or you pay nothing.';
const GUARANTEE = 'No verified shortlist within 2 business days → full refund.';
const PRICE = /\$\s?(?!5,000\b)\d/;

async function answer(page: Page, label: RegExp) {
  await page.goto('/concierge', { waitUntil: 'domcontentloaded' });
  const screener = page.getByTestId('concierge-screener');
  await expect(screener).toHaveAttribute('data-hydrated', 'true');
  await screener.getByLabel(label).check();
  await screener.getByRole('button', { name: 'Continue' }).click();
}

test.describe('@critical /concierge polish (OL-174)', () => {
  test('shared header + footer on /concierge and /concierge/thanks, one <main> each', async ({ page }) => {
    for (const path of ['/concierge', '/concierge/thanks']) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('site-shell')).toBeVisible();
      await expect(page.getByTestId('site-logo')).toBeVisible();
      await expect(page.locator('footer').first()).toBeVisible();
      await expect(page.locator('main')).toHaveCount(1);
    }
  });

  test('server HTML: two lane cards, the private-pay one without a price; FAQ text == FAQPage JSON-LD', async ({ request }) => {
    const html = await (await request.get('/concierge')).text();
    expect(html).toContain('data-testid="concierge-lane-free"');
    expect(html).toContain('data-testid="concierge-lane-private"');
    expect(html).toContain('data-price-shown="false"');
    expect(html).not.toContain('$399');
    const visible = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<!--\s*-->/g, '').replace(/<[^>]+>/g, ' ');
    expect(visible).not.toMatch(PRICE);
    expect(visible).toContain('Private pay only');
    expect(visible).toContain(SUBHEAD);
    expect(visible).toContain(GUARANTEE);
    expect(html).toMatch(/href="tel:\+1\d{10}"/);

    const ld = html.match(/<script type="application\/ld\+json" data-testid="concierge-faq-jsonld">([\s\S]*?)<\/script>/);
    expect(ld, 'FAQPage JSON-LD present').toBeTruthy();
    const faq = JSON.parse(ld![1]);
    expect(faq['@type']).toBe('FAQPage');
    expect(faq.mainEntity.length).toBeGreaterThanOrEqual(5);
    expect(faq.mainEntity.length).toBeLessThanOrEqual(7);
    expect(JSON.stringify(faq)).not.toMatch(/\$\s?\d/);
  });

  test('visible FAQ matches the JSON-LD question for question', async ({ page }) => {
    await page.goto('/concierge', { waitUntil: 'domcontentloaded' });
    const raw = await page.locator('script[data-testid="concierge-faq-jsonld"]').textContent();
    const faq = JSON.parse(raw ?? '{}');
    const qs = await page.getByTestId('concierge-faq-q').allTextContents();
    const as = await page.getByTestId('concierge-faq-a').allTextContents();
    expect(qs).toEqual(faq.mainEntity.map((q: any) => q.name));
    expect(as).toEqual(faq.mainEntity.map((q: any) => q.acceptedAnswer.text));
    expect(as.join(' ')).toContain(GUARANTEE);
  });

  test('hero: tel: link + no-patient-details line', async ({ page }) => {
    await page.goto('/concierge', { waitUntil: 'domcontentloaded' });
    const phone = page.getByTestId('concierge-hero-phone');
    await expect(phone).toHaveAttribute('href', /^tel:\+1\d{10}$/);
    await expect(page.getByTestId('concierge-hero')).toContainText('Please don’t share patient details on the line');
  });

  test('private funds → both cards, the price in the private-pay card (client-rendered)', async ({ page }) => {
    await answer(page, /Private funds/);
    await expect(page.getByTestId('concierge-offer')).toBeVisible();
    const card = page.getByTestId('concierge-lane-private');
    await expect(card).toHaveAttribute('data-price-shown', 'true');
    await expect(card.getByTestId('concierge-lane-price')).toContainText('$399');
    await expect(card).toContainText('Private pay only');
    await expect(card.getByTestId('concierge-lane-promise')).toHaveText(SUBHEAD);
    await expect(card.getByTestId('concierge-lane-phone').locator('a')).toHaveAttribute('href', /^tel:/);
    await expect(page.getByTestId('concierge-lane-free')).toBeVisible();
  });

  test('not sure → both cards, free card first, price in the private-pay card', async ({ page }) => {
    await answer(page, /Not sure yet/);
    const free = page.getByTestId('concierge-lane-free');
    const priv = page.getByTestId('concierge-lane-private');
    await expect(free).toBeVisible();
    await expect(priv).toHaveAttribute('data-price-shown', 'true');
    const order = await page.locator('[data-testid="concierge-lane-free"], [data-testid="concierge-lane-private"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));
    expect(order).toEqual(['concierge-lane-free', 'concierge-lane-private']);
    expect(await free.innerText()).not.toMatch(PRICE);
  });

  for (const label of [/Medicaid/, /Medicare/, /VA benefits/]) {
    test(`${label.source} → only the free card; no price anywhere`, async ({ page }) => {
      await answer(page, label);
      await expect(page.getByTestId('concierge-lanes')).toHaveAttribute('data-lane', 'free');
      await expect(page.getByTestId('concierge-lane-free')).toBeVisible();
      await expect(page.getByTestId('concierge-lane-private')).toHaveCount(0);
      await expect(page.getByTestId('concierge-lane-free-waiver')).toHaveAttribute('href', '/cleveland/assisted-living?waiver=1');
      const text = await page.getByTestId('concierge-page').innerText();
      expect(text).not.toMatch(/\$\s?\d/);
      expect(text).not.toContain('399');
      // "Change my answer" brings the private-pay card back, still without a price.
      await page.getByRole('button', { name: 'Change my answer' }).click();
      await expect(page.getByTestId('concierge-lane-private')).toHaveAttribute('data-price-shown', 'false');
    });
  }
});
