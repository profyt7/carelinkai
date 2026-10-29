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
 *   - No state inspection on file → three key-stat tiles, no "0 …" claim.
 * Test data is fictional; RESEND_API_KEY is unset in CI, so nothing is emailed.
 *
 *   npx playwright test --config=playwright.e2e.config.ts e2e/public/directory/listing-profile.spec.ts
 */
import { test, expect, type Browser, type Page } from '@playwright/test';

const ts = Date.now();
const ADMIN = 'admin@carelinkai.com';
const OP_EMAIL = `listing-profile-op-${ts}@test.carelinkai.com`;
const FAMILY_EMAIL = `listing-profile-family-${ts}@test.carelinkai.com`;
const HOME = `E2E Profile Home ${ts}`;
let homeId = '';

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

async function openListing(page: Page) {
  await page.goto(`/homes/${homeId}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1, name: HOME })).toBeVisible({ timeout: 60_000 });
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
      data: { email: OP_EMAIL, companyName: `Profile Ops ${ts}`, homes: [{ name: HOME, city: 'Beachwood', zipCode: '44122', careLevel: ['ASSISTED'], unclaimed: true }] },
    });
    expect(res.status(), 'dev seed').toBe(200);
    homeId = ((await res.json()).homes as Array<{ id: string; name: string }>).find((h) => h.name === HOME)!.id;
    expect((await request.post('/api/dev/upsert-family', { data: { email: FAMILY_EMAIL } })).ok(), 'family seed').toBe(true);
  });

  test.afterAll(async ({ request }) => {
    await request.delete('/api/dev/upsert-operator', { data: { email: OP_EMAIL, homeIds: [homeId] } }).catch(() => undefined);
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

    // Scroll to the end of the page (the app shell scrolls inside <main>).
    await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight);
      document.querySelectorAll('main').forEach((m) => { m.scrollTop = m.scrollHeight; });
    });
    await expect(bar).toHaveAttribute('data-hidden', 'false');
    await expect(bar).toBeVisible();
    const tab = page.locator('nav.mobile-tab-bar');
    await expect(tab).toBeVisible();
    const [barBox, tabBox] = [await bar.boundingBox(), await tab.boundingBox()];
    expect(barBox && tabBox).toBeTruthy();
    expect(barBox!.y + barBox!.height, 'CTA bar ends above the tab bar').toBeLessThanOrEqual(tabBox!.y + 1);
    // OL-208: the floating widgets clear tab bar + CTA bar.
    const offset = await page.evaluate(() => parseFloat(getComputedStyle(document.body).getPropertyValue('--bottom-stack-offset')) || 0);
    expect(offset).toBeGreaterThanOrEqual(tabBox!.height + barBox!.height - 2);

    const claim = page.getByTestId('listing-claim-footer');
    await claim.scrollIntoViewIfNeeded();
    await expect(claim).toBeVisible();
    await expect(claim.getByRole('link', { name: 'Claim this listing' })).toHaveAttribute('href', '/auth/register?role=OPERATOR');
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

    // On-screen keyboard: the visual viewport shrinks; the bar must not cover the focused field or the submit.
    await page.locator('#message').focus();
    await page.setViewportSize({ width: 390, height: 360 });
    await page.locator('#message').scrollIntoViewIfNeeded();
    const covers = async (sel: string) =>
      page.evaluate((s) => {
        const el = document.querySelector(s)!.getBoundingClientRect();
        const b = document.querySelector('[data-testid="listing-cta-bar"]') as HTMLElement;
        if (b.dataset.hidden === 'true') return false;
        const r = b.getBoundingClientRect();
        return r.top < el.bottom && r.bottom > el.top;
      }, sel);
    expect(await covers('#message'), 'bar over the focused field').toBe(false);
    await page.getByRole('button', { name: 'Continue →' }).scrollIntoViewIfNeeded();
    expect(await covers('[data-testid="listing-inquiry-panel"] button[type="submit"]'), 'bar over the submit button').toBe(false);
    await page.setViewportSize({ width: 390, height: 660 });

    await fillAndSubmit(page, `Mobile Family ${ts}`);
    await page.context().close();
    await expectQueued(browser, `Mobile Family ${ts}`);
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
