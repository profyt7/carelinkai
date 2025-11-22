import { test } from '@playwright/test';
import { upsertOperator, loginAs, getFirstHomeId, getFamilyId, createResident, openResidentDetail, discharge, admit, editResidentName } from './_helpers';

test('resident lifecycle: discharge -> admit -> edit', async ({ page, request }) => {
  const email = 'op-life@example.com';
  await upsertOperator(request, email);
  await loginAs(page, email);
  const homeId = await getFirstHomeId(page);
  const familyId = await getFamilyId(page);
  const residentId = await createResident(page, { familyId, homeId, firstName: 'Lifecycle', lastName: 'Test' });
  await openResidentDetail(page, residentId);
  await discharge(page);
  await admit(page);
  await editResidentName(page, 'Lifecycle-Updated');
});
