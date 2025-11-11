import { test, expect } from '@playwright/test';

test('resident summary PDF endpoint returns a PDF', async ({ page, request }) => {
  await page.goto('/');

  // Seed operator and login via dev endpoints
  await request.post('/api/dev/upsert-operator', { data: { email: 'op-pdf@example.com', companyName: 'Ops PDF', homes: [{ name: 'PDF Home', capacity: 5 }] } });
  await page.evaluate(async () => {
    await fetch(`${location.origin}/api/dev/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'op-pdf@example.com' }) });
  });

  // Resolve operator home id to ensure resident is created within accessible scope
  const homeId = await page.evaluate(async () => {
    const r = await fetch(`${location.origin}/api/operator/homes`, { credentials: 'include' });
    const j = await r.json();
    return (j.homes && j.homes.length > 0) ? j.homes[0].id as string : null;
  });

  // Create family + resident
  const family = await page.evaluate(async () => {
    const r = await fetch(`${location.origin}/api/user/family`, { credentials: 'include' });
    return r.json();
  });
  const residentId = await page.evaluate(async (args) => {
    const r = await fetch(`${location.origin}/api/residents`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ familyId: args.familyId, homeId: args.homeId, firstName: 'PDF', lastName: 'Check', dateOfBirth: '1945-05-05', gender: 'OTHER', status: 'ACTIVE' }) });
    const j = await r.json();
    return j.id as string;
  }, { familyId: (family.familyId as string), homeId });

  // Hit the summary endpoint and ensure it returns a PDF
  const resp = await page.request.get(`/api/residents/${residentId}/summary`);
  expect(resp.ok()).toBeTruthy();
  const ct = resp.headers()['content-type'] || resp.headers()['Content-Type'];
  expect(ct).toContain('application/pdf');
  const buf = await resp.body();
  expect(buf.byteLength).toBeGreaterThan(100); // minimal sanity check
});
