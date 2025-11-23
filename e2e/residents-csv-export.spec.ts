import { test, expect } from '@playwright/test';
import { upsertOperator, loginAs, getFirstHomeId, getFamilyId, createResident } from './_helpers';

test.describe('Operator Residents - CSV export', () => {
  test('exports CSV with at least one resident row', async ({ page }) => {
    await page.goto('/');

    const OP_EMAIL = 'operator+csv@carelinkai.com';
    // 1) Ensure operator + home
    await upsertOperator(page.request, OP_EMAIL, { companyName: 'CSV Co', homes: [{ name: 'CSV Home', capacity: 5 }] });
    // 2) Dev login as operator
    await loginAs(page, OP_EMAIL);
    const homeId: string | null = await getFirstHomeId(page);

    // 3) Ensure a family for current user (operator) and create a resident assigned to operator home
    const familyId: string = await getFamilyId(page);

    const firstName = 'Csv';
    const lastName = 'Export';
    await createResident(page, { familyId, homeId, firstName, lastName });

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
