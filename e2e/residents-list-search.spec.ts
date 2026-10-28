import { test, expect } from '@playwright/test';
import { upsertOperator, loginAs, getFirstHomeId, getFamilyId, createResident } from './_helpers';

test('residents list: search by name and open details', async ({ page, request }) => {
  await upsertOperator(request, 'op-list@example.com', { companyName: 'List Ops', homes: [{ name: 'List Home', capacity: 2 }] });
  await loginAs(page, 'op-list@example.com');
  const homeId = await getFirstHomeId(page);
  const familyId = await getFamilyId(page);
  const firstName = 'Listy';
  const lastName = 'McTest';
  const residentId = await createResident(page, { familyId, homeId, firstName, lastName });

  await page.goto(`/operator/residents?q=${firstName}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(`${firstName} ${lastName}`).first()).toBeVisible();
  await page.getByRole('link', { name: 'Details' }).first().click();
  await expect(page).toHaveURL(new RegExp(`/operator/residents/${residentId}`));
});
