import { test, expect, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { signShortlistToken } from '../../../src/lib/concierge/shortlist-token';

/**
 * Family Concierge, pay when ready (10/31) — the admin's order actions on a real build, end to end:
 *   saved shortlist → "Shortlist ready — send payment link" (a pasted buy.stripe.com link) → "Mark paid" →
 *   "Release shortlist". The family's signed shortlist page stays locked (no home names) until the order
 *   is PAID and released, then shows the shortlist with availability labeled.
 *
 * The request is seeded straight into the DB, dated last month, so it never counts toward this month's
 * concierge capacity (the offer / paid specs create real requests and assert REQUESTED_UNPAID).
 * Emails are stubbed in e2e by guardedResendSend; nothing is sent.
 */

const prisma = new PrismaClient();
const ts = Date.now();
const HOME_NAME = `PWR Sample Home ${ts}`;
const LINK = `https://buy.stripe.com/test_pwr${ts}`;
let searchId = '';
let orderId = '';

async function devLogin(page: Page, email: string) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const status = await page.evaluate(async (e) => (await fetch('/api/dev/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: e }), credentials: 'include' })).status, email);
  expect(status, `dev-login ${email}`).toBe(200);
}

test.describe('@critical Family Concierge — pay when ready (admin actions + family visibility)', () => {
  test.beforeAll(async ({ request }) => {
    const adminEmail = `pwr-admin-${ts}@test.carelinkai.com`;
    expect((await request.post('/api/dev/upsert-admin', { data: { email: adminEmail } })).ok()).toBe(true);
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: adminEmail }, select: { id: true } });
    const lastMonth = new Date(Date.now() - 40 * 24 * 3600 * 1000);
    const ps = await prisma.placementSearch.create({
      data: {
        userId: admin.id,
        queryText: `Family concierge request (private pay) — E2EPWR${ts}`,
        parsedCriteria: { source: 'concierge_page' },
        searchResults: { matches: [] },
        isConcierge: true,
        source: 'concierge_page',
        conciergeStatus: 'SHORTLIST_READY',
        conciergeSubmittedAt: lastMonth,
        conciergeRespondedAt: lastMonth,
        curatedHomes: [{ homeId: `pwr-home-${ts}`, name: HOME_NAME, address: '1 Test St, Cleveland, OH 44114', note: 'Quiet unit', confirmedAvailability: '' }],
        patientInfo: { contactName: 'E2E Family', contactEmail: `pwr-family-${ts}@test.carelinkai.com`, source: 'concierge_page' },
        createdAt: lastMonth,
      },
      select: { id: true },
    });
    searchId = ps.id;
    const order = await prisma.conciergeOrder.create({
      data: { placementSearchId: ps.id, email: `pwr-family-${ts}@test.carelinkai.com`, status: 'REQUESTED_UNPAID', createdAt: lastMonth },
      select: { id: true },
    });
    orderId = order.id;
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test('send link → mark paid → release; the family page shows the shortlist only after release', async ({ browser }) => {
    const secret = process.env['NEXTAUTH_SECRET'];
    expect(secret, 'NEXTAUTH_SECRET must match the server to sign the family link').toBeTruthy();
    const familyUrl = `/concierge/shortlist/${encodeURIComponent(signShortlistToken(orderId, secret!))}`;

    const family = await (await browser.newContext()).newPage();
    const familySees = async () => {
      await family.goto(familyUrl, { waitUntil: 'domcontentloaded' });
      return family.getByTestId('concierge-shortlist-page').innerText();
    };

    // Before anything: locked, no home names.
    let text = await familySees();
    expect(text).toContain('available yet');
    expect(text).not.toContain(HOME_NAME);

    const ctx = await browser.newContext();
    // No cookie banner or first-run tutorial over the panel.
    await ctx.addInitScript(() => {
      try {
        localStorage.setItem('carelinkai_cookie_consent', JSON.stringify({ necessary: true, analytics: false, marketing: false }));
        localStorage.setItem('carelinkai_onboarding_completed_ADMIN', 'true');
        localStorage.setItem('carelinkai_onboarding_completed', 'true');
      } catch {}
    });
    const admin = await ctx.newPage();
    await devLogin(admin, `pwr-admin-${ts}@test.carelinkai.com`);
    await admin.goto(`/admin/concierge/${searchId}`, { waitUntil: 'domcontentloaded' });
    const panel = admin.getByTestId('concierge-order-panel');
    await expect(panel).toHaveAttribute('data-order-status', 'REQUESTED_UNPAID', { timeout: 60_000 });

    // A non-Stripe link is refused.
    await panel.getByTestId('concierge-order-link-input').fill('https://example.com/pay');
    await panel.getByTestId('concierge-order-send-link').click();
    await expect(admin.getByText('Paste a Stripe Payment Link').first()).toBeVisible();

    // "Shortlist ready — send payment link".
    await panel.getByTestId('concierge-order-link-input').fill(LINK);
    await expect(panel.getByTestId('concierge-order-send-link')).toHaveText('Shortlist ready — send payment link');
    await panel.getByTestId('concierge-order-send-link').click();
    await expect(panel.getByTestId('concierge-order-link-sent')).not.toHaveText('—', { timeout: 30_000 });
    const afterLink = await prisma.conciergeOrder.findUniqueOrThrow({ where: { id: orderId } });
    // CONCIERGE_PAYMENT_LINK_URL is unset in CI, so the pasted link is the fallback; the order id and the
    // family's email ride along so the Stripe webhook can match the payment (OL-248).
    const stored = new URL(afterLink.paymentLinkUrl!);
    expect(stored.origin + stored.pathname).toBe(LINK);
    expect(stored.searchParams.get('client_reference_id')).toBe(orderId);
    expect(stored.searchParams.get('prefilled_email')).toBe(`pwr-family-${ts}@test.carelinkai.com`);
    expect(afterLink.status).toBe('REQUESTED_UNPAID');

    // Still locked for the family.
    text = await familySees();
    expect(text).not.toContain(HOME_NAME);

    // "Mark paid" → PAID, but not released yet: still locked.
    await panel.getByTestId('concierge-order-mark-paid').click();
    await expect(panel).toHaveAttribute('data-order-status', 'PAID', { timeout: 30_000 });
    text = await familySees();
    expect(text).not.toContain(HOME_NAME);

    // "Release shortlist" → the family sees it, availability labeled.
    await panel.getByTestId('concierge-order-release').click();
    await expect(panel.getByTestId('concierge-order-released')).not.toHaveText('—', { timeout: 30_000 });
    text = await familySees();
    expect(text).toContain(HOME_NAME);
    expect(text).toContain('Availability — unconfirmed.');
    expect(text).toContain('not a guaranteed opening or placement');

    // A forged token shows nothing.
    await family.goto(`/concierge/shortlist/${encodeURIComponent(signShortlistToken(orderId, 'wrong-secret'))}`, { waitUntil: 'domcontentloaded' });
    await expect(family.getByTestId('concierge-shortlist-invalid')).toBeVisible();
  });
});
