/**
 * OL-200 — search cards never show capacity-derived availability.
 *
 * Seeds three homes in a unique city (so /search?location=<city> returns only
 * them, whatever else the job seeded) via /api/dev/upsert-operator:
 *   (1) unclaimed, capacity 22, occupancy 0, never verified
 *   (2) occupancy = capacity, never verified
 *   (3) availabilityVerifiedAt = now, availabilityCount = 3, source AI_CALL
 * Then on /search — grid view, and list view via the on-page toggle (there is
 * no ?view= URL param) — (1) and (2) read exactly "Contact to confirm
 * availability", (3) reads "Verified <date> · 3 open", and no listing card
 * contains "N Available" or "Waitlist". The AI Match results page
 * (/dashboard/find-care/results/[id]) gets the same card assertions.
 *
 *   npx playwright test --config=playwright.e2e.config.ts e2e/search-availability-labels.spec.ts
 */
import { test, expect, type Page } from '@playwright/test';

const ts = Date.now();
const OP_EMAIL = `avail-labels-op-${ts}@test.carelinkai.com`;
const FAMILY_EMAIL = `avail-labels-family-${ts}@test.carelinkai.com`;
const CITY = `Availtown${ts}`;
const UNCLAIMED = `E2E Avail Unclaimed ${ts}`;
const FULL = `E2E Avail Full ${ts}`;
const VERIFIED = `E2E Avail Verified ${ts}`;
const FORBIDDEN = /\b\d+ Available\b|Waitlist/i;

const CONSENT_INIT = () => {
  try {
    localStorage.setItem('carelinkai_cookie_consent', JSON.stringify({ necessary: true, analytics: false, marketing: false }));
    localStorage.setItem('carelinkai_onboarding_completed_FAMILY', 'true');
  } catch {
    /* storage blocked — assertions don't depend on it */
  }
};

/** "Oct 26" in Cleveland time — the same format AvailabilityBadge renders. */
const TODAY = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' });

const ids: Record<string, string> = {};

/** A search card is the /homes/<id> link that wraps the image, badge and details. */
const card = (page: Page, id: string) => page.locator(`a[href="/homes/${id}"]`).first();

async function assertCards(page: Page) {
  for (const name of [UNCLAIMED, FULL]) {
    const badge = card(page, ids[name]).getByTestId('availability-badge');
    await expect(badge, name).toHaveText('Contact to confirm availability');
    await expect(badge).toHaveAttribute('data-verified-at', '');
  }
  const verified = card(page, ids[VERIFIED]).getByTestId('availability-badge');
  await expect(verified).toHaveText(new RegExp(`^Verified ${TODAY}\\s*· 3 open$`));
  await expect(verified).toHaveAttribute('data-verified-at', /\d{4}-\d{2}-\d{2}T/);
  for (const id of Object.values(ids)) {
    await expect(card(page, id)).not.toContainText(FORBIDDEN);
  }
}

test.describe('@critical search cards show only verified availability (OL-200)', () => {
  test.beforeAll(async ({ request }) => {
    const res = await request.post('/api/dev/upsert-operator', {
      data: {
        email: OP_EMAIL,
        companyName: `Avail Labels Ops ${ts}`,
        homes: [
          { name: UNCLAIMED, city: CITY, zipCode: '44122', careLevel: ['ASSISTED'], capacity: 22, currentOccupancy: 0, unclaimed: true },
          { name: FULL, city: CITY, zipCode: '44122', careLevel: ['ASSISTED'], capacity: 12, currentOccupancy: 12 },
          {
            name: VERIFIED,
            city: CITY,
            zipCode: '44122',
            careLevel: ['ASSISTED'],
            capacity: 30,
            currentOccupancy: 4,
            availabilityVerifiedDaysAgo: 0,
            availabilityCount: 3,
            availabilitySource: 'AI_CALL',
          },
        ],
      },
    });
    expect(res.status(), 'dev seed').toBe(200);
    for (const h of (await res.json()).homes as Array<{ id: string; name: string }>) ids[h.name] = h.id;
    expect(Object.keys(ids)).toHaveLength(3);
  });

  test.afterAll(async ({ request }) => {
    await request
      .delete('/api/dev/upsert-operator', { data: { email: OP_EMAIL, homeIds: [ids[UNCLAIMED]].filter(Boolean) } })
      .catch(() => undefined);
  });

  test('API keeps the capacity number but marks only (3) as verified', async ({ request }) => {
    const res = await request.get(`/api/search?location=${CITY}&limit=50`);
    expect(res.status()).toBe(200);
    const byId = new Map(((await res.json()).results as any[]).map((r) => [r.id, r]));
    expect(byId.get(ids[UNCLAIMED]).availability).toBe(22);
    expect(byId.get(ids[UNCLAIMED]).availabilityFreshness.fresh).toBe(false);
    expect(byId.get(ids[FULL]).availabilityFreshness.fresh).toBe(false);
    expect(byId.get(ids[VERIFIED]).availabilityFreshness).toMatchObject({ fresh: true, count: 3 });
  });

  test('/search grid view, then list view via the toggle', async ({ page }) => {
    await page.addInitScript(CONSENT_INIT);
    await page.goto(`/search?location=${CITY}`, { waitUntil: 'domcontentloaded' });
    await expect(card(page, ids[VERIFIED])).toBeVisible({ timeout: 60000 });
    await assertCards(page);

    await page.getByRole('button', { name: 'List', exact: true }).filter({ visible: true }).first().click();
    // List view lays the image beside the details (md:flex-row); wait for it to replace the grid.
    await expect(page.locator('div.space-y-4 a[href^="/homes/"]').first()).toBeVisible({ timeout: 30000 });
    await assertCards(page);
  });

  test('AI Match results cards (/dashboard/find-care/results/[id])', async ({ browser, request }) => {
    expect((await request.post('/api/dev/upsert-family', { data: { email: FAMILY_EMAIL } })).ok(), 'family seed').toBe(true);
    const ctx = await browser.newContext();
    await ctx.addInitScript(CONSENT_INIT);
    const page = await ctx.newPage();
    await page.goto('/');
    const login = await page.evaluate(
      async (e) => (await fetch('/api/dev/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: e }), credentials: 'include' })).status,
      FAMILY_EMAIL,
    );
    expect(login, 'dev-login family').toBe(200);

    const match = await page.evaluate(async () => {
      const r = await fetch('/api/family/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          budgetMin: 1000,
          budgetMax: 20000,
          careLevel: 'ASSISTED',
          zipCode: '44122',
          maxDistance: 100,
          moveInTimeline: 'EXPLORING',
        }),
      });
      return { status: r.status, json: await r.json().catch(() => null) };
    });
    expect([200, 201], JSON.stringify(match.json)).toContain(match.status);
    // The three ASSISTED homes seeded above guarantee at least one result.
    expect(match.json.matchesFound).toBeGreaterThan(0);

    await page.goto(`/dashboard/find-care/results/${match.json.matchRequestId}`, { waitUntil: 'domcontentloaded' });
    const badges = page.getByTestId('availability-badge');
    await expect(badges.first()).toBeVisible({ timeout: 60000 });
    const texts = (await badges.allTextContents()).map((t) => t.replace(/\s+/g, ' ').trim());
    expect(texts.length).toBeGreaterThan(0);
    for (const t of texts) expect(t).toMatch(/^(Verified .+|Contact to confirm availability)$/);
    await expect(page.locator('body')).not.toContainText(/\b\d+ beds available\b|Waitlist only/i);
    await ctx.close();
  });
});
