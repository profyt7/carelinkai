/**
 * OL-216 — /search result cards are SearchResultCard in BOTH grid and list view,
 * and every interaction the old inline cards had still works.
 *
 * Seeds three ASSISTED homes in a unique city (so /search?location=<city> returns
 * only them) plus a FAMILY user, via the ALLOW_DEV_ENDPOINTS routes. For grid and
 * list view:
 *   - save toggles the favorite: POST then DELETE /api/favorites, aria-pressed flips;
 *     a guest gets the sign-up prompt and no API call
 *   - Compare on two cards → both pressed + the "2 homes selected" compare bar
 *   - AI-match insight chips render when the query carries a residentProfile
 *   - FeaturedBadge renders for a featured home (the /api/search reply is passed
 *     through page.route with isFeatured set on one home — the only featured path
 *     in the app is a Stripe checkout)
 *   - View details navigates to /homes/<id>
 *   - grid and list render the same number of cards
 *
 *   npx playwright test --config=playwright.e2e.config.ts e2e/search-cards.spec.ts
 */
import { test, expect, type Page } from '@playwright/test';

const ts = Date.now();
const OP_EMAIL = `search-cards-op-${ts}@test.carelinkai.com`;
const FAMILY_EMAIL = `search-cards-family-${ts}@test.carelinkai.com`;
const CITY = `Cardtown${ts}`;
const NAMES = [`E2E Cards Alder ${ts}`, `E2E Cards Birch ${ts}`, `E2E Cards Cedar ${ts}`];
const PROFILE = encodeURIComponent(JSON.stringify({ careLevelNeeded: ['ASSISTED'], budget: { min: 2000, max: 8000 }, mobilityLevel: 4 }));
const ids: string[] = [];

const CONSENT_INIT = () => {
  try {
    localStorage.setItem('carelinkai_cookie_consent', JSON.stringify({ necessary: true, analytics: false, marketing: false }));
    localStorage.setItem('carelinkai_onboarding_completed_FAMILY', 'true');
    localStorage.removeItem('carelink_resident_profile');
  } catch {
    /* storage blocked — assertions don't depend on it */
  }
};

const cards = (page: Page) => page.getByTestId('search-result-card');
const card = (page: Page, id: string) => page.locator(`[data-testid="search-result-card"][data-home-id="${id}"]`);

