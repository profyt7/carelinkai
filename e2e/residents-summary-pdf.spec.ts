import { test, expect } from '@playwright/test';
import { upsertOperator, loginAs, getFirstHomeId, getFamilyId, createResident } from './_helpers';

test('resident summary PDF endpoint returns 200', async ({ page, request }) => {
  await upsertOperator(request, 'op-sum@example.com');
  await loginAs(page, 'op-sum@example.com');
  const homeId = await getFirstHomeId(page);
  const familyId = await getFamilyId(page);
  const residentId = await createResident(page, { familyId, homeId, firstName: 'Pdf', lastName: 'Test' });

  // Hit the server endpoint directly from the browser context to include auth cookie
  const ok = await page.evaluate(async (rid) => {
    const r = await fetch(`${location.origin}/api/residents/${rid}/summary`, { credentials: 'include' });
    const ct = r.headers.get('content-type') || '';
    return r.ok && ct.includes('application/pdf');
  }, residentId);
  expect(ok).toBe(true);
});
