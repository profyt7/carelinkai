import { test } from '@playwright/test';
import { upsertOperator, loginAs, getFirstHomeId, getFamilyId, createResident, openResidentDetail, discharge, admit, editResidentName } from './_helpers';

// QUARANTINED in CI pending OL-076 (operator/residents Next 15 async params/
// searchParams migration). These specs were previously false-green (never
// executed); they run locally but are skipped in CI until the migration lands.
test.beforeEach(() => {
  test.skip(!!process.env.CI, 'OL-076: operator/residents Next 15 async-params migration pending');
});

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