async function loginFamily(page: Page) {
  await page.goto('/');
  const status = await page.evaluate(
    async (e) => (await fetch('/api/dev/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: e }), credentials: 'include' })).status,
    FAMILY_EMAIL,
  );
  expect(status, 'dev-login family').toBe(200);
}

async function openSearch(page: Page, view: 'grid' | 'list', extra = '') {
  await page.goto(`/search?location=${CITY}${extra}`, { waitUntil: 'domcontentloaded' });
  await expect(card(page, ids[0])).toBeVisible({ timeout: 60_000 });
  if (view === 'list') {
    await page.getByRole('button', { name: 'List', exact: true }).filter({ visible: true }).first().click();
    await expect(page.locator('[data-testid="search-result-card"][data-variant="list"]').first()).toBeVisible({ timeout: 30_000 });
  }
  await expect(cards(page).first()).toHaveAttribute('data-variant', view);
}

test.describe('@critical OL-216 search result cards', () => {
  test.beforeAll(async ({ request }) => {
    const res = await request.post('/api/dev/upsert-operator', {
      data: {
        email: OP_EMAIL,
        companyName: `Search Cards Ops ${ts}`,
        homes: NAMES.map((name, i) => ({
          name,
          city: CITY,
          zipCode: '44122',
          careLevel: ['ASSISTED'],
          capacity: 20,
          ...(i === 0 ? { startingPriceMonthly: 4800, googleRating: 4.5, googleRatingCount: 40 } : {}),
        })),
      },
    });
    expect(res.status(), 'dev seed').toBe(200);
    const homes = (await res.json()).homes as Array<{ id: string; name: string }>;
    for (const n of NAMES) ids.push(homes.find((h) => h.name === n)!.id);
    expect((await request.post('/api/dev/upsert-family', { data: { email: FAMILY_EMAIL } })).ok(), 'family seed').toBe(true);
  });

  test.afterAll(async ({ request }) => {
    await request.delete('/api/dev/upsert-operator', { data: { email: OP_EMAIL } }).catch(() => undefined);
  });

  test('grid and list render the same cards for the same query', async ({ page }) => {
    await page.addInitScript(CONSENT_INIT);
    await openSearch(page, 'grid');
    await expect(cards(page)).toHaveCount(3);
    const gridIds = await cards(page).evaluateAll((els) => els.map((e) => e.getAttribute('data-home-id')));
    await page.getByRole('button', { name: 'List', exact: true }).filter({ visible: true }).first().click();
    await expect(page.locator('[data-testid="search-result-card"][data-variant="list"]')).toHaveCount(3);
    expect(await cards(page).evaluateAll((els) => els.map((e) => e.getAttribute('data-home-id')))).toEqual(gridIds);
    await expect(page.getByTestId('search-results-helper')).toHaveText(/Availability and prices show their source and date, or say .contact to confirm.\./);
  });

  for (const view of ['grid', 'list'] as const) {
    test(`${view}: save toggles the favorite (FAMILY)`, async ({ page }) => {
      await page.addInitScript(CONSENT_INIT);
      await loginFamily(page);
      await openSearch(page, view);
      const save = card(page, ids[1]).getByTestId('card-save');
      await expect(save).toHaveAttribute('aria-pressed', 'false');

      const add = page.waitForRequest((r) => r.url().includes('/api/favorites') && r.method() === 'POST');
      await save.click();
      expect((await add).postDataJSON()).toMatchObject({ homeId: ids[1] });
      await expect(save).toHaveAttribute('aria-pressed', 'true');
      await expect(save).toHaveAccessibleName(`Remove ${NAMES[1]} from saved homes`);

      const remove = page.waitForRequest((r) => r.url().includes('/api/favorites') && r.method() === 'DELETE');
      await save.click();
      expect((await remove).url()).toContain(`homeId=${ids[1]}`);
      await expect(save).toHaveAttribute('aria-pressed', 'false');
    });

    test(`${view}: a guest's save prompts sign-up and calls nothing`, async ({ page }) => {
      await page.addInitScript(CONSENT_INIT);
      await openSearch(page, view);
      const calls: string[] = [];
      page.on('request', (r) => { if (r.url().includes('/api/favorites') && r.method() !== 'GET') calls.push(r.method()); });
      const save = card(page, ids[0]).getByTestId('card-save');
      await save.click();
      // Two toasters are mounted app-wide (layout + providers); assert the visible prompt.
      await expect(page.getByText('Create a free account to save homes.').filter({ visible: true }).first()).toBeVisible();
      await expect(save).toHaveAttribute('aria-pressed', 'false');
      expect(calls).toEqual([]);
    });

    test(`${view}: Compare on two cards fills the compare bar`, async ({ page }) => {
      await page.addInitScript(CONSENT_INIT);
      await openSearch(page, view);
      for (const id of [ids[0], ids[2]]) {
        const btn = card(page, id).getByTestId('card-compare');
        await btn.click();
        await expect(btn).toHaveAttribute('aria-pressed', 'true');
        await expect(btn).toHaveText('Comparing');
      }
      await expect(card(page, ids[1]).getByTestId('card-compare')).toHaveAttribute('aria-pressed', 'false');
      await expect(page.getByText('2 homes selected for comparison')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Compare', exact: true })).toBeEnabled();
      // Toggling one off goes back to "select at least 2".
      await card(page, ids[2]).getByTestId('card-compare').click();
      await expect(page.getByText(/1 home selected for comparison — select at least 2/)).toBeVisible();
    });

    test(`${view}: AI-match insight chips render with a resident profile`, async ({ page }) => {
      await page.addInitScript(CONSENT_INIT);
      await openSearch(page, view, `&residentProfile=${PROFILE}`);
      const insights = card(page, ids[0]).getByTestId('card-insights');
      await expect(insights).toBeVisible();
      await expect(insights).toContainText(/\d+% match/);
      await expect(insights.getByTestId('card-insight-chip')).toHaveCount(3);
      await expect(insights.getByTestId('card-insight-chip').first()).toHaveText(/^(Care Level|Budget|Location|Amenities|Gender|Social|Medical): \d+$/);
      await expect(insights.getByRole('button', { name: 'Explain' })).toBeVisible();
    });

    test(`${view}: no insight chips without a resident profile`, async ({ page }) => {
      await page.addInitScript(CONSENT_INIT);
      await openSearch(page, view);
      await expect(page.getByTestId('card-insights')).toHaveCount(0);
    });

    test(`${view}: FeaturedBadge renders on a featured home`, async ({ page }) => {
      await page.addInitScript(CONSENT_INIT);
      await page.route('**/api/search?**', async (route) => {
        const res = await route.fetch();
        const json = await res.json();
        for (const r of json.results ?? []) r.isFeatured = r.id === ids[2];
        await route.fulfill({ response: res, json });
      });
      await openSearch(page, view);
      await expect(card(page, ids[2]).getByTestId('featured-badge')).toHaveText('Featured');
      await expect(card(page, ids[0]).getByTestId('featured-badge')).toHaveCount(0);
    });

    test(`${view}: View details opens /homes/[id]`, async ({ page }) => {
      await page.addInitScript(CONSENT_INIT);
      await openSearch(page, view);
      const link = card(page, ids[0]).getByTestId('card-view-details');
      await expect(link).toHaveAttribute('href', `/homes/${ids[0]}`);
      await link.click();
      await page.waitForURL(new RegExp(`/homes/${ids[0]}$`), { timeout: 60_000 });
    });
  }

  test('empty results: honest empty state, and Clear filters resets the search', async ({ page }) => {
    await page.addInitScript(CONSENT_INIT);
    await page.goto(`/search?location=Nowhere${ts}`, { waitUntil: 'domcontentloaded' });
    const empty = page.getByTestId('search-empty-state');
    await expect(empty).toBeVisible({ timeout: 60_000 });
    await expect(empty).toContainText('No homes match these filters');
    await expect(page.getByTestId('search-results-helper')).toHaveCount(0);
    await empty.getByRole('button', { name: 'Clear filters' }).click();
    await page.waitForURL(/\/search$/);
  });
});
