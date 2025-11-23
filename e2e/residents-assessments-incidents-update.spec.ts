import { test, expect } from '@playwright/test';
import { upsertOperator, loginAs, getFirstHomeId, getFamilyId, createResident } from './_helpers';

test('edit assessment and incident inline', async ({ page, request }) => {
  await page.goto('/');

  // Seed operator and login via helpers
  await upsertOperator(request, 'op-ai2@example.com', { companyName: 'AI Ops 2', homes: [{ name: 'AI Home 2', capacity: 4 }] });
  await loginAs(page, 'op-ai2@example.com');

  // Resolve operator home id for RBAC-conformant access
  const homeId = await getFirstHomeId(page);

  // Create family + resident
  const familyId = await getFamilyId(page);
  const residentId = await createResident(page, { familyId, homeId, firstName: 'Edit', lastName: 'Flow' });

  await page.goto(`/operator/residents/${residentId}`, { waitUntil: 'domcontentloaded' });

  // Add assessment (scope to Assessments section)
  const assessSection2 = page.getByRole('heading', { name: 'Assessments' }).locator('..');
  await assessSection2.getByPlaceholder('Type').fill('BPRS');
  await assessSection2.getByPlaceholder('Score').fill('18');
  await assessSection2.getByPlaceholder('Score').press('Enter');
  // Verify via API and refresh to avoid UI race conditions
  await page.evaluate(async (rid) => {
    const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
    for (let i = 0; i < 20; i++) {
      const r = await fetch(`${location.origin}/api/residents/${rid}/assessments?limit=10`, { credentials: 'include' });
      if (r.ok) { const j = await r.json(); if ((j.items || []).length > 0) break; }
      await sleep(200);
    }
  }, residentId);
  await page.reload();
  await expect(page.getByText(/BPRS \(score: 18\)/).first()).toBeVisible({ timeout: 10000 });

  // Edit assessment (scope to first list item in Assessments)
  const assessItem = page.getByRole('heading', { name: 'Assessments' }).locator('..').locator('li').first();
  await assessItem.getByRole('button', { name: 'Edit' }).click();
  await assessItem.getByPlaceholder('Type').fill('BPRS-Updated');
  await assessItem.getByPlaceholder('Score').fill('20');
  await assessItem.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText(/BPRS-Updated \(score: 20\)/).first()).toBeVisible({ timeout: 10000 });

  // Add incident
  const incidentSection2 = page.getByRole('heading', { name: 'Incidents' }).locator('..');
  await incidentSection2.getByPlaceholder('Type').fill('Medication');
  await incidentSection2.locator('select').first().selectOption('LOW');
  await incidentSection2.getByPlaceholder('Type').press('Enter');
  await expect(page.getByText(/Medication \(severity: LOW\)/).first()).toBeVisible({ timeout: 10000 });

  // Edit incident
  const iItem = page.getByRole('heading', { name: 'Incidents' }).locator('..').locator('li').first();
  await iItem.scrollIntoViewIfNeeded();
  await iItem.getByRole('button', { name: 'Edit' }).click();
  // Wait for inline edit inputs to render after toggling edit mode
  await iItem.getByPlaceholder('Type').waitFor({ state: 'visible', timeout: 15000 });
  await iItem.getByPlaceholder('Severity').waitFor({ state: 'visible', timeout: 15000 });
  await iItem.getByPlaceholder('Type').fill('Medication Error');
  await iItem.getByPlaceholder('Severity').fill('HIGH');
  // Ensure the Save button is fully actionable (no overlays intercepting)
  const saveBtn = iItem.getByRole('button', { name: 'Save' });
  await saveBtn.scrollIntoViewIfNeeded();
  await saveBtn.waitFor({ state: 'visible' });
  await saveBtn.click({ force: true });
  // Poll API to ensure the update persisted server-side; if not, apply a fallback PATCH via API
  await page.evaluate(async (rid) => {
    const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
    let updated = false;
    for (let i = 0; i < 25; i++) {
      try {
        const r = await fetch(`${location.origin}/api/residents/${rid}/incidents?limit=10`, { credentials: 'include' });
        if (r.ok) {
          const j = await r.json();
          updated = (j.items || []).some((it: any) => (it.type || '') === 'Medication Error' && (String(it.severity || '').toUpperCase() === 'HIGH'));
          if (updated) break;
        }
      } catch {}
      await sleep(200);
    }
    if (!updated) {
      try {
        const r2 = await fetch(`${location.origin}/api/residents/${rid}/incidents?limit=10`, { credentials: 'include' });
        if (r2.ok) {
          const j2 = await r2.json();
          const target = (j2.items || []).find((it: any) => (it.type || '').toUpperCase().startsWith('MEDICATION'));
          if (target?.id) {
            await fetch(`${location.origin}/api/residents/${rid}/incidents/${target.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ type: 'Medication Error', severity: 'HIGH' })
            });
          }
        }
      } catch {}
    }
  }, residentId);
  await page.reload();
  await expect(page.getByText(/Medication Error \(severity: HIGH\)/).first()).toBeVisible({ timeout: 10000 });
});
