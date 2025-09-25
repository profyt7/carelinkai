import { test, expect } from '@playwright/test';

test.describe('Marketplace favorites (guest, localStorage fallback)', () => {
  test('toggle favorite and filter favorites only', async ({ page }) => {
    const listings = [
      {
        id: 'job-1',
        title: 'Caregiver Needed',
        description: 'Provide daytime care',
        city: 'Austin',
        state: 'TX',
        hourlyRateMin: 20,
        hourlyRateMax: 28,
        createdAt: new Date().toISOString(),
        status: 'OPEN',
      },
      {
        id: 'job-2',
        title: 'Night Shift',
        description: 'Overnight assistance',
        city: 'Dallas',
        state: 'TX',
        hourlyRateMin: 22,
        hourlyRateMax: 30,
        createdAt: new Date().toISOString(),
        status: 'OPEN',
      },
    ];

    // Categories fetch used for filters
    await page.route('**/api/marketplace/categories', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: {} }) })
    );

    // Listings fetch for jobs tab
    await page.route('**/api/marketplace/listings?**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: listings, pagination: { total: listings.length } }),
      })
    );

    await page.goto('/marketplace?tab=jobs');

    // Two job cards should render
    const cards = page.locator('a[href^="/marketplace/listings/"]');
    await expect(cards).toHaveCount(2);

    // Favorite the first job via its card-specific button
    const firstCard = page.locator('a[href="/marketplace/listings/job-1"]');
    await expect(firstCard).toBeVisible();
    const favBtn = firstCard.getByRole('button', { name: /favorite/i });
    await favBtn.click();

    // After click, aria-label should become Unfavorite
    await expect(firstCard.getByRole('button', { name: /unfavorite/i })).toBeVisible();

    // LocalStorage should include job-1
    const stored = await page.evaluate(() => localStorage.getItem('marketplace:job-favorites:v1'));
    expect(JSON.parse(stored || '[]')).toContain('job-1');

    // Enable Favorites only filter
    const favOnly = page.getByLabel('Favorites only');
    await favOnly.check();

    await expect(page.locator('a[href^="/marketplace/listings/"]')).toHaveCount(1);
    await expect(page.locator('a[href="/marketplace/listings/job-1"]')).toBeVisible();

    // Unfavorite and expect empty state text
    const unfavBtn = page.locator('a[href="/marketplace/listings/job-1"]').getByRole('button', { name: /unfavorite/i });
    await unfavBtn.click();
    await expect(page.getByText('No jobs found')).toBeVisible();
  });
});
