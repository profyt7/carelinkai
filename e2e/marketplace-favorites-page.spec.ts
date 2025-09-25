import { test, expect } from '@playwright/test';

test.describe('Favorites page (caregiver)', () => {
  test('list favorites and unfavorite from page', async ({ page }) => {
    // Mock caregiver session
    await page.route('**/api/auth/session', (route) =>
      route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: { id: 'u1', role: 'CAREGIVER', name: 'CG' },
        expires: new Date(Date.now() + 3600_000).toISOString(),
      }),
    })
    );

    // Categories
    await page.route('**/api/marketplace/categories', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: {} }) })
    );

    // Favorites list
    const now = new Date().toISOString();
    const favs = [
      { id: 'fav-1', listingId: 'job-1', createdAt: now, listing: { id: 'job-1', title: 'Caregiver Needed', description: 'Day care', city: 'Austin', state: 'TX', status: 'OPEN', hourlyRateMin: 22, hourlyRateMax: 28, createdAt: now }},
      { id: 'fav-2', listingId: 'job-2', createdAt: now, listing: { id: 'job-2', title: 'Night Shift', description: 'Overnight', city: 'Dallas', state: 'TX', status: 'OPEN', hourlyRateMin: 20, hourlyRateMax: 30, createdAt: now }},
    ];

    await page.route('**/api/marketplace/favorites', (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: favs }) });
      }
      if (route.request().method() === 'DELETE') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
      }
      return route.continue();
    });

    await page.goto('/marketplace/favorites');

    // Ensure two cards are present
    await expect(page.getByRole('heading', { name: 'Caregiver Needed' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Night Shift' })).toBeVisible();

    // Click Remove from favorites on first card
    const firstCard = page.locator('div.relative.bg-white').filter({ has: page.getByRole('heading', { name: 'Caregiver Needed' }) });
    await firstCard.getByRole('button', { name: /Remove from favorites/i }).click();

    // After unfavorite, first card should disappear
    await expect(page.getByRole('heading', { name: 'Caregiver Needed' })).toHaveCount(0);
  });
});
