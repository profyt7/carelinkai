import { test, expect } from '@playwright/test';

// Assumptions:
// - Dev endpoints enabled; using browser-based login for cookies

test('assessments + incidents CRUD and profile edit', async ({ page, request }) => {
  await page.goto('/');

  // Seed operator
  const up = await request.post('/api/dev/upsert-operator', {
    data: { email: 'op-ai@example.com', companyName: 'AI Ops', homes: [{ name: 'AI Home', capacity: 6 }] },
  });
  expect(up.ok()).toBeTruthy();

  // Login
  const loggedIn = await page.evaluate(async () => {
    const r = await fetch(`${location.origin}/api/dev/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'op-ai@example.com' })
    });
    return r.ok;
  });
  expect(loggedIn).toBeTruthy();

  // Create family + resident
  const family = await page.evaluate(async () => {
    const r = await fetch(`${location.origin}/api/user/family`, { credentials: 'include' });
    if (!r.ok) throw new Error('family failed');
    return r.json();
  });
  const residentId = await page.evaluate(async (args) => {
    const r = await fetch(`${location.origin}/api/residents`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ familyId: args.familyId, firstName: 'Assess', lastName: ' Inc', dateOfBirth: '1944-04-04', gender: 'OTHER', status: 'ACTIVE' })
    });
    if (!r.ok) throw new Error('resident create failed');
    const j = await r.json();
    return j.id as string;
  }, { familyId: (family.familyId as string) });

  await page.goto(`/operator/residents/${residentId}`);
  await expect(page.getByRole('heading', { name: 'Assessments' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Incidents' })).toBeVisible();

  // Add assessment
  await page.getByPlaceholder('Type').first().fill('MMSE');
  await page.getByPlaceholder('Score').fill('25');
  await page.getByRole('button', { name: 'Add Assessment' }).click();
  await expect(page.getByText(/MMSE \(score: 25\)/).first()).toBeVisible({ timeout: 10000 });

  // Delete assessment
  page.once('dialog', (d) => d.accept());
  await page.getByText(/MMSE \(score: 25\)/).locator('..').getByRole('button', { name: 'Delete' }).click();
  // Confirm deletion via API
  const assessCount = await page.evaluate(async (rid) => {
    const r = await fetch(`${location.origin}/api/residents/${rid}/assessments?limit=10`, { credentials: 'include' });
    if (!r.ok) return 0; const j = await r.json(); return (j.items || []).length as number;
  }, residentId);
  expect(assessCount).toBe(0);

  // Add incident
  await page.getByPlaceholder('Type').nth(1).fill('Fall');
  await page.locator('select').filter({ hasText: /Low|Medium|High/i }).first().selectOption('HIGH');
  await page.getByRole('button', { name: 'Add Incident' }).click();
  await expect(page.getByText(/Fall \(severity: HIGH\)/).first()).toBeVisible({ timeout: 10000 });

  // Delete incident
  page.once('dialog', (d) => d.accept());
  await page.getByText(/Fall \(severity: HIGH\)/).locator('..').getByRole('button', { name: 'Delete' }).click();
  const incCount = await page.evaluate(async (rid) => {
    const r = await fetch(`${location.origin}/api/residents/${rid}/incidents?limit=10`, { credentials: 'include' });
    if (!r.ok) return 0; const j = await r.json(); return (j.items || []).length as number;
  }, residentId);
  expect(incCount).toBe(0);

  // Profile edit
  await page.getByRole('link', { name: 'Edit' }).click();
  await expect(page.getByRole('heading', { name: 'Edit Resident' })).toBeVisible();
  const lastNameInput = page.getByPlaceholder('Last name');
  await lastNameInput.fill(' Edited');
  await page.getByRole('button', { name: 'Save Changes' }).click();

  // Back on detail page; verify name reflects edit
  await expect(page.getByRole('heading', { name: /Assess Edited/i })).toBeVisible();
});
