import { test, expect } from '@playwright/test';
import { upsertOperator, loginAs, getFirstHomeId, getFamilyId, createResident } from './_helpers';

test('resident summary PDF endpoint returns a PDF', async ({ page, request }) => {
  await page.goto('/');

  // Seed operator and login via helpers
  await upsertOperator(request, 'op-pdf@example.com');
  await loginAs(page, 'op-pdf@example.com');

  // Resolve operator home id
  const homeId = await getFirstHomeId(page);

  // Create family + resident
  const familyId = await getFamilyId(page);
  const residentId = await createResident(page, { familyId, homeId, firstName: 'PDF', lastName: 'Check' });

  // Hit the summary endpoint and ensure it returns a PDF
  const resp = await page.request.get(`/api/residents/${residentId}/summary`);
  expect(resp.ok()).toBeTruthy();
  const ct = resp.headers()['content-type'] || resp.headers()['Content-Type'];
  expect(ct).toContain('application/pdf');
  const buf = await resp.body();
  expect(buf.byteLength).toBeGreaterThan(100); // minimal sanity check
});
