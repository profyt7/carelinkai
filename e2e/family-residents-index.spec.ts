import { test, expect } from '@playwright/test';

test.describe('Family Portal - Residents Index', () => {
  test('lists residents and navigates to detail', async ({ page }) => {
    await page.goto('/');
    const famEmail = `family.index+${Date.now()}@carelinkai.com`;
    // Upsert family
    const up = await page.evaluate(async (email) => {
      const r = await fetch('/api/dev/upsert-family', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) });
      return r.json();
    }, famEmail);
    expect(up?.success).toBeTruthy();

    // Seed two residents
    const r1 = await page.evaluate(async (familyId) => {
      const r = await fetch('/api/dev/seed-family-resident', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ familyId, firstName: 'Alpha', lastName: 'Resident' }) });
      return r.json();
    }, up.familyId);
    const r2 = await page.evaluate(async (familyId) => {
      const r = await fetch('/api/dev/seed-family-resident', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ familyId, firstName: 'Beta', lastName: 'Resident' }) });
      return r.json();
    }, up.familyId);
    expect(r1?.success && r2?.success).toBeTruthy();

    // Login as family
    const login = await page.evaluate(async (email) => {
      const r = await fetch('/api/dev/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) });
      return r.ok;
    }, famEmail);
    expect(login).toBeTruthy();

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
