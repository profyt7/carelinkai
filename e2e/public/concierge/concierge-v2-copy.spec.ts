/**
 * /concierge v2 copy + structure (OL-165). Backend untouched; checkout stays
 * behind CONCIERGE_CHECKOUT_ENABLED.
 *
 *  - "Free for families" is above the fold (in the hero, before the screener
 *    and before the headline in DOM order);
 *  - the headline is the mistake, the subhead is the guarantee; the old
 *    "legwork" framing is gone; the five-mistakes section replaced "how it works";
 *  - the page renders BOTH lanes: the free lane (Medicaid) and the offer lane
 *    (private pay), each with the guarantee text where it applies — the free
 *    lane never shows the price;
 *  - the "not sure" answer renders both lanes on one page, free help first,
 *    with the guarantee text visible.
 *
 *   npx playwright test --config=playwright.e2e.config.ts e2e/public/concierge/concierge-v2-copy.spec.ts
 */
import { test, expect, type Page } from '@playwright/test';

const HEADLINE = 'Get a verified shortlist before you commit to a home.';
const SUBHEAD = 'We do the research first. You pay only when your shortlist is ready.';
// Pay when ready (10/31). Apostrophe-free slice of CONCIERGE_OFFER.guarantee (raw HTML encodes ' as &#x27;).
const GUARANTEE = 'useful shortlist, you pay nothing.';
// Any dollar amount (the old "$5,000 mistake" headline is gone; the exclusion is kept harmlessly).
const PRICE = /\$\s?(?!5,000\b)\d/;

async function answer(page: Page, label: RegExp) {
  await page.goto('/concierge', { waitUntil: 'domcontentloaded' });
  const screener = page.getByTestId('concierge-screener');
  await expect(screener).toBeVisible();
  await expect(screener).toHaveAttribute('data-hydrated', 'true');
  await screener.getByLabel(label).check();
  const cont = screener.getByRole('button', { name: 'Continue' });
  await expect(cont).toBeEnabled();
  await cont.click();
}

test.describe('@critical /concierge v2 copy (OL-165)', () => {
  test('server HTML: "Free for families" above the fold, the mistake headline, the guarantee subhead, the five mistakes; no "legwork", no "AI" pitch', async ({ request }) => {
    const res = await request.get('/concierge');
    expect(res.status()).toBe(200);
    const html = await res.text();
    const free = html.indexOf('data-testid="concierge-free-for-families"');
    const headline = html.indexOf('data-testid="concierge-headline"');
    const screener = html.indexOf('data-testid="concierge-screener"');
    const mistakes = html.indexOf('data-testid="concierge-five-mistakes"');
    expect(free).toBeGreaterThan(-1);
    expect(headline).toBeGreaterThan(free); // free line first, then the headline
    expect(screener).toBeGreaterThan(headline); // all of it before the screener (the fold)
    expect(mistakes).toBeGreaterThan(screener);
    const visible = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
    expect(visible).toContain('Free for families.');
    expect(visible).toContain(HEADLINE);
    expect(visible).toContain(SUBHEAD);
    expect(visible).toContain('The five mistakes a 48-hour discharge causes');
    expect(visible).toContain('The wrong-fit move.');
    expect(visible).toContain('Losing the discharge window.');
    expect(visible).toContain(GUARANTEE);
    expect(visible).not.toMatch(/legwork/i);
    expect(visible).not.toMatch(/\bAI\b/);
    expect(visible).not.toMatch(/How the concierge works/);
    expect(visible).not.toMatch(PRICE); // the price only renders client-side after a private-pay answer
  });

  test('renders both lanes with the guarantee text: private pay → offer lane (price + guarantee); Medicaid → free lane (no price)', async ({ page }) => {
    // Offer lane.
    await answer(page, /Private funds/);
    const offer = page.getByTestId('concierge-offer');
    await expect(offer).toBeVisible();
    await expect(offer).toContainText('A person checks fit, prices and the contract with you — before you sign.');
    await expect(offer.getByTestId('concierge-offer-subhead')).toHaveText(SUBHEAD);
    await expect(offer.getByTestId('concierge-guarantee')).toContainText(GUARANTEE);
    await expect(offer.getByTestId('concierge-price')).toContainText('$399');
    await expect(offer.getByTestId('concierge-inclusions').locator('li')).toHaveCount(9);
    await expect(offer.getByTestId('concierge-not-included')).toContainText('negotiating on the family’s behalf (we prepare them; they ask)');
    await expect(offer.getByTestId('concierge-no-outcome')).toContainText('We never promise savings');
    await expect(offer).not.toContainText('legwork');
    await expect(page.getByTestId('concierge-free-lane')).toHaveCount(0);

    // Free lane — unchanged, visually equal (a full card), never a price.
    await page.getByRole('button', { name: 'Change my answer' }).click();
    await page.getByTestId('concierge-screener').getByLabel(/Medicaid/).check();
    await page.getByTestId('concierge-screener').getByRole('button', { name: 'Continue' }).click();
    const free = page.getByTestId('concierge-free-lane');
    await expect(free).toBeVisible();
    await expect(free).toContainText('Free help — always');
    await expect(free).toContainText('Your search is free on CareLinkAI. No fee, no catch.');
    await expect(page.getByTestId('concierge-offer')).toHaveCount(0);
    // OL-166b: the free lane gets its own hero (own H1 + the verified-homes line) and no dollar figure anywhere.
    await expect(page.getByTestId('concierge-hero')).toHaveAttribute('data-lane', 'free');
    await expect(page.getByTestId('concierge-headline')).toHaveText('Free help for Medicaid, Medicare and VA families');
    await expect(page.getByTestId('concierge-subhead')).toContainText('availability labeled as verified or not, Medicaid waiver status');
    const pageText = await page.getByTestId('concierge-page').innerText();
    expect(pageText).not.toMatch(/\$\s?\d/);
    expect(pageText).not.toContain('399');
    expect(pageText).not.toContain('5,000');
    // "Change my answer" restores the default hero.
    await page.getByRole('button', { name: 'Change my answer' }).click();
    await expect(page.getByTestId('concierge-hero')).toHaveAttribute('data-lane', 'default');
    await expect(page.getByTestId('concierge-headline')).toHaveText(HEADLINE);
  });

  test('"not sure yet" renders both lanes on one page, free help first, with the guarantee text', async ({ page }) => {
    await answer(page, /Not sure yet/);
    const both = page.getByTestId('concierge-both');
    await expect(both).toBeVisible();
    const free = both.getByTestId('concierge-free-lane');
    const offer = both.getByTestId('concierge-offer');
    await expect(free).toBeVisible();
    await expect(offer).toBeVisible();
    const [fb, ob] = await Promise.all([free.boundingBox(), offer.boundingBox()]);
    expect(fb!.y).toBeLessThan(ob!.y);
    await expect(free).toContainText('If Medicaid may be involved, our help is free.');
    await expect(offer.getByTestId('concierge-secondary-lead')).toContainText('optional Family Concierge');
    await expect(offer.getByTestId('concierge-guarantee')).toContainText(GUARANTEE);
    await expect(offer.getByTestId('concierge-offer-subhead')).toHaveText(SUBHEAD);
    expect(await free.innerText()).not.toMatch(PRICE);
    await expect(offer.getByTestId('concierge-price')).toContainText('$399');
  });
});
