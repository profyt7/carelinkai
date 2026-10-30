import { test, expect, type APIRequestContext } from '@playwright/test';

/**
 * Provider launch taxonomy (10/29). Fails if a category filter returns a provider outside that
 * category, drops a multi-category provider, stops matching legacy values mapped onto a category,
 * or the /marketplace/providers page and the API stop using the same `serviceTypes` param.
 * Real rows via /api/dev/upsert-provider (ALLOW_DEV_ENDPOINTS, service-container DB only).
 */
const TAG = `cat${Date.now()}`;
const P = {
  homeHealth: { businessName: `${TAG} Home Health Only`, serviceTypes: ['home-health'] },
  multi: { businessName: `${TAG} Therapy and Home Health`, serviceTypes: ['therapy', 'home-health'] },
  meals: { businessName: `${TAG} Meals Only`, serviceTypes: ['meal-delivery'] },
  legacy: { businessName: `${TAG} Companionship (legacy value)`, serviceTypes: ['companionship'] },
  equipment: { businessName: `${TAG} Equipment and Rides`, serviceTypes: ['medical-equipment', 'transportation'] },
};
const FAMILY_EMAIL = `family+${TAG}@carelinkai.test`;

async function names(request: APIRequestContext, qs: string): Promise<string[]> {
  const res = await request.get(`/api/marketplace/providers?q=${TAG}&pageSize=50&${qs}`);
  expect(res.ok(), qs).toBe(true);
  const body = await res.json();
  return (body.data as { businessName: string }[]).map((p) => p.businessName).sort();
}

test.describe('provider category filter', () => {
  test.beforeAll(async ({ request }) => {
    for (const [i, p] of Object.values(P).entries()) {
      const r = await request.post('/api/dev/upsert-provider', { data: { ...p, email: `provider${i}+${TAG}@carelinkai.test` } });
      expect(r.ok(), `seed ${p.businessName}`).toBe(true);
    }
    expect((await request.post('/api/dev/upsert-family', { data: { email: FAMILY_EMAIL } })).ok(), 'family seed').toBe(true);
  });

  test('API: each category returns only its providers, multi-category providers included', async ({ request }) => {
    expect(await names(request, 'serviceTypes=home-health')).toEqual([P.homeHealth.businessName, P.multi.businessName].sort());
    expect(await names(request, 'serviceTypes=therapy')).toEqual([P.multi.businessName]);
    expect(await names(request, 'serviceTypes=meal-delivery')).toEqual([P.meals.businessName]);
    expect(await names(request, 'serviceTypes=medical-equipment')).toEqual([P.equipment.businessName]);
    expect(await names(request, 'serviceTypes=transportation')).toEqual([P.equipment.businessName]);
    // A legacy stored value counts as its launch category (existing rows are never rewritten).
    expect(await names(request, 'serviceTypes=personal-care')).toEqual([P.legacy.businessName]);
    // Several categories = any match.
    expect(await names(request, 'serviceTypes=therapy,meal-delivery')).toEqual([P.multi.businessName, P.meals.businessName].sort());
    // Old links (?serviceType=) still filter the same way.
    expect(await names(request, 'serviceType=therapy')).toEqual([P.multi.businessName]);
    // No filter → all five.
    expect(await names(request, '')).toHaveLength(5);
  });

  test('page: ticking a category sends serviceTypes and lists only matching providers', async ({ page }) => {
    await page.goto('/');
    const status = await page.evaluate(async (e) => (await fetch('/api/dev/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: e }), credentials: 'include' })).status, FAMILY_EMAIL);
    expect(status).toBe(200);

    await page.goto(`/marketplace/providers?q=${TAG}`);
    const cards = page.getByRole('heading', { level: 3 }).filter({ hasText: TAG });
    await expect(cards).toHaveCount(5);

    const req = page.waitForRequest((r) => r.url().includes('/api/marketplace/providers?') && r.url().includes('serviceTypes=home-health'));
    await page.getByTestId('svc-filter-home-health').first().locator('input').check();
    expect(new URL((await req).url()).searchParams.get('serviceTypes')).toBe('home-health');

    await expect(cards).toHaveCount(2);
    await expect(page.getByText(P.homeHealth.businessName).first()).toBeVisible();
    await expect(page.getByText(P.multi.businessName).first()).toBeVisible();
    await expect(page.getByText(P.meals.businessName)).toHaveCount(0);
    // The multi-category card shows both of its categories, skilled ones labelled as such.
    // The card root: the innermost element holding both the name and the card's own CTA row.
    const multiCard = page.locator('div').filter({ has: page.getByRole('heading', { name: P.multi.businessName }) }).filter({ hasText: 'View Profile' }).last();
    await expect(multiCard.getByText('Home Health Care (skilled, licensed)')).toBeVisible();
    await expect(multiCard.getByText('Physical & Rehabilitation Therapy')).toBeVisible();
  });

  test('390: provider search results use the full width (filters stack above)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.evaluate(async (e) => fetch('/api/dev/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: e }), credentials: 'include' }), FAMILY_EMAIL);
    await page.goto(`/marketplace/providers?q=${TAG}`);
    await expect(page.getByRole('heading', { level: 3 }).filter({ hasText: TAG }).first()).toBeVisible();
    const box = (await page.getByTestId('providers-results').boundingBox())!;
    expect(box.width).toBeGreaterThan(330);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});
