import { test, expect } from '@playwright/test';

test('edit assessment and incident inline', async ({ page, request }) => {
  await page.goto('/');

  // Seed operator and login
  await request.post('/api/dev/upsert-operator', { data: { email: 'op-ai2@example.com', companyName: 'AI Ops 2', homes: [{ name: 'AI Home 2', capacity: 4 }] } });
  await page.evaluate(async () => {
    await fetch(`${location.origin}/api/dev/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'op-ai2@example.com' }) });
  });

  // Resolve operator home id for RBAC-conformant access
  const homeId = await page.evaluate(async () => {
    const r = await fetch(`${location.origin}/api/operator/homes`, { credentials: 'include' });
    if (!r.ok) return null;
    const j = await r.json();
    return (j.homes && j.homes.length > 0) ? (j.homes[0].id as string) : null;
  });

  // Create family + resident
  const family = await page.evaluate(async () => {
    const r = await fetch(`${location.origin}/api/user/family`, { credentials: 'include' });
    return r.json();
  });
  const residentId = await page.evaluate(async (args) => {
    const r = await fetch(`${location.origin}/api/residents`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ familyId: args.familyId, firstName: 'Edit', lastName: 'Flow', dateOfBirth: '1940-02-02', gender: 'OTHER', status: 'ACTIVE' }) });
    const j = await r.json();
    return j.id as string;
  }, { familyId: (family.familyId as string), homeId });

  await page.goto(`/operator/residents/${residentId}`);

  // Add assessment
  await page.getByPlaceholder('Type').first().fill('BPRS');
  await page.getByPlaceholder('Score').fill('18');
  await page.getByRole('button', { name: 'Add Assessment' }).click();
  await expect(page.getByText(/BPRS \(score: 18\)/).first()).toBeVisible({ timeout: 10000 });

  // Edit assessment
  const row = page.getByText(/BPRS \(score: 18\)/).locator('..');
  await row.getByRole('button', { name: 'Edit' }).click();
  await row.getByPlaceholder('Type').fill('BPRS-Updated');
  await row.getByPlaceholder('Score').fill('20');
  await row.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText(/BPRS-Updated \(score: 20\)/).first()).toBeVisible({ timeout: 10000 });

  // Add incident
  await page.getByPlaceholder('Type').nth(1).fill('Medication');
  await page.locator('select').filter({ hasText: /Low|Medium|High/i }).first().selectOption('LOW');
  await page.getByRole('button', { name: 'Add Incident' }).click();
  await expect(page.getByText(/Medication \(severity: LOW\)/).first()).toBeVisible({ timeout: 10000 });

  // Edit incident
  const irow = page.getByText(/Medication \(severity: LOW\)/).locator('..');
  await irow.getByRole('button', { name: 'Edit' }).click();
  await irow.getByPlaceholder('Type').fill('Medication Error');
  await irow.getByPlaceholder('Severity').fill('HIGH');
  await irow.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText(/Medication Error \(severity: HIGH\)/).first()).toBeVisible({ timeout: 10000 });
});
