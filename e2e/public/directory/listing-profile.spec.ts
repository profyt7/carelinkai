/**
 * OL-217 — /homes/[id] on the Direction D facility profile: ONE inquiry pathway.
 *
 * Seeds an UNCLAIMED home (so a submission lands in the admin inbound queue, the
 * check OL-177 uses) and a FAMILY user via the ALLOW_DEV_ENDPOINTS routes.
 *   - 390×660, signed in as FAMILY: exactly one inquiry form in the accessibility
 *     tree; scrolled to the end, the sticky CTA bar is visible above (not over) the
 *     tab bar and the claim footer line is reachable; "Send Inquiry" on the bar
 *     opens the one form, which submits → the confirmation the app shows today →
 *     the inquiry is in the admin inbound queue. With the on-screen keyboard open
 *     (viewport 390×360), the bar covers neither the focused field nor the submit.
 *   - 1280, signed in as FAMILY: the same submission through the right-rail panel;
 *     no CTA bar; one form in the accessibility tree.
 *   - Floating widgets (pointer checks via elementFromPoint + trial tap): at max scroll the claim link (FAMILY,
 *     unclaimed) and the Contact email (FAMILY, claimed) are tappable; as a guest's CTA bar scrolls away its
 *     "Send Inquiry" and the claim link stay tappable; with the keyboard open the message field, consent box and
 *     "Continue →" are tappable, and the confirmation isn't covered.
 *   - No state inspection on file → three key-stat tiles, no "0 …" claim.
 * Test data is fictional; RESEND_API_KEY is unset in CI, so nothing is emailed.
 *
 *   npx playwright test --config=playwright.e2e.config.ts e2e/public/directory/listing-profile.spec.ts
 */
import { test, expect, type Browser, type Locator, type Page } from '@playwright/test';

const ts = Date.now();
const ADMIN = 'admin@carelinkai.com';
const OP_EMAIL = `listing-profile-op-${ts}@test.carelinkai.com`;
const FAMILY_EMAIL = `listing-profile-family-${ts}@test.carelinkai.com`;
const HOME = `E2E Profile Home ${ts}`;
const CLAIMED = `E2E Profile Claimed ${ts}`;
let homeId = '';
let claimedId = '';

const CONSENT_INIT = () => {
  try {
    localStorage.setItem('carelinkai_cookie_consent', JSON.stringify({ necessary: true, analytics: false, marketing: false }));
    for (const r of ['ADMIN', 'FAMILY']) localStorage.setItem(`carelinkai_onboarding_completed_${r}`, 'true');
  } catch {
    /* storage blocked — assertions don't depend on it */
  }
};

