import { test, expect } from '@playwright/test';

test.describe('Family caregiver shortlist', () => {
  test('toggle shortlist on marketplace and filter by shortlist only', async ({ page }) => {
    // Mock family session
    await page.route('**/api/auth/session', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'fam-1', role: 'FAMILY', name: 'Family User' },
          expires: new Date(Date.now() + 3600_000).toISOString(),
        }),
      })
    );

    // Categories for filters
    await page.route('**/api/marketplace/categories', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: {} }) })
    );

    const caregivers = [
      {
        id: 'cg-1',
        userId: 'u1',
        name: 'Alice Johnson',
        city: 'Austin',
        state: 'TX',
        hourlyRate: 25,
        yearsExperience: 5,
        specialties: ['alzheimers-care', 'mobility-assistance'],
        bio: 'Experienced caregiver',
        backgroundCheckStatus: 'CLEAR',
        photoUrl: null,
        ratingAverage: 4.8,
        reviewCount: 12,
        badges: ['Top Rated'],
      },
      {
        id: 'cg-2',
        userId: 'u2',
        name: 'Bob Smith',
        city: 'Dallas',
        state: 'TX',
        hourlyRate: 22,
        yearsExperience: 3,
        specialties: ['diabetes-care'],
        bio: 'Friendly and reliable',
        backgroundCheckStatus: 'CLEAR',
        photoUrl: null,
        ratingAverage: 4.5,
        reviewCount: 8,
        badges: [],
      },
    ];

    // Initial family favorites: none
    await page.route('**/api/marketplace/caregiver-favorites', (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
      }
      if (route.request().method() === 'POST') {
        return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ data: { id: 'fav-1', caregiverId: 'cg-1' } }) });
      }
      if (route.request().method() === 'DELETE') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
      }
      return route.continue();
    });

    // Caregivers fetch
    await page.route('**/api/marketplace/caregivers?**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: caregivers, pagination: { total: caregivers.length } }),
      })
    );

    await page.goto('/marketplace?tab=caregivers');
    await expect(page.getByRole('button', { name: /Caregivers \(2\)/i })).toBeVisible();

    // Cards are rendered via Virtuoso; assert by caregiver names
    await expect(page.getByRole('heading', { name: 'Alice Johnson' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Bob Smith' })).toBeVisible();

    // Toggle shortlist for first caregiver
    const aliceCard = page.locator('div.relative').filter({ has: page.getByRole('heading', { name: 'Alice Johnson' }) }).first();
    await aliceCard.getByRole('button', { name: /Add to shortlist/i }).click();
    await expect(aliceCard.getByRole('button', { name: /Remove from shortlist/i })).toBeVisible();

    // Enable Shortlist only filter (desktop sidebar has md:w-72)
    const shortlistOnly = page.locator('div.md\\:w-72').getByLabel('Shortlist only').first();
    await shortlistOnly.check({ force: true });

    // Should only show Alice now
    await expect(page.getByRole('heading', { name: 'Alice Johnson' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Bob Smith' })).toHaveCount(0);

    // Remove from shortlist and expect empty state
    await aliceCard.getByRole('button', { name: /Remove from shortlist/i }).click();
    await expect(page.getByText('No caregivers found')).toBeVisible();
  });

  test('dedicated shortlist page lists and removes caregivers', async ({ page }) => {
    // Mock family session
    await page.route('**/api/auth/session', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: { id: 'fam-1', role: 'FAMILY', name: 'Family User' }, expires: new Date(Date.now() + 3600_000).toISOString() })
      })
    );

    // Favorites (ids)
    await page.route('**/api/marketplace/caregiver-favorites', (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: ['cg-1', 'cg-2'] }) });
      }
      if (route.request().method() === 'DELETE') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
      }
      return route.continue();
    });

    // Caregivers by ids
    const favCaregivers = [
      { id: 'cg-1', name: 'Alice Johnson', city: 'Austin', state: 'TX', hourlyRate: 25, yearsExperience: 5, specialties: [], bio: null, photoUrl: null, backgroundCheckStatus: 'CLEAR', ratingAverage: 4.8, reviewCount: 12, badges: [] },
      { id: 'cg-2', name: 'Bob Smith', city: 'Dallas', state: 'TX', hourlyRate: 22, yearsExperience: 3, specialties: [], bio: null, photoUrl: null, backgroundCheckStatus: 'CLEAR', ratingAverage: 4.5, reviewCount: 8, badges: [] },
    ];
    await page.route('**/api/marketplace/caregivers?ids=*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: favCaregivers, pagination: { total: favCaregivers.length } }) })
    );

    await page.goto('/marketplace/caregivers/favorites');

    await expect(page.getByRole('heading', { name: 'My Caregiver Shortlist' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Alice Johnson' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Bob Smith' })).toBeVisible();

    // Remove Alice from shortlist
    const aliceRow = page.locator('div.relative').filter({ has: page.getByRole('heading', { name: 'Alice Johnson' }) }).first();
    await aliceRow.getByRole('button', { name: /Remove from shortlist/i }).click();

    // After removal, Alice should disappear (optimistic update)
    await expect(page.getByRole('heading', { name: 'Alice Johnson' })).toHaveCount(0);
  });
});
