import { test, expect } from '@playwright/test';
import { upsertOperator, loginAs, getFirstHomeId, getFamilyId, createResident } from './_helpers';

test('resident notes: add note shows in list', async ({ page, request }) => {
  await upsertOperator(request, 'op-notes@example.com', { companyName: 'Notes Ops', homes: [{ name: 'Notes Home', capacity: 3 }] });
  await loginAs(page, 'op-notes@example.com');
  const homeId = await getFirstHomeId(page);
  const familyId = await getFamilyId(page);
  const residentId = await createResident(page, { familyId, homeId, firstName: 'Note', lastName: 'Test' });

  await page.goto(`/operator/residents/${residentId}`, { waitUntil: 'domcontentloaded' });
  await page.locator('textarea[placeholder="Add a note"]').fill('E2E note content');
  await page.getByRole('button', { name: 'Add Note' }).click();

  // reload to avoid stale state; then assert note visible
  await page.reload();
  await expect(page.getByText('E2E note content').first()).toBeVisible({ timeout: 10000 });
});
