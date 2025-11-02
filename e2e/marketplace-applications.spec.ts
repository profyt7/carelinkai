import { test, expect } from '@playwright/test';

test.describe('Marketplace applications (caregiver apply/withdraw)', () => {
  test('apply and withdraw to a job', async ({ page }) => {
    // Mock caregiver session
    await page.route('**/api/auth/session', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: { id: 'u1', role: 'CAREGIVER' }, expires: new Date(Date.now() + 3600_000).toISOString() })
      })
    );

    // Categories
    await page.route('**/api/marketplace/categories', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: {} }) })
    );

    const listings = [
      { id: 'job-1', title: 'Caregiver Needed', description: 'Day care', city: 'Austin', state: 'TX', hourlyRateMin: 20, hourlyRateMax: 28, createdAt: new Date().toISOString(), status: 'OPEN' },
    ];

    // Listings for jobs tab
    await page.route('**/api/marketplace/listings?**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: listings, pagination: { total: 1 } }) })
    );

    // Applications endpoints
    await page.route('**/api/marketplace/applications', (route) => {
      const method = route.request().method();
      if (method === 'POST') {
        return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ data: { id: 'app-1', listingId: 'job-1', caregiverId: 'cg-1', status: 'APPLIED' } }) });
      }
      return route.continue();
    });
    // DELETE with query string
    await page.route('**/api/marketplace/applications?**', (route) => {
      if (route.request().method() === 'DELETE') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
      }
      return route.continue();
    });

    await page.goto('/marketplace?tab=jobs');

    // Wait for a job card to render (tab count can lag)
    const card = page.locator('a[href="/marketplace/listings/job-1"]');
    await expect(card).toBeVisible();

    // Apply
    const applyBtn = card.getByRole('button', { name: /apply/i });
    await applyBtn.click();

    // Should show Applied badge and offer Withdraw button
    await expect(card.getByText(/Applied/i)).toBeVisible();
    await expect(card.getByRole('button', { name: /withdraw/i })).toBeVisible();

    // Withdraw
    const withdrawBtn = card.getByRole('button', { name: /withdraw/i });
    await withdrawBtn.click();

    // Back to Quick apply, and withdraw should disappear on this card
    await expect(card.getByRole('button', { name: /withdraw/i })).toHaveCount(0);
    await expect(card.getByRole('button', { name: /quick apply/i })).toBeVisible();
  });
});
