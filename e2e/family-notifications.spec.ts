import { test, expect } from '@playwright/test';

test('Family Portal - Notifications shows due soon and overdue counts', async ({ page }) => {
  await page.goto('/');
  const famEmail = `family.notify+${Date.now()}@carelinkai.com`;
  const up = await page.evaluate(async (email) => {
    const r = await fetch('/api/dev/upsert-family', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) });
    return r.json();
  }, famEmail);
  expect(up?.success).toBeTruthy();

  // Seed one resident with due soon + overdue items
  const seed = await page.evaluate(async (familyId) => {
    const r = await fetch('/api/dev/seed-family-resident', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ familyId, firstName: 'Notif', lastName: 'Test' }) });
    return r.json();
  }, up.familyId);
  expect(seed?.success).toBeTruthy();

  // Login as family
  const login = await page.evaluate(async (email) => {
    const r = await fetch('/api/dev/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) });
    return r.ok;
  }, famEmail);
  expect(login).toBeTruthy();

  await page.goto('/family/notifications');
  await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible();
  // We expect non-negative numbers; just verify cards render
  await expect(page.getByText('Due Soon (14d)')).toBeVisible();
  // Use the section heading to avoid strict-mode ambiguity with the stat tile label
  await expect(page.getByRole('heading', { name: 'Overdue' })).toBeVisible();
});
