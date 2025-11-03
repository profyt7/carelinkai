import { test, expect } from '@playwright/test';

// [non-bypass] run locally only
test.describe('[non-bypass] Operator Residents: Contacts CRUD', () => {
  test.skip(!!process.env.CI, 'Run locally only');

  const OP_EMAIL = process.env.OP_EMAIL || 'operator+e2e@carelinkai.com';
  const OP_PASSWORD = process.env.OP_PASSWORD || 'Operator123!';

  test('add, save, and reload contacts', async ({ page }) => {
    await page.goto('/');
    const homeId: string = await page.evaluate(async (args) => {
      const r = await fetch('/api/dev/upsert-operator', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: args.email, password: args.password, companyName: 'E2E Operator Inc.' }) });
      if (!r.ok) throw new Error('seed failed');
      const j = await r.json();
      return j.homeId as string;
    }, { email: OP_EMAIL, password: OP_PASSWORD });

    const devLoginOk = await page.evaluate(async (email) => {
      try {
        const r = await fetch('/api/dev/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
        return r.ok;
      } catch { return false; }
    }, OP_EMAIL);
    expect(devLoginOk).toBeTruthy();

    const familyId: string = await page.evaluate(async () => {
      const r = await fetch('/api/user/family', { credentials: 'include' });
      if (!r.ok) throw new Error('family failed');
      const j = await r.json();
      return j.familyId as string;
    });

    const residentId: string = await page.evaluate(async (args) => {
      const r = await fetch('/api/residents', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ familyId: args.familyId, homeId: args.homeId, firstName: 'E2E', lastName: 'Contact', dateOfBirth: '1942-02-02', gender: 'MALE', status: 'ACTIVE' })
      });
      if (!r.ok) throw new Error('resident create failed');
      const j = await r.json();
      return j.id as string;
    }, { familyId, homeId });

    await page.goto(`/operator/residents/${residentId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Compliance/i })).toBeVisible();

    // Contacts panel
    await expect(page.getByRole('heading', { name: 'Contacts', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Add contact' }).click();

    await page.getByLabel('Name').first().fill('Jane Doe');
    await page.getByLabel('Relationship').first().fill('Daughter');
    await page.getByLabel('Email').first().fill('jane.doe@example.com');
    await page.getByLabel('Phone').first().fill('555-0001');
    await page.getByLabel('Primary').first().check();

    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Contacts saved').first()).toBeVisible({ timeout: 10000 });

    // Reload and verify persistence
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Contacts', exact: true })).toBeVisible();
    const count = await page.evaluate(async (id) => {
      const r = await fetch(`/api/residents/${id}/contacts`, { credentials: 'include' });
      if (!r.ok) return 0;
      const j = await r.json();
      return (j.items || []).length as number;
    }, residentId);
    expect(count).toBeGreaterThan(0);
    const nameInput = page.locator('input[aria-label="Name"][value="Jane Doe"]').first();
    await expect(nameInput).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[aria-label="Email"]').first()).toHaveValue('jane.doe@example.com');
  });
});
