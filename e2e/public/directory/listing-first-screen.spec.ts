/**
 * Pre-launch (PR B): on a 390×844 phone the first screen of a listing shows care type, location, the known
 * starting price and verified availability — the header and title/address/care types in the page, price and
 * availability in the sticky CTA bar until the inquiry panel's own facts are on screen. Each fact must be inside
 * the viewport, below the sticky header and not covered by anything (bar, floating widgets).
 */
import { test, expect, type Locator, type Page } from '@playwright/test';

const ts = Date.now();
const OP_EMAIL = `first-screen-op-${ts}@test.carelinkai.com`;
const HOME = `E2E First Screen Home ${ts}`;
let homeId = '';

const CONSENT_INIT = () => {
  try { localStorage.setItem('carelinkai_cookie_consent', JSON.stringify({ necessary: true, analytics: false, marketing: false })); } catch { /* ignore */ }
};

/** In the viewport, below the sticky header, and the topmost thing at its centre. */
async function onFirstScreen(page: Page, l: Locator): Promise<boolean> {
  return l.evaluate((el) => {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    const header = document.querySelector('[data-testid="site-header"]');
    const top = header ? header.getBoundingClientRect().bottom : 0;
    if (r.top < top - 1 || r.bottom > innerHeight + 1) return false;
    const hit = document.elementFromPoint(r.left + Math.min(r.width / 2, 40), r.top + r.height / 2);
    return Boolean(hit && (el === hit || el.contains(hit)));
  });
}

async function anyOnFirstScreen(page: Page, l: Locator): Promise<boolean> {
  for (const el of await l.all()) if (await onFirstScreen(page, el)) return true;
  return false;
}

test.describe('listing first screen at 390×844', () => {
  test.beforeAll(async ({ request }) => {
    const res = await request.post('/api/dev/upsert-operator', {
      data: {
        email: OP_EMAIL,
        companyName: `First Screen Ops ${ts}`,
        homes: [{ name: HOME, city: 'Beachwood', zipCode: '44122', careLevel: ['ASSISTED', 'MEMORY_CARE'], startingPriceMonthly: 5200, availabilityVerifiedDaysAgo: 2, availabilityCount: 3 }],
      },
    });
    expect(res.status(), 'dev seed').toBe(200);
    homeId = (await res.json()).homeId;
  });

  test.afterAll(async ({ request }) => {
    await request.delete('/api/dev/upsert-operator', { data: { email: OP_EMAIL } }).catch(() => undefined);
  });

  test('care type, location, known price and verified availability without scrolling', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await ctx.addInitScript(CONSENT_INIT);
    const page = await ctx.newPage();
    await page.goto(`/homes/${homeId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1, name: HOME, exact: true })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('listing-cta-bar')).toHaveAttribute('data-hidden', 'false');

    expect(await onFirstScreen(page, page.getByRole('heading', { level: 1, name: HOME, exact: true })), 'name').toBe(true);
    expect(await anyOnFirstScreen(page, page.getByText(/Beachwood, OH,? 44122/)), 'location').toBe(true);
    expect(await onFirstScreen(page, page.getByRole('list', { name: 'Care types' })), 'care types').toBe(true);
    const facts = page.locator('[data-panel-facts], [data-testid="cta-bar-facts"]');
    expect(await anyOnFirstScreen(page, facts.getByText(/Verified/).filter({ visible: true })), 'verified availability').toBe(true);
    expect(await anyOnFirstScreen(page, facts.getByText(/\$5,200/).filter({ visible: true })), 'known price').toBe(true);
    // The floating widgets lift above the bar, so neither of its actions is covered.
    const bar = page.getByTestId('listing-cta-bar');
    for (const name of ['Schedule a Tour', 'Send Inquiry']) {
      await expect.poll(() => onFirstScreen(page, bar.getByRole('button', { name })), { message: `bar "${name}" uncovered` }).toBe(true);
    }
    await ctx.close();
  });
});
