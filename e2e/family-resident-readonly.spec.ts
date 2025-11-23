import { test, expect } from '@playwright/test';
import { upsertFamily, seedFamilyResident, loginAs } from './_helpers';

// Assumptions:
// - Built server started via `npm run start:e2e` with ALLOW_DEV_ENDPOINTS=1
// - NEXTAUTH_SECRET is set to 'devsecret' (package.json start:e2e uses it)

test.describe('Family Portal - Resident Read-only Views', () => {
  test('shows contacts and compliance summary for family member', async ({ page, request }) => {
    // 1) Upsert a family account
    const famEmail = `family.e2e+${Date.now()}@carelinkai.com`;
    await page.goto('/');
    const upsertRes = await upsertFamily(page.request, famEmail);
    expect(upsertRes.success).toBeTruthy();
    const familyId = upsertRes.familyId as string;

    // 2) Seed a resident for this family with contacts and compliance
    const seedRes = await seedFamilyResident(page.request, { familyId });
    expect(seedRes.success).toBeTruthy();
    const residentId = seedRes.residentId as string;

    // 3) Login as this family user via dev helper
    await loginAs(page, famEmail);

    // 4) Navigate to family resident page
    await page.goto(`/family/residents/${residentId}`);

    // 5) Validate Contacts table
    await expect(page.getByRole('heading', { name: 'Contacts' })).toBeVisible();
    const contactsSection = page.getByRole('heading', { name: 'Contacts' }).locator('..');
    await expect(contactsSection.getByText('PRIMARY', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Primary Contact' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Backup Contact' })).toBeVisible();

    // 6) Validate Compliance Summary counts per dev seeding defaults
    await expect(page.getByRole('heading', { name: 'Compliance Summary' })).toBeVisible();
    // Open: 2 (TB Test + Care Plan)
    await expect(page.getByText('Open').locator('..').getByText(/^2$/)).toBeVisible();
    // Completed: 1 (Flu Shot)
    await expect(page.getByText('Completed').locator('..').getByText(/^1$/)).toBeVisible();
    // Due Soon (14d): 1 (TB Test)
    await expect(page.getByText('Due Soon (14d)').locator('..').getByText(/^1$/)).toBeVisible();
    // Overdue: 1 (Care Plan Review)
    await expect(page.getByText('Overdue').locator('..').getByText(/^1$/)).toBeVisible();
  });
});
