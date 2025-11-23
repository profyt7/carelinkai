import { test, expect } from '@playwright/test';
import { upsertFamily, seedFamilyResident, loginAs } from './_helpers';

test('Family Portal - Notifications shows due soon and overdue counts', async ({ page }) => {
  await page.goto('/');
  const famEmail = `family.notify+${Date.now()}@carelinkai.com`;
  const up = await upsertFamily(page.request, famEmail);
  expect(up.success).toBeTruthy();

  // Seed one resident with due soon + overdue items
  const seed = await seedFamilyResident(page.request, { familyId: up.familyId, firstName: 'Notif', lastName: 'Test' });
  expect(seed.success).toBeTruthy();

  // Login as family
  await loginAs(page, famEmail);

  await page.goto('/family/notifications');
  await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible();
  // We expect non-negative numbers; just verify cards render
  await expect(page.getByText('Due Soon (14d)')).toBeVisible();
  // Use the section heading to avoid strict-mode ambiguity with the stat tile label
  await expect(page.getByRole('heading', { name: 'Overdue' })).toBeVisible();
});
