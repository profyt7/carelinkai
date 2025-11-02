import { test, expect } from '@playwright/test';

test.describe('Marketplace favorites (guest, localStorage fallback)', () => {
  test('toggle favorite and filter favorites only', async ({ page }) => {
    // Force runtime to use API-backed data instead of built-in mocks
    await page.route('**/api/runtime/mocks', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ show: false }) }));
    // Mock authenticated caregiver session to bypass auth redirects in layout
    await page.route('**/api/auth/session', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'user-1',
            role: 'CAREGIVER',
            name: 'Test User',
            firstName: 'Test',
            lastName: 'User',
            email: 'test@example.com',
          },
          expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        }),
      })
    );

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

    // Favorites API for authenticated caregiver
    await page.route('**/api/marketplace/favorites**', async (route) => {
      const method = route.request().method();
      if (method === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
      }
      if (method === 'POST') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
      }
      if (method === 'DELETE') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    });

    await page.goto('/marketplace?tab=jobs');
    await page.getByRole('button', { name: /^Jobs/ }).click();
    // Wait for a job card to render instead of relying on tab count

    // Favorite the first job via its card-specific button
    const firstCard = page.locator('div.relative').filter({ has: page.getByRole('heading', { name: 'Caregiver Needed' }) }).first();
    await expect(firstCard).toBeVisible();
    const favBtn = firstCard.getByRole('button', { name: /favorite/i });
    await favBtn.click();

    // After click, aria-label should become Unfavorite
    await expect(firstCard.getByRole('button', { name: /unfavorite/i })).toBeVisible();

    // Enable Favorites only filter
    const favOnly = page.locator('div.md\\:w-72').getByLabel('Favorites only').first();
    await favOnly.check({ force: true });

    await expect(page.locator('div.relative').filter({ has: page.getByRole('heading', { name: 'Caregiver Needed' }) })).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'Caregiver Needed' })).toBeVisible();

    // Unfavorite and expect empty state text
    const unfavBtn = firstCard.getByRole('button', { name: /unfavorite/i });
    await unfavBtn.click();
    await expect(page.getByText('No jobs found')).toBeVisible();
  });
});
