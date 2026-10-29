/**
 * Follow-up to OL-173 — /homes/[id] has no mock mode. With the old mock cookie
 * (carelink_mock_mode=1) set, the page still renders the real seeded home and
 * never the hard-coded "Sunshine Care Home" / San Francisco listing. /learn
 * shows the "Financing option (CareCredit)" block with the not-affiliated line.
 * The listing's sticky bar stays below the sticky site header mid-scroll.
 *
 *   npx playwright test --config=playwright.e2e.config.ts e2e/public/directory/listing-no-mock.spec.ts
 */
import { test, expect } from '@playwright/test';

const ts = Date.now();
const OP_EMAIL = `listing-nomock-op-${ts}@test.carelinkai.com`;
const HOME_NAME = `E2E No Mock Home ${ts}`;

let homeId = '';

test.describe('@critical listing page never renders mock data', () => {
  test.beforeAll(async ({ request }) => {
    const res = await request.post('/api/dev/upsert-operator', {
      data: {
        email: OP_EMAIL,
        companyName: `No Mock Ops ${ts}`,
        homes: [{ name: HOME_NAME, city: 'Beachwood', zipCode: '44122', careLevel: ['ASSISTED'] }],
      },
    });
    expect(res.status(), 'dev seed').toBe(200);
    homeId = (await res.json()).homeId;
    expect(homeId).toBeTruthy();
  });

  test.afterAll(async ({ request }) => {
    await request.delete('/api/dev/upsert-operator', { data: { email: OP_EMAIL } }).catch(() => undefined);
  });

  test('the mock cookie is ignored: the real home renders, the mock listing never does', async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'carelink_mock_mode', value: '1', url: baseURL ?? 'http://localhost:3000' }]);
    await page.goto(`/homes/${homeId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1, name: HOME_NAME })).toBeVisible({ timeout: 60_000 });
    const body = page.locator('body');
    await expect(body).not.toContainText('Sunshine Care Home');
    await expect(body).not.toContainText('San Francisco');
    await expect(body).not.toContainText('123 Maple Street');
  });

  test('the sticky bar sits below the site header mid-scroll (≥ lg; below lg it scrolls with the page — OL-217 §7)', async ({ page }) => {
    // Below lg the site header and the listing CTA bar are the only sticky regions, so the bar is static there.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/homes/${homeId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1, name: HOME_NAME })).toBeVisible({ timeout: 60_000 });
    expect(await page.getByTestId('listing-sticky-bar').evaluate((el) => getComputedStyle(el).position)).toBe('static');
    for (const viewport of [{ width: 1280, height: 800 }]) {
      await page.setViewportSize(viewport);
      await page.goto(`/homes/${homeId}`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { level: 1, name: HOME_NAME })).toBeVisible({ timeout: 60_000 });
      await page.mouse.wheel(0, 1200);
      await page.waitForTimeout(300);
      const header = await page.getByTestId('site-header').boundingBox();
      const bar = await page.getByTestId('listing-sticky-bar').boundingBox();
      expect(header && bar, 'header + bar boxes').toBeTruthy();
      expect({ viewport: viewport.width, overlap: Math.max(0, header!.y + header!.height - bar!.y) }).toEqual({ viewport: viewport.width, overlap: 0 });
    }
  });

  test('/learn shows the CareCredit financing option with the not-affiliated line', async ({ page }) => {
    await page.goto('/learn', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Financing option (CareCredit)')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('carecredit-disclosure')).toContainText('not affiliated');
    await expect(page.locator('body')).not.toContainText(/partnered with CareCredit/i);
  });
});
