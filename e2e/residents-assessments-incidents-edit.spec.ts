import { test, expect } from '@playwright/test';
import { upsertOperator, loginAs, getFirstHomeId, getFamilyId, createResident } from './_helpers';

// Assumptions:
// - Dev endpoints enabled; using browser-based login for cookies

test('assessments + incidents CRUD and profile edit', async ({ page, request }) => {
  await page.goto('/');

  // Seed operator and login via helpers
  await upsertOperator(request, 'op-ai@example.com', { companyName: 'AI Ops', homes: [{ name: 'AI Home', capacity: 6 }] });
  await loginAs(page, 'op-ai@example.com');

  // Resolve operator home id to scope resident correctly
  const homeId = await getFirstHomeId(page);

  // Create family + resident
  const familyId = await getFamilyId(page);
  const residentId = await createResident(page, { familyId, homeId, firstName: 'Assess', lastName: 'Inc' });

  await page.goto(`/operator/residents/${residentId}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Assessments' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Incidents' })).toBeVisible();

  // Add assessment (scope to Assessments section)
  const assessSection = page.getByRole('heading', { name: 'Assessments' }).locator('..');
  await assessSection.getByPlaceholder('Type').fill('MMSE');
  await assessSection.getByPlaceholder('Score').fill('25');
  await assessSection.getByPlaceholder('Score').press('Enter');
  // Robustness: poll API for assessment before asserting UI; then reload
  await page.evaluate(async (rid) => {
    const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
    for (let i = 0; i < 20; i++) {
      try {
        const r = await fetch(`${location.origin}/api/residents/${rid}/assessments?limit=10`, { credentials: 'include' });
        if (r.ok) {
          const j = await r.json();
          const ok = (j.items || []).some((it: any) => it.type === 'MMSE' && Number(it.score) === 25);
          if (ok) break;
        }
      } catch {}
      await sleep(200);
    }
  }, residentId);
  await page.reload();
  await expect(page.getByText(/MMSE \(score: 25\)/).first()).toBeVisible({ timeout: 10000 });

  // Delete assessment
  page.once('dialog', (d) => d.accept());
  await Promise.all([
    page.waitForResponse((r) => r.url().includes(`/api/residents/${residentId}/assessments/`) && r.request().method() === 'DELETE' && r.status() === 200),
    page.getByText(/MMSE \(score: 25\)/).locator('..').getByRole('button', { name: 'Delete' }).click(),
  ]);
  // Confirm deletion via API with retries
  const assessCount = await page.evaluate(async (rid) => {
    const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
    for (let i = 0; i < 20; i++) {
      try {
        const r = await fetch(`${location.origin}/api/residents/${rid}/assessments?limit=10`, { credentials: 'include' });
        if (r.ok) {
          const j = await r.json();
          if ((j.items || []).length === 0) return 0;
        }
      } catch {}
      await sleep(200);
    }
    return 1;
  }, residentId);
  expect(assessCount).toBe(0);

  // Add incident
  const incidentSection = page.getByRole('heading', { name: 'Incidents' }).locator('..');
  await incidentSection.getByPlaceholder('Type').fill('Fall');
  await incidentSection.locator('select').first().selectOption('HIGH');
  await incidentSection.getByPlaceholder('Type').press('Enter');
  // Robustness: poll API for incident before asserting UI; then reload
  await page.evaluate(async (rid) => {
    const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
    for (let i = 0; i < 20; i++) {
      try {
        const r = await fetch(`${location.origin}/api/residents/${rid}/incidents?limit=10`, { credentials: 'include' });
        if (r.ok) {
          const j = await r.json();
          const ok = (j.items || []).some((it: any) => it.type === 'Fall' && (it.severity || '').toUpperCase() === 'HIGH');
          if (ok) break;
        }
      } catch {}
      await sleep(200);
    }
  }, residentId);
  await page.reload();
  await expect(page.getByText(/Fall \(severity: HIGH\)/).first()).toBeVisible({ timeout: 10000 });

  // Delete incident
  page.once('dialog', (d) => d.accept());
  await Promise.all([
    page.waitForResponse((r) => r.url().includes(`/api/residents/${residentId}/incidents/`) && r.request().method() === 'DELETE' && r.status() === 200),
    page.getByText(/Fall \(severity: HIGH\)/).locator('..').getByRole('button', { name: 'Delete' }).click(),
  ]);
  const incCount = await page.evaluate(async (rid) => {
    const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
    for (let i = 0; i < 20; i++) {
      const r = await fetch(`${location.origin}/api/residents/${rid}/incidents?limit=10`, { credentials: 'include' });
      if (r.ok) { const j = await r.json(); if ((j.items || []).length === 0) return 0; }
      await sleep(200);
    }
    return 1;
  }, residentId);
  expect(incCount).toBe(0);

  // Profile edit
  await page.getByRole('link', { name: 'Edit' }).click();
  await expect(page.getByRole('heading', { name: 'Edit Resident' })).toBeVisible();
  const lastNameInput = page.getByPlaceholder('Last name');
  await lastNameInput.fill('Edited');
  await page.getByRole('button', { name: 'Save Changes' }).click();

  // Back on detail page; verify name reflects edit
  await expect(page.getByRole('heading', { name: /Assess Edited/i })).toBeVisible();
});
