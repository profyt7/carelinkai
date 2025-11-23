import { test, expect } from '@playwright/test';
import { upsertFamily, seedFamilyResident, loginAs } from './_helpers';

test.describe('Family Portal - Residents Index', () => {
  test('lists residents and navigates to detail', async ({ page }) => {
    await page.goto('/');
    const famEmail = `family.index+${Date.now()}@carelinkai.com`;
    // Upsert family
    const up = await upsertFamily(page.request, famEmail);
    expect(up.success).toBeTruthy();

    // Seed two residents
    const r1 = await seedFamilyResident(page.request, { familyId: up.familyId, firstName: 'Alpha', lastName: 'Resident' });
    const r2 = await seedFamilyResident(page.request, { familyId: up.familyId, firstName: 'Beta', lastName: 'Resident' });
    expect(r1.success && r2.success).toBeTruthy();

    // Login as family
    await loginAs(page, famEmail);

    // Navigate to residents index and assert rows
    await page.goto('/family/residents');
    await expect(page.getByRole('heading', { name: 'Residents' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Alpha Resident' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Beta Resident' })).toBeVisible();

    // Navigate to detail
    await page.getByRole('link', { name: 'View' }).first().click();
    await expect(page).toHaveURL(/\/family\/residents\//);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Resident/);
  });
});