async function signedIn(browser: Browser, email: string, viewport: { width: number; height: number }): Promise<Page> {
  const ctx = await browser.newContext({ viewport, hasTouch: viewport.width < 1024 });
  await ctx.addInitScript(CONSENT_INIT);
  const page = await ctx.newPage();
  await page.goto('/');
  const status = await page.evaluate(
    async (e) => (await fetch('/api/dev/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: e }), credentials: 'include' })).status,
    email,
  );
  expect(status, `dev-login ${email}`).toBe(200);
  return page;
}

async function openListing(page: Page, id = homeId, name = HOME) {
  await page.goto(`/homes/${id}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1, name, exact: true })).toBeVisible({ timeout: 60_000 });
}

/**
 * Scroll to the very end (the app shell scrolls inside <main>; the public shell scrolls the window), once the page
 * has measured the floating widgets and laid out its end-of-listing clearance.
 */
const scrollToEnd = async (page: Page) => {
  await expect(page.getByTestId('listing-widget-clearance')).toHaveCount(1);
  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
    document.querySelectorAll('main').forEach((m) => { m.scrollTop = m.scrollHeight; });
  });
};

/**
 * Pointer check, no scrolling: the element is wholly inside the viewport and the centre plus four inset corners all
 * hit it (not a floating widget, the CTA bar or the tab bar), then a trial tap passes Playwright's hit-target check.
 * Retried briefly so the bar's / widgets' 200 ms transitions can settle.
 */
async function expectTappable(loc: Locator, what: string) {
  await expect(async () => {
    const r = await loc.evaluate((el) => {
      const b = el.getBoundingClientRect();
      const inside = b.width > 0 && b.top >= 0 && b.left >= 0 && b.bottom <= innerHeight && b.right <= innerWidth;
      // Corner probes inset past a rounded corner (hit-testing follows border-radius).
      const i = Math.min(10, b.width / 4, b.height / 4);
      const pts: Array<[number, number]> = [
        [b.left + b.width / 2, b.top + b.height / 2], [b.left + i, b.top + i], [b.right - i, b.top + i], [b.left + i, b.bottom - i], [b.right - i, b.bottom - i],
      ];
      const blockers = pts
        .map(([x, y]) => document.elementFromPoint(x, y))
        .filter((h) => !h || !(h === el || el.contains(h)))
        .map((h) => (h ? h.getAttribute('aria-label') || h.getAttribute('title') || h.closest('[data-testid]')?.getAttribute('data-testid') || h.tagName : 'nothing'));
      return { inside, blockers };
    });
    expect(r.inside, `${what} fully inside the viewport`).toBe(true);
    expect(r.blockers, `${what} not covered`).toEqual([]);
  }).toPass({ timeout: 5_000 });
  await loc.tap({ trial: true, timeout: 5_000 });
}

/** Inquiry panels exposed to assistive tech (aria-hidden / inert / display:none excluded). */
const exposedPanels = (page: Page) => page.getByRole('region', { name: `Contact ${HOME}` });

async function fillAndSubmit(page: Page, who: string) {
  await page.locator('#name').fill(who);
  await page.locator('#email').fill(`${who.toLowerCase().replace(/\s+/g, '-')}@test.carelinkai.com`);
  await page.locator('#phone').fill('(216) 555-0199');
  await page.locator('#moveInTimeframe').selectOption('1-3 months');
  await page.getByRole('checkbox', { name: 'Assisted Living' }).check();
  await page.locator('#message').fill('Fictional test inquiry — please ignore.');
  await page.getByRole('button', { name: 'Continue →' }).click();
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith('/api/inquiries') && r.request().method() === 'POST', { timeout: 60_000 }),
    page.getByRole('button', { name: 'Submit Request' }).click(),
  ]);
  expect(resp.status()).toBe(201);
  const confirm = page.getByTestId('inquiry-confirmation-unclaimed');
  await expect(confirm).toBeVisible({ timeout: 30_000 });
  await expect(confirm).toContainText('A CareLinkAI advisor will follow up.');
}

async function expectQueued(browser: Browser, who: string) {
  const admin = await signedIn(browser, ADMIN, { width: 1280, height: 900 });
  const r = await admin.evaluate(async () => {
    const res = await fetch('/api/admin/inbound-leads?status=all&callerType=family', { credentials: 'include' });
    return { status: res.status, json: await res.json().catch(() => null) };
  });
  expect(r.status).toBe(200);
  const row = (r.json?.rows ?? []).find((x: any) => x.source === 'WEB_INQUIRY' && x.name === who);
  expect(row, 'queued web inquiry').toBeTruthy();
  expect(row).toMatchObject({ organization: HOME, status: 'NEW' });
  expect(row.inquiryId).toBeTruthy();
  await admin.context().close();
}

test.describe('@critical OL-217 facility profile — one inquiry pathway', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180_000);

  test.beforeAll(async ({ request }) => {
    await request.post('/api/dev/upsert-admin', { data: { email: ADMIN } });
    const res = await request.post('/api/dev/upsert-operator', {
      data: { email: OP_EMAIL, companyName: `Profile Ops ${ts}`, homes: [
        { name: HOME, city: 'Beachwood', zipCode: '44122', careLevel: ['ASSISTED'], unclaimed: true },
        { name: CLAIMED, city: 'Beachwood', zipCode: '44122', careLevel: ['ASSISTED'] },
      ] },
    });
    expect(res.status(), 'dev seed').toBe(200);
    const homes = (await res.json()).homes as Array<{ id: string; name: string }>;
    homeId = homes.find((h) => h.name === HOME)!.id;
    claimedId = homes.find((h) => h.name === CLAIMED)!.id;
    expect((await request.post('/api/dev/upsert-family', { data: { email: FAMILY_EMAIL } })).ok(), 'family seed').toBe(true);
  });

  test.afterAll(async ({ request }) => {
    await request.delete('/api/dev/upsert-operator', { data: { email: OP_EMAIL, homeIds: [homeId, claimedId] } }).catch(() => undefined);
  });

  test('390×660 FAMILY: CTA bar above the tab bar, claim line reachable, inquiry via the bar', async ({ browser }) => {
    const page = await signedIn(browser, FAMILY_EMAIL, { width: 390, height: 660 });
    await openListing(page);

    // No inspection on file → three tiles and no implied zero.
    await expect(page.getByTestId('listing-inspection-tile')).toHaveCount(0);
    await expect(page.getByTestId('listing-key-stats')).not.toContainText(/\b0 (inspections?|citations?)\b/i);

    // One inquiry form instance; while the inline panel is on screen the bar is hidden + inert.
    await expect(exposedPanels(page)).toHaveCount(1);
    const bar = page.getByTestId('listing-cta-bar');
    await expect(bar).toHaveAttribute('data-hidden', 'true');
    await expect(page.getByRole('button', { name: 'Send Inquiry' })).toHaveCount(1);

    await scrollToEnd(page);
    await expect(bar).toHaveAttribute('data-hidden', 'false');
    await expect(bar).toBeVisible();
    const tab = page.locator('nav.mobile-tab-bar');
    await expect(tab).toBeVisible();
    const tabBox = await tab.boundingBox();
    expect(tabBox).toBeTruthy();
    // The bar slides in (200 ms); measure once it has settled.
    await expect.poll(async () => { const b = await bar.boundingBox(); return b ? b.y + b.height : Infinity; }, { message: 'CTA bar ends above the tab bar' })
      .toBeLessThanOrEqual(tabBox!.y + 1);
    const barBox = await bar.boundingBox();
    // OL-208: the floating widgets clear tab bar + CTA bar.
    const offset = await page.evaluate(() => parseFloat(getComputedStyle(document.body).getPropertyValue('--bottom-stack-offset')) || 0);
    expect(offset).toBeGreaterThanOrEqual(tabBox!.height + barBox!.height - 2);

    // At max scroll the claim link clears the floating widgets, the CTA bar and the tab bar.
    const claim = page.getByTestId('listing-claim-footer');
    const claimLink = claim.getByRole('link', { name: 'Claim this listing' });
    await expect(claimLink).toHaveAttribute('href', '/auth/register?role=OPERATOR');
    await expectTappable(claimLink, 'Claim this listing at max scroll');
    const claimBox = await claim.boundingBox();
    const barNow = await bar.boundingBox();
    if (barNow && (await bar.getAttribute('data-hidden')) === 'false') {
      expect(claimBox!.y + claimBox!.height, 'claim line not under the CTA bar').toBeLessThanOrEqual(barNow.y + 1);
    }

    // The bar's "Send Inquiry" opens the one form (the inline panel), and the bar steps aside.
    await bar.getByRole('button', { name: 'Send Inquiry' }).tap();
    await expect(page.locator('#name')).toBeVisible();
    await expect(page.locator('#name')).toHaveCount(1);
    await expect(bar).toHaveAttribute('data-hidden', 'true');
    await expect(exposedPanels(page)).toHaveCount(1);

    // On-screen keyboard (simulated: the viewport shrinks to 390×360) with the form focused: nothing — CTA bar,
    // floating widgets, tab bar — covers the message field, the consent checkbox or "Continue →".
    const message = page.locator('#message');
    await message.focus();
    await page.setViewportSize({ width: 390, height: 360 });
    for (const [loc, what] of [
      [message, 'message field'],
      [page.locator('#inquiry-main-lead-consent'), 'consent checkbox'],
      [page.getByRole('button', { name: 'Continue →' }), 'Continue →'],
    ] as const) {
      await loc.scrollIntoViewIfNeeded();
      await expectTappable(loc, `${what} (keyboard open)`);
    }
    await expect(message).toBeFocused();
    await page.setViewportSize({ width: 390, height: 660 });

    await fillAndSubmit(page, `Mobile Family ${ts}`);
    // The confirmation isn't covered by the floating widgets either.
    const confirmation = page.getByTestId('inquiry-confirmation-unclaimed');
    await confirmation.scrollIntoViewIfNeeded();
    await expectTappable(confirmation, 'inquiry confirmation');
    await page.context().close();
    await expectQueued(browser, `Mobile Family ${ts}`);
  });

  test('390×660 guest: claim link and the bar\'s "Send Inquiry" stay tappable as the bar scrolls away', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 660 }, hasTouch: true });
    await ctx.addInitScript(CONSENT_INIT);
    const page = await ctx.newPage();
    await openListing(page);
    await expect(page.getByTestId('listing-widget-clearance')).toHaveCount(1);
    const bar = page.getByTestId('listing-cta-bar');
    const send = bar.getByRole('button', { name: 'Send Inquiry' });
    const claimLink = page.getByTestId('listing-claim-footer').getByRole('link', { name: 'Claim this listing' });
    // From the end of the listing (bar docked at the bottom) on into the site footer, in 40px steps.
    const listingEnd = await bar.evaluate((b) => b.parentElement!.getBoundingClientRect().bottom + window.scrollY - window.innerHeight);
    for (let y = listingEnd; y <= listingEnd + 320; y += 40) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await expect(bar).toHaveAttribute('data-hidden', 'false');
      // "In view" = below the sticky site header (anything under it is scrolled past, not tappable by design).
      const inView = (l: Locator) => l.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const header = document.querySelector('header');
        const top = header && getComputedStyle(header).position === 'sticky' ? header.getBoundingClientRect().bottom : 0;
        return r.top >= top && r.bottom <= innerHeight;
      });
      if (await inView(send)) await expectTappable(send, `bar "Send Inquiry" at +${y - listingEnd}px`);
      if (await inView(claimLink)) await expectTappable(claimLink, `Claim this listing at +${y - listingEnd}px`);
    }
    await ctx.close();
  });

  test('390×660 FAMILY, claimed home: the Contact Information email is tappable at max scroll', async ({ browser }) => {
    const page = await signedIn(browser, FAMILY_EMAIL, { width: 390, height: 660 });
    await openListing(page, claimedId, CLAIMED);
    await scrollToEnd(page);
    await expect(page.getByTestId('listing-cta-bar')).toHaveAttribute('data-hidden', 'false');
    await expectTappable(page.getByRole('link', { name: OP_EMAIL }), 'operator email at max scroll');
    await page.context().close();
  });

  test('1280 FAMILY: the right-rail panel submits; no CTA bar; one form', async ({ browser }) => {
    const page = await signedIn(browser, FAMILY_EMAIL, { width: 1280, height: 900 });
    await openListing(page);
    await expect(page.getByTestId('listing-cta-bar')).toBeHidden();
    await expect(exposedPanels(page)).toHaveCount(1);
    const panel = page.getByTestId('listing-inquiry-panel');
    // Right rail: the panel sits to the right of the About section.
    const [panelBox, aboutBox] = [await panel.boundingBox(), await page.locator('#listing-about').boundingBox()];
    expect(panelBox!.x).toBeGreaterThan(aboutBox!.x + aboutBox!.width - 1);

    await panel.getByRole('button', { name: 'Send Inquiry' }).click();
    await expect(page.locator('#name')).toHaveCount(1);
    await fillAndSubmit(page, `Desktop Family ${ts}`);
    await page.context().close();
    await expectQueued(browser, `Desktop Family ${ts}`);
  });
});
