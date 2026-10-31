import { test, expect, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

/**
 * Concierge shortlist, manual curation (fix/concierge-manual-shortlist), on a real build:
 * a family request from /concierge has NO stored matches. The admin runs "Suggest homes near {ZIP}" (stores
 * candidates), adds a home by name, reorders / removes, sets the availability label, saves the shortlist, and
 * "Shortlist ready — send payment link" becomes usable. The family's shortlist page stays locked (unpaid).
 * Seeded straight into the DB, dated last month so it never counts toward this month's concierge capacity.
 */

const prisma = new PrismaClient();
const ts = Date.now();
const DIRECTORY = 'directory-unclaimed@carelinkai.system';
const ZIP = '44107';
const HOME_A = `Manual Pick Alder ${ts}`;
const HOME_B = `Manual Pick Birch ${ts}`;
const ADMIN = `manual-shortlist-admin-${ts}@test.carelinkai.com`;
const SHOTS = process.env['CONCIERGE_SHOTS_DIR'];
let searchId = '';
let orderId = '';
const homeIds: string[] = [];

async function devLogin(page: Page, email: string) {
  const res = await page.request.post('/api/dev/login', { data: { email }, timeout: 120_000 });
  expect(res.status(), `dev-login ${email}`).toBe(200);
}

test.describe('@critical concierge — manual shortlist with zero stored matches', () => {
  test.setTimeout(300_000);

  test.beforeAll(async ({ request }) => {
    expect((await request.post('/api/dev/upsert-admin', { data: { email: ADMIN } })).ok()).toBe(true);
    const dir = await request.post('/api/dev/upsert-operator', { data: { email: DIRECTORY, companyName: 'Directory (unclaimed)', homes: [{ name: HOME_A, city: 'Lakewood', zipCode: ZIP }, { name: HOME_B, city: 'Lakewood', zipCode: ZIP }] } });
    expect(dir.status()).toBe(200);
    for (const h of (await dir.json()).homes as { id: string; name: string }[]) if (h.name === HOME_A || h.name === HOME_B) homeIds.push(h.id);
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: ADMIN }, select: { id: true } });
    const lastMonth = new Date(Date.now() - 40 * 24 * 3600 * 1000);
    const ps = await prisma.placementSearch.create({
      data: {
        userId: admin.id,
        queryText: `Family concierge request (private pay) — E2EMANUAL${ts}`,
        parsedCriteria: { source: 'concierge_page' },
        searchResults: { matches: [] },
        isConcierge: true,
        source: 'concierge_page',
        conciergeStatus: 'SUBMITTED',
        conciergeSubmittedAt: lastMonth,
        intakeZip: ZIP,
        careLevel: 'Assisted living',
        patientInfo: { contactName: 'E2E Family', contactEmail: `manual-family-${ts}@test.carelinkai.com`, location: `Lakewood, OH ${ZIP}`, source: 'concierge_page' },
        createdAt: lastMonth,
      },
      select: { id: true },
    });
    searchId = ps.id;
    orderId = (await prisma.conciergeOrder.create({ data: { placementSearchId: ps.id, email: `manual-family-${ts}@test.carelinkai.com`, status: 'REQUESTED_UNPAID', createdAt: lastMonth }, select: { id: true } })).id;
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test('suggest → add by name → reorder / remove → save → payment link usable', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await ctx.addInitScript(() => {
      try {
        localStorage.setItem('carelinkai_cookie_consent', JSON.stringify({ necessary: true, analytics: false, marketing: false }));
        localStorage.setItem('carelinkai_onboarding_completed_ADMIN', 'true');
        localStorage.setItem('carelinkai_onboarding_completed', 'true');
      } catch {}
    });
    const page = await ctx.newPage();
    await devLogin(page, ADMIN);
    await page.goto(`/admin/concierge/${searchId}`, { waitUntil: 'domcontentloaded', timeout: 180_000 });

    // No stored matches: the order panel says save the shortlist first.
    const panel = page.getByTestId('concierge-order-panel');
    await expect(panel).toHaveAttribute('data-order-status', 'REQUESTED_UNPAID', { timeout: 120_000 });
    await expect(panel).toContainText('Save the shortlist below first');
    await expect(page.getByTestId('curate-shortlist-empty')).toBeVisible();

    // Suggest homes near the request's ZIP: candidates are stored like a DP search.
    await page.getByTestId('curate-suggest').click();
    await expect(page.getByTestId('curate-candidate').first()).toBeVisible({ timeout: 60_000 });
    const stored = await prisma.placementSearch.findUniqueOrThrow({ where: { id: searchId }, select: { searchResults: true } });
    expect(((stored.searchResults as any).matches as any[]).length).toBeGreaterThan(0);

    // Add both test homes by name (search → Add).
    for (const name of [HOME_A, HOME_B]) {
      await page.getByTestId('curate-search').fill(name);
      const results = page.getByTestId('curate-search-results');
      await expect(results).toContainText(name, { timeout: 30_000 });
      await results.locator('li', { hasText: name }).getByTestId('curate-search-add').click();
    }
    const picks = page.getByTestId('curate-pick');
    await expect(picks.filter({ hasText: HOME_A })).toHaveCount(1);
    await expect(picks.filter({ hasText: HOME_B })).toHaveCount(1);
    // Default label is unconfirmed (no verified availability on these homes).
    await expect(picks.filter({ hasText: HOME_A }).getByTestId('curate-pick-availability')).toHaveValue('unconfirmed');

    // Move B above A, and drop any suggested extras so the shortlist is exactly [B, A].
    await picks.filter({ hasText: HOME_B }).getByTestId('curate-pick-up').click();
    while ((await picks.count()) > 2) {
      const extra = picks.filter({ hasNotText: HOME_A }).filter({ hasNotText: HOME_B }).first();
      await extra.getByTestId('curate-pick-remove').click();
    }
    await picks.filter({ hasText: HOME_A }).getByTestId('curate-pick-availability').selectOption('verified');
    if (SHOTS) {
      await page.getByTestId('curate-shortlist').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${SHOTS}/curate-panel-1280.png`, fullPage: true });
    }

    await page.getByRole('button', { name: /Save shortlist/ }).click();
    await expect(panel).not.toContainText('Save the shortlist below first', { timeout: 60_000 });
    const saved = await prisma.placementSearch.findUniqueOrThrow({ where: { id: searchId }, select: { conciergeStatus: true, curatedHomes: true } });
    expect(saved.conciergeStatus).toBe('SHORTLIST_READY');
    const curated = saved.curatedHomes as { name: string; availabilityLabel: string; availabilityVerifiedOn: string | null }[];
    expect(curated.map((c) => c.name)).toEqual([HOME_B, HOME_A]);
    expect(curated.map((c) => c.availabilityLabel)).toEqual(['unconfirmed', 'verified']);
    expect(curated[0]!.availabilityVerifiedOn).toBeNull();
    expect(Date.parse(curated[1]!.availabilityVerifiedOn!)).toBeGreaterThan(Date.now() - 10 * 60_000);

    // "Shortlist ready — send payment link" is usable now (paste fallback when the env link is unset).
    const send = panel.getByTestId('concierge-order-send-link');
    const input = panel.getByTestId('concierge-order-link-input');
    if (await input.count()) await input.fill(`https://buy.stripe.com/test_manual${ts}`);
    await expect(send).toBeEnabled();
    await expect(send).toHaveText('Shortlist ready — send payment link');
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/curate-panel-saved-1280.png`, fullPage: true });

    // Still hidden from the family: the order is unpaid.
    const order = await prisma.conciergeOrder.findUniqueOrThrow({ where: { id: orderId }, select: { status: true, shortlistReleasedAt: true } });
    expect([order.status, order.shortlistReleasedAt]).toEqual(['REQUESTED_UNPAID', null]);
    await ctx.close();
  });
});
