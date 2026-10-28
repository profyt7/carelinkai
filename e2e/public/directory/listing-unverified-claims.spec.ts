/**
 * OL-176 — an unclaimed listing never states an unverified claim as fact.
 *
 * Seeds an UNCLAIMED home (owned by the directory placeholder operator, like a
 * directory import) carrying operator-style copy the way
 * scripts/enrich-batch2-held-homes.ts writes it: amenities, a description and
 * a tagline, and NO EntityEvent rows. Asserts:
 *   - amenities render only under "Reported features — confirm on your tour",
 *     with no checkmarks, and no amenity claim appears anywhere else unlabeled;
 *   - the description carries the public-sources note; the tagline is hidden;
 *   - no "All genders welcome", no "within 24 hours" promise;
 *   - the directory placeholder account is never shown as the facility contact.
 *
 *   npx playwright test --config=playwright.e2e.config.ts e2e/public/directory/listing-unverified-claims.spec.ts
 */
import { test, expect } from '@playwright/test';

const ts = Date.now();
const OP_EMAIL = `listing-claims-op-${ts}@test.carelinkai.com`;
const HOME_NAME = `E2E Unclaimed Claims Home ${ts}`;
const AMENITIES = ['24/7 on-site support', 'Chef-prepared MIND-diet dining', 'Sensory spa', 'Fitness room'];
const DESCRIPTION = `${HOME_NAME} offers private suites, 24/7 support and chef-created MIND-diet dining.`;
const TAGLINE = `Where every day shines ${ts}`;

let homeId = '';

test.describe('@critical OL-176 unclaimed listing: no unlabeled claims', () => {
  test.beforeAll(async ({ request }) => {
    const res = await request.post('/api/dev/upsert-operator', {
      data: {
        email: OP_EMAIL,
        companyName: `Claims Ops ${ts}`,
        homes: [{ name: HOME_NAME, city: 'Beachwood', zipCode: '44122', careLevel: ['ASSISTED'], amenities: AMENITIES, description: DESCRIPTION, tagline: TAGLINE, unclaimed: true }],
      },
    });
    expect(res.status(), 'dev seed').toBe(200);
    homeId = (await res.json()).homeId;
    expect(homeId).toBeTruthy();
  });

  test.afterAll(async ({ request }) => {
    await request.delete('/api/dev/upsert-operator', { data: { email: OP_EMAIL, homeIds: [homeId] } }).catch(() => undefined);
  });

  test('API: unclaimed, nothing verified, no placeholder operator, no default gender', async ({ request }) => {
    const data = (await (await request.get(`/api/homes/${homeId}`)).json()).data;
    expect({ unclaimed: data.unclaimed, verifiedFields: data.verifiedFields, operator: data.operator, gender: data.gender }).toEqual({
      unclaimed: true, verifiedFields: [], operator: null, gender: null,
    });
    expect(data.amenities).toEqual(AMENITIES);
  });

  test('page: amenities only as reported features, description labeled, no unbacked claims', async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('carelinkai_cookie_consent', JSON.stringify({ necessary: true, analytics: false, marketing: false })); } catch { /* storage blocked */ }
    });
    await page.goto(`/homes/${homeId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1, name: HOME_NAME })).toBeVisible({ timeout: 60_000 });

    // Amenities: own heading, plain bullets, no checkmark icons.
    await expect(page.getByTestId('amenities-heading')).toHaveText('Reported features — confirm on your tour');
    const list = page.getByTestId('listing-amenities');
    await expect(list).toHaveAttribute('data-verified', 'false');
    await expect(list.locator('svg')).toHaveCount(0);
    for (const a of AMENITIES) await expect(list.getByText(a, { exact: true })).toBeVisible();
    await expect(page.getByText('Amenities & Services')).toHaveCount(0);

    // Description: shown with the public-sources note; tagline hidden.
    await expect(page.getByTestId('listing-description')).toHaveAttribute('data-verified', 'false');
    await expect(page.getByTestId('description-source-note')).toContainText('not confirmed by the community');
    await expect(page.getByText(TAGLINE)).toHaveCount(0);

    // No amenity claim appears unlabeled anywhere else on the page.
    const rest = await page.evaluate(() => {
      const clone = document.body.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('[data-testid="listing-amenities"], [data-testid="listing-description"], script, style').forEach((n) => n.remove());
      return clone.innerText;
    });
    for (const claim of [...AMENITIES, '24/7', 'MIND-diet']) expect({ claim, found: rest.includes(claim) }).toEqual({ claim, found: false });

    // Other unbacked facts / promises.
    const body = page.locator('body');
    await expect(body).not.toContainText('All genders welcome');
    await expect(page.getByTestId('quick-facts-gender')).toHaveCount(0);
    await expect(body).not.toContainText('within 24 hours');
    await expect(body).not.toContainText('directory-unclaimed@');
    await expect(body).not.toContainText('Facility Contact');
    await expect(page.getByTestId('contact-unclaimed')).toContainText("hasn't claimed its listing");
  });
});
