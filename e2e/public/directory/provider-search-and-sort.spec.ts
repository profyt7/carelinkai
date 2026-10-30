/**
 * Pre-launch polish 2 (items 4–6), real rows via /api/dev/upsert-provider:
 *   - text search + city filter AND (they used to share one OR, so either alone matched);
 *   - default order is verified first, then name; no "Rating" sort; no 0.0 stars without reviews;
 *   - at 390 a long provider name never runs under the favourite heart.
 */
import { test, expect, type APIRequestContext } from '@playwright/test';

const TAG = `and${Date.now()}`;
const P = {
  alphaCle: { businessName: `${TAG} Alpha Rides`, coverageArea: { cities: ['Cleveland'], states: ['OH'] }, serviceTypes: ['transportation'] },
  zetaCleVerified: { businessName: `${TAG} Zeta Home Health`, coverageArea: { cities: ['Cleveland'], states: ['OH'] }, serviceTypes: ['home-health'], isVerified: true },
  betaAkron: { businessName: `${TAG} Beta Meals`, coverageArea: { cities: ['Akron'], states: ['OH'] }, serviceTypes: ['meal-delivery'] },
  // Matches the city but not the text.
  otherCle: { businessName: `Unrelated Cleveland Equipment ${Date.now()}`, coverageArea: { cities: ['Cleveland'], states: ['OH'] }, serviceTypes: ['medical-equipment'] },
  longName: { businessName: `${TAG} Greater Cleveland Comprehensive Home Health and Rehabilitation Services Cooperative`, coverageArea: { cities: ['Parma'], states: ['OH'] }, serviceTypes: ['home-health'] },
};
const FAMILY_EMAIL = `family+${TAG}@carelinkai.test`;

async function names(request: APIRequestContext, qs: string): Promise<string[]> {
  const res = await request.get(`/api/marketplace/providers?pageSize=50&${qs}`);
  expect(res.ok(), qs).toBe(true);
  return ((await res.json()).data as { businessName: string }[]).map((p) => p.businessName);
}

test.describe('provider search: AND filters, honest sort and ratings, card layout', () => {
  test.beforeAll(async ({ request }) => {
    for (const [i, p] of Object.values(P).entries()) {
      expect((await request.post('/api/dev/upsert-provider', { data: { ...p, email: `p${i}+${TAG}@carelinkai.test` } })).ok(), p.businessName).toBe(true);
    }
    expect((await request.post('/api/dev/upsert-family', { data: { email: FAMILY_EMAIL } })).ok()).toBe(true);
  });

  test('API: q + city AND together (regression: they used to OR)', async ({ request }) => {
    const both = await names(request, `q=${TAG}&city=Cleveland`);
    expect(both).toEqual([P.zetaCleVerified.businessName, P.alphaCle.businessName]); // verified first, then name
    expect(both).not.toContain(P.betaAkron.businessName); // text matches, city doesn't
    expect(both).not.toContain(P.otherCle.businessName); // city matches, text doesn't
    expect(await names(request, `q=${TAG}&city=Akron`)).toEqual([P.betaAkron.businessName]);
    expect(await names(request, `q=${TAG}&city=Cleveland&serviceTypes=transportation`)).toEqual([P.alphaCle.businessName]);
  });

  test('API: default order is verified first, then name; "recency" keeps newest first', async ({ request }) => {
    const all = await names(request, `q=${TAG}`);
    expect(all[0]).toBe(P.zetaCleVerified.businessName);
    expect(all.slice(1)).toEqual([...all.slice(1)].sort((a, b) => a.localeCompare(b)));
    const recent = await names(request, `q=${TAG}&sortBy=recency`);
    expect(recent[0]).toBe(P.longName.businessName); // seeded last
  });

  test('390 page: no Rating sort, no placeholder stars, long name clear of the heart', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      try { localStorage.setItem('carelinkai_cookie_consent', JSON.stringify({ necessary: true })); localStorage.setItem('carelinkai_onboarding_completed_FAMILY', 'true'); } catch { /* ignore */ }
    });
    await page.goto('/');
    expect(await page.evaluate(async (e) => (await fetch('/api/dev/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: e }), credentials: 'include' })).status, FAMILY_EMAIL)).toBe(200);
    await page.goto(`/marketplace/providers?q=${TAG}`);
    const title = page.getByRole('heading', { level: 3, name: P.longName.businessName });
    await expect(title).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole('heading', { level: 3 }).filter({ hasText: TAG })).toHaveCount(4);

    await page.getByRole('button', { name: /Filters/ }).click();
    const sort = page.locator('select').filter({ has: page.locator('option[value="verified"]') }).first();
    await expect(sort).toHaveValue('verified');
    await expect(page.locator('option', { hasText: /Rating/ })).toHaveCount(0);
    await page.getByRole('button', { name: 'Close filters' }).click();
    await expect(page.getByRole('button', { name: 'Close filters' })).toHaveCount(0);

    await expect(page.getByTestId('provider-rating')).toHaveCount(0);
    await expect(page.getByText(/0\.0 \(0\)/)).toHaveCount(0);

    await expect(title).toHaveAttribute('title', P.longName.businessName);
    // The card root holds both the name and the (absolutely positioned) favourite button.
    const card = page.locator('div').filter({ has: title }).filter({ has: page.getByRole('button', { name: /favorites/ }) }).last();
    const heart = card.getByRole('button', { name: /favorites/ });
    await title.scrollIntoViewIfNeeded();
    await expect(heart).toBeVisible();
    const [t, h] = [await title.boundingBox(), await heart.boundingBox()];
    expect(t && h, 'name and heart are laid out').toBeTruthy();
    if (!t || !h) return;
    const overlap = !(t.x + t.width <= h.x || h.x + h.width <= t.x || t.y + t.height <= h.y || h.y + h.height <= t.y);
    expect(overlap, 'name box clear of the heart').toBe(false);
  });
});
