/**
 * Pre-launch polish 2 (item 3): the floating support controls used to cover primary actions —
 * the homepage hero CTAs at 390, the listing inquiry panel heading at 1280 and the Listing & Boost
 * "Claim" button at 390. Each formerly covered target is placed where the floating stack sat
 * (bottom-right of the viewport) and pointer-clicked there; the click must land on the target, not on
 * a support control. Also checks the one launcher still opens the Care Advisor and Report a bug.
 */
import { test, expect, type Locator, type Page } from '@playwright/test';

const ts = Date.now();
const OP_EMAIL = `dock-op-${ts}@test.carelinkai.com`;
const HOME = `E2E Dock Home ${ts}`;
const PROVIDER_EMAIL = `dock-provider-${ts}@carelinkai.test`;
let homeId = '';

const CONSENT_INIT = () => {
  try {
    localStorage.setItem('carelinkai_cookie_consent', JSON.stringify({ necessary: true, analytics: false, marketing: false }));
    for (const r of ['FAMILY', 'PROVIDER']) localStorage.setItem(`carelinkai_onboarding_completed_${r}`, 'true');
  } catch { /* ignore */ }
};

/** Record every click's target (capture phase) and stop navigation, so a CTA click can be inspected in place. */
async function recordClicks(page: Page) {
  await page.evaluate(() => {
    (window as any).__clicks = [];
    document.addEventListener('click', (e) => {
      // Judged at click time: the click's own handler may re-render or remove the target.
      const t = e.target as Element | null;
      (window as any).__clicks.push(Boolean(t && t.closest('[data-click-target]')));
      e.preventDefault();
    }, true);
  });
}

/** Scroll the target so its bottom edge sits at the bottom of the visible area (where the floating stack sat). */
async function parkBottomRight(page: Page, target: Locator) {
  await target.evaluate((el) => el.scrollIntoView({ block: 'end', inline: 'nearest' }));
  // The launcher re-checks on scroll (rAF) and on a short interval; let it settle.
  await page.waitForTimeout(900);
}

/** Pointer-click the target's centre and its bottom-right corner; each click must land inside it. */
async function expectClicksLand(page: Page, target: Locator, what: string) {
  const r = (await target.boundingBox())!;
  const vw = page.viewportSize()!;
  const points: Array<[string, number, number]> = [
    ['centre', r.x + r.width / 2, r.y + r.height / 2],
    ['bottom-right', Math.min(r.x + r.width - 6, vw.width - 6), Math.min(r.y + r.height - 6, vw.height - 6)],
  ];
  for (const [where, x, y] of points) {
    await target.evaluate((el) => {
      document.querySelectorAll('[data-click-target]').forEach((n) => n.removeAttribute('data-click-target'));
      el.setAttribute('data-click-target', '');
      (window as any).__clicks = [];
    });
    await page.mouse.click(x, y);
    const landed = await page.evaluate(() => {
      const clicks: boolean[] = (window as any).__clicks;
      return clicks.length > 0 && clicks.every(Boolean);
    });
    if (where === 'centre' && !(await target.count())) {
      expect(landed, `${what}: ${where} click lands on it`).toBe(true);
      return; // the click opened something and the target is gone; one landed click is the proof
    }
    expect(landed, `${what}: ${where} click (${Math.round(x)}, ${Math.round(y)}) lands on it`).toBe(true);
  }
}

