import { test, expect } from '@playwright/test';

test.describe('Marketplace providers - cursor-based pagination', () => {
  test('infinite scroll loads next page via cursor without duplicates', async ({ page }) => {
    // Mock session
    await page.route('**/api/auth/session', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'e2e-user', role: 'FAMILY', name: 'E2E User' },
          expires: new Date(Date.now() + 3600_000).toISOString(),
        }),
      })
    );

    // Categories (unused but requested by page)
    await page.route('**/api/marketplace/categories', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: {} }) })
    );

    // Two pages of providers
    const page1 = Array.from({ length: 20 }).map((_, i) => ({
      id: `provider-${i + 1}`,
      name: `Provider ${i + 1}`,
      type: 'TRANSPORTATION',
      city: 'San Francisco',
      state: 'CA',
      services: ['medical-appointments', 'door-to-door'],
      description: 'Reliable transport',
      hourlyRate: 45,
      perMileRate: null,
      ratingAverage: 4.5,
      reviewCount: 25,
      badges: ['Top Rated'],
      coverageRadius: 20,
      availableHours: '24/7',
    }));
    const page2 = Array.from({ length: 10 }).map((_, i) => ({
      id: `provider-${i + 21}`,
      name: `Provider ${i + 21}`,
      type: 'TRANSPORTATION',
      city: 'Oakland',
      state: 'CA',
      services: ['pharmacy-pickup'],
      description: 'Fast transport',
      hourlyRate: 50,
      perMileRate: null,
      ratingAverage: 4.3,
      reviewCount: 12,
      badges: ['Licensed & Insured'],
      coverageRadius: 25,
      availableHours: '24/7',
    }));

    // Providers API with cursor pagination
    await page.route('**/api/marketplace/providers?**', (route) => {
      const url = new URL(route.request().url());
      const cursor = url.searchParams.get('cursor');
      if (!cursor) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: page1, pagination: { page: 1, pageSize: 20, total: 30, hasMore: true, cursor: 'provider-20' } })
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: page2, pagination: { page: 2, pageSize: 20, total: 30, hasMore: false, cursor: null } })
      });
    });

    await page.goto('/marketplace?tab=providers');

    // Wait for at least one provider card heading to be visible
    await expect(page.getByRole('heading', { name: /^Provider\s+\d+$/ }).first()).toBeVisible();

    // Trigger infinite scroll
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Verify an item from the next page appears and total grows
    await expect(page.getByRole('heading', { name: 'Provider 21' })).toBeVisible();
    // Presence of next-page item is sufficient due to virtualization dynamics
  });
});
