import { test, expect } from '@playwright/test';

test.describe('Operator Residents - CSV export', () => {
  test('exports CSV with at least one resident row', async ({ page }) => {
    await page.goto('/');

    const OP_EMAIL = 'operator+csv@carelinkai.com';
    const OP_PASSWORD = 'OperatorCsv123!';

    // 1) Ensure operator + home
    const homeId: string = await page.evaluate(async (args) => {
      const r = await fetch('/api/dev/upsert-operator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: args.email, password: args.password, companyName: 'CSV Co' })
      });
      if (!r.ok) throw new Error('upsert-operator failed');
      const j = await r.json();
      return j.homeId as string;
    }, { email: OP_EMAIL, password: OP_PASSWORD });

    // 2) Dev login as operator
    const devLoginOk = await page.evaluate(async (email) => {
      const r = await fetch('/api/dev/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      return r.ok;
    }, OP_EMAIL);
    expect(devLoginOk).toBeTruthy();

    // 3) Ensure a family for current user (operator) and create a resident assigned to operator home
    const familyId: string = await page.evaluate(async () => {
      const r = await fetch('/api/user/family', { credentials: 'include' });
      if (!r.ok) throw new Error('family failed');
      const j = await r.json();
      return j.familyId as string;
    });

    const firstName = 'Csv';
    const lastName = 'Export';
    const createOk = await page.evaluate(async (args) => {
      const r = await fetch('/api/residents?debug=1', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({
          familyId: args.familyId,
          homeId: args.homeId,
          firstName: args.firstName,
          lastName: args.lastName,
          dateOfBirth: '1940-01-01',
          gender: 'OTHER',
          status: 'ACTIVE'
        })
      });
      return r.ok;
    }, { familyId, homeId, firstName, lastName });
    expect(createOk).toBeTruthy();

    // 4) Request CSV export scoped to the operator home
    const csv = await page.evaluate(async (args) => {
      const r = await fetch(`/api/residents?format=csv&homeId=${encodeURIComponent(args.homeId)}`, { credentials: 'include' });
      if (!r.ok) throw new Error('csv fetch failed');
      const text = await r.text();
      return text;
    }, { homeId });

    // 5) Validate CSV content
    expect(csv.startsWith('id,firstName,lastName,status\n')).toBeTruthy();
    expect(csv).toContain(`,${firstName},${lastName},`);
  });
});