test.describe('floating support controls never take a click meant for a primary action', () => {
  test.beforeAll(async ({ request }) => {
    const res = await request.post('/api/dev/upsert-operator', {
      data: { email: OP_EMAIL, companyName: `Dock Ops ${ts}`, homes: [{ name: HOME, city: 'Beachwood', zipCode: '44122', careLevel: ['ASSISTED'], startingPriceMonthly: 5200, availabilityVerifiedDaysAgo: 2, availabilityCount: 3 }] },
    });
    expect(res.status(), 'home seed').toBe(200);
    homeId = (await res.json()).homeId;
    expect((await request.post('/api/dev/upsert-provider', { data: { email: PROVIDER_EMAIL, businessName: `Dock Provider ${ts}`, serviceTypes: ['meal-delivery'] } })).ok(), 'provider seed').toBe(true);
  });

  test.afterAll(async ({ request }) => {
    await request.delete('/api/dev/upsert-operator', { data: { email: OP_EMAIL } }).catch(() => undefined);
  });

  test('390 homepage: both hero CTAs take their own clicks (as loaded and parked bottom-right)', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await ctx.addInitScript(CONSENT_INIT);
    const page = await ctx.newPage();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('support-dock')).toBeAttached({ timeout: 60_000 });
    await recordClicks(page);
    const getStarted = page.getByRole('link', { name: /Get Started/ }).first();
    const findCare = page.getByRole('link', { name: /Find Care Now/ }).first();
    await page.waitForTimeout(900);
    // As first loaded (where the two floating buttons used to sit on "Get Started").
    if ((await getStarted.boundingBox())!.y + 40 < 844) await expectClicksLand(page, getStarted, 'Get Started (as loaded)');
    for (const [loc, what] of [[getStarted, 'Get Started'], [findCare, 'Find Care Now']] as const) {
      await parkBottomRight(page, loc);
      await expectClicksLand(page, loc, what);
    }
    await ctx.close();
  });

  test('1280 listing: the inquiry panel heading takes its own clicks', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await ctx.addInitScript(CONSENT_INIT);
    const page = await ctx.newPage();
    await page.goto(`/homes/${homeId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1, name: HOME, exact: true })).toBeVisible({ timeout: 60_000 });
    await recordClicks(page);
    const heading = page.getByTestId('listing-inquiry-panel').getByRole('heading', { level: 2 }).first();
    await page.waitForTimeout(900);
    await expectClicksLand(page, heading, 'panel heading (as loaded)');
    await parkBottomRight(page, heading);
    await expectClicksLand(page, heading, 'panel heading');
    // The panel's own buttons too ("Send Inquiry" first: a click on either still runs its handler and changes the panel).
    for (const name of ['Send Inquiry', 'Schedule a Tour']) {
      await page.goto(`/homes/${homeId}`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { level: 1, name: HOME, exact: true })).toBeVisible({ timeout: 60_000 });
      await recordClicks(page);
      const btn = page.getByTestId('listing-inquiry-panel').getByRole('button', { name, exact: true });
      await parkBottomRight(page, btn);
      await expectClicksLand(page, btn, `panel "${name}"`);
    }
    await ctx.close();
  });

  test('390 Listing & Boost: the founding-provider "Claim" button takes its own clicks', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await ctx.addInitScript(CONSENT_INIT);
    const page = await ctx.newPage();
    // Render the Boost card + founding offer in this browser only (no server flag, no Stripe): the page asks
    // /api/paid-features and the founder endpoint; both are answered here.
    await page.route('**/api/paid-features', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ PROVIDER_LISTING: true, PROVIDER_BOOST: true }) }));
    await page.route('**/api/provider/boost/founder', (r) =>
      r.request().method() === 'GET'
        ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ total: 25, spotsLeft: 25, claimed: null }) })
        : r.abort());
    await page.goto('/');
    expect(await page.evaluate(async (e) => (await fetch('/api/dev/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: e }), credentials: 'include' })).status, PROVIDER_EMAIL)).toBe(200);
    await page.goto('/settings/provider/billing', { waitUntil: 'domcontentloaded' });
    const claim = page.getByRole('button', { name: /Claim 90 days free/ });
    await expect(claim).toBeVisible({ timeout: 60_000 });
    await recordClicks(page);
    await parkBottomRight(page, claim);
    await expectClicksLand(page, claim, 'Claim 90 days free');
    const boost = page.getByRole('button', { name: /Boost for/ });
    if (await boost.count()) {
      await parkBottomRight(page, boost.first());
      await expectClicksLand(page, boost.first(), 'Boost for $39/mo');
    }
    await ctx.close();
  });

  test('one launcher: it opens the Care Advisor and Report a bug; no second floating button', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await ctx.addInitScript(CONSENT_INIT);
    const page = await ctx.newPage();
    await page.goto('/concierge', { waitUntil: 'domcontentloaded' });
    const dock = page.getByTestId('support-dock');
    await expect(dock).toBeAttached({ timeout: 60_000 });
    await expect(page.locator('[data-floating-widget]')).toHaveCount(1);
    const launcher = page.getByRole('button', { name: 'Help and support' });
    await launcher.focus(); // keyboard focus always shows it, even where it stepped aside
    await expect(launcher).toBeVisible();
    await launcher.press('Enter');
    await expect(page.getByRole('menuitem', { name: 'Report a bug' })).toBeVisible();
    await page.getByRole('menuitem', { name: 'Ask a Care Advisor' }).click();
    await expect(page.getByTestId('care-advisor-panel')).toBeVisible();
    await page.getByRole('button', { name: 'Close Care Advisor' }).click();
    await expect(page.getByTestId('care-advisor-panel')).toHaveCount(0);
    await ctx.close();
  });
});
