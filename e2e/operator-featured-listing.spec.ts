/**
 * OL-190 — featured listing as a standalone purchase (operator without a subscription).
 *
 *  1. operator (no subscription) opens /operator/homes/[id]/edit → "Feature this
 *     listing — $79" → the browser is sent to the Checkout URL the API returns.
 *     Stripe is never called: the featured POST is answered by page.route with a
 *     Checkout-shaped reply whose URL is the edit page's own ?featured=success
 *     return URL (the server-side Checkout call is covered by the unit test).
 *     The return shows the "Payment received" toast.
 *  2. fulfilment: an unsigned checkout.session.completed (accepted by the webhook
 *     outside production only) with metadata type FEATURED_LISTING features the
 *     home for 30 days and writes one COMPLETED payment; replaying the same event
 *     does not extend it again.
 *
 *  Runs in the e2e-operator-claim CI job, which sets FEATURED_LISTING_ENABLED=1.
 */
import { test, expect, type Browser, type Page } from '@playwright/test';

const ts = Date.now();
const OP = `op-featured-${ts}@test.carelinkai.com`;
const HOME = `E2E Featured Home ${ts}`;

const CONSENT_INIT = () => {
  try {
    localStorage.setItem('carelinkai_cookie_consent', JSON.stringify({ necessary: true, analytics: false, marketing: false }));
    for (const role of ['ADMIN', 'OPERATOR', 'FAMILY', 'DISCHARGE_PLANNER']) {
      localStorage.setItem(`carelinkai_onboarding_completed_${role}`, 'true');
    }
  } catch {
    /* ignore */
  }
};

async function login(browser: Browser, email: string): Promise<Page> {
  const ctx = await browser.newContext();
  await ctx.addInitScript(CONSENT_INIT);
  const page = await ctx.newPage();
  await page.goto('/');
  const status = await page.evaluate(async (e) => {
    const r = await fetch('/api/dev/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: e }), credentials: 'include' });
    return r.status;
  }, email);
  expect(status, `dev-login ${email}`).toBe(200);
  return page;
}

async function homeFeatured(page: Page, id: string) {
  return page.evaluate(async (homeId) => {
    const r = await fetch(`/api/operator/homes/${homeId}`, { credentials: 'include' });
    const j = await r.json().catch(() => null);
    const h = j?.data;
    return { status: r.status, isFeatured: h?.isFeatured ?? null, featuredUntil: h?.featuredUntil ?? null, operatorId: h?.operatorId ?? '' };
  }, id);
}

test.describe.configure({ mode: 'serial' });
test.setTimeout(240_000);

test.describe('@critical OL-190 featured listing checkout (no subscription)', () => {
  let homeId = '';
  let operatorId = '';

  test.beforeAll(async ({ request }) => {
    await expect(async () => {
      const op = await request.post('/api/dev/upsert-operator', { data: { email: OP, companyName: `Featured Ops ${ts}`, onboarded: true, homes: [{ name: HOME, city: 'Cleveland' }] } });
      expect(op.status()).toBe(200);
      homeId = (await op.json()).homes[0].id;
    }).toPass({ timeout: 90_000, intervals: [2000, 5000, 10000] });
  });

  test.afterAll(async ({ request }) => {
    await request.delete('/api/dev/upsert-operator', { data: { email: OP, homeIds: [homeId] } }).catch(() => undefined);
  });

  test('the button sends an unsubscribed operator to Checkout; the return shows the payment toast', async ({ browser }) => {
    const op = await login(browser, OP);
    const editPath = `/operator/homes/${homeId}/edit`;
    let posted: any = null;
    await op.route(`**/api/operator/homes/${homeId}/featured`, async (route) => {
      posted = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, billing: 'checkout', url: `${editPath}?featured=success` }) });
    });

    await op.goto(editPath, { waitUntil: 'domcontentloaded' });
    const button = op.getByRole('button', { name: 'Feature this listing — $79' });
    await expect(button).toBeVisible({ timeout: 120_000 });
    await button.click();
    await op.waitForURL(/featured=success/, { timeout: 60_000 });
    expect(posted).toEqual({ action: 'enable' });
    // .first(): the app mounts two global <Toaster>s (layout + providers), so each toast renders twice.
    await expect(op.getByText('Payment received — your listing will show as featured within a minute.').first()).toBeVisible({ timeout: 60_000 });
  });

  test('checkout.session.completed features the home for 30 days, once', async ({ browser, request }) => {
    const op = await login(browser, OP);
    const before = await homeFeatured(op, homeId);
    expect(before.status).toBe(200);
    expect(before.isFeatured).toBe(false);
    operatorId = before.operatorId;
    expect(operatorId, 'operator id').toBeTruthy();

    const event = {
      id: `evt_e2e_featured_${ts}`,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: `cs_e2e_featured_${ts}`,
          object: 'checkout.session',
          mode: 'payment',
          payment_status: 'paid',
          amount_total: 7900,
          metadata: { type: 'FEATURED_LISTING', homeId, operatorId },
        },
      },
    };
    const first = await request.post('/api/webhooks/stripe', { data: event });
    expect(first.status()).toBe(200);
    expect((await first.json()).featuredListing).toBe('fulfilled');

    const after = await homeFeatured(op, homeId);
    expect(after.isFeatured).toBe(true);
    const days = (new Date(after.featuredUntil).getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThan(30.1);

    const replay = await request.post('/api/webhooks/stripe', { data: event });
    expect((await replay.json()).featuredListing).toBe('duplicate');
    expect((await homeFeatured(op, homeId)).featuredUntil).toBe(after.featuredUntil);

    await op.goto(`/operator/homes/${homeId}/edit`, { waitUntil: 'domcontentloaded' });
    await expect(op.getByText(/Featured until/)).toBeVisible({ timeout: 120_000 });
  });
});
