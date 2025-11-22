import { test, expect } from '@playwright/test';

test('resident lifecycle: discharge -> admit -> edit', async ({ page, request }) => {
  await page.goto('/');

  // Seed operator and login (browser-context for cookies)
  await request.post('/api/dev/upsert-operator', { data: { email: 'op-life@example.com', companyName: 'Ops Life', homes: [{ name: 'Life Home', capacity: 4 }] } });
  await page.evaluate(async () => {
    await fetch(`${location.origin}/api/dev/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'op-life@example.com' }) });
  });

  // Resolve operator home id
  const homeId = await page.evaluate(async () => {
    const r = await fetch(`${location.origin}/api/operator/homes`, { credentials: 'include' });
    const j = await r.json();
    return (j.homes?.[0]?.id as string) || null;
  });

  // Create resident (ACTIVE)
  const family = await page.evaluate(async () => (await fetch(`${location.origin}/api/user/family`, { credentials: 'include' })).json());
  const residentId = await page.evaluate(async (args) => {
    const r = await fetch(`${location.origin}/api/residents`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ familyId: args.familyId, homeId: args.homeId, firstName: 'Lifecycle', lastName: 'Test', dateOfBirth: '1945-03-03', gender: 'OTHER', status: 'ACTIVE' })
    });
    const j = await r.json();
    return j.id as string;
  }, { familyId: (family.familyId as string), homeId });

  // Open detail
  await page.goto(`/operator/residents/${residentId}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Status: ACTIVE')).toBeVisible({ timeout: 10000 });

  // Discharge
  await page.getByRole('button', { name: 'Discharge' }).click();
  await expect(page.getByText('Status: DISCHARGED')).toBeVisible({ timeout: 15000 });

  // Admit
  await page.getByRole('button', { name: 'Admit' }).click();
  await expect(page.getByText('Status: ACTIVE')).toBeVisible({ timeout: 15000 });

  // Edit basic info
  await page.getByRole('link', { name: 'Edit' }).click();
  const firstName = page.getByPlaceholder('First name');
  await firstName.waitFor({ state: 'visible', timeout: 10000 });
  await firstName.fill('Lifecycle-Updated');
  await page.getByRole('button', { name: 'Save Changes' }).click();
  // After save, page navigates back to detail
  await expect(page.getByRole('heading', { name: /Lifecycle-Updated/ })).toBeVisible({ timeout: 15000 });
});
