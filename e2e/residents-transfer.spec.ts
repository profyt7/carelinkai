import { test, expect } from '@playwright/test';

// Assumptions:
// - Dev endpoints are enabled in CI via npm run dev server with ALLOW_DEV_ENDPOINTS=1
// - Operator can transfer residents only within their homes (API enforces)
// - Residents list shows actions; home name is not displayed, so we verify via API

test('operator can transfer an ACTIVE resident between homes', async ({ page, request }) => {
  // 1) Ensure operator with two homes exists
  const up = await request.post('/api/dev/upsert-operator', {
    data: {
      email: 'op-transfer@example.com',
      companyName: 'Transfer Ops',
      homes: [
        { name: 'Transfer Home A', capacity: 10 },
        { name: 'Transfer Home B', capacity: 10 },
      ],
    },
  });
  expect(up.ok()).toBeTruthy();
  const upJson = await up.json();
  const [homeA, homeB] = upJson.homes as Array<{ id: string; name: string }>;

  // 2) Log in as operator
  const login = await request.post('/api/dev/login', { data: { email: 'op-transfer@example.com' } });
  expect(login.ok()).toBeTruthy();
  const cookies = (await login.json()).cookies as Array<{ name: string; value: string; domain?: string; path?: string }>;
  for (const c of cookies) await page.context().addCookies([{ name: c.name, value: c.value, domain: 'localhost', path: c.path ?? '/' }]);

  // 3) Create family and resident directly via API, admitted to Home A
  // Create family for current user
  const famRes = await request.get('/api/user/family');
  expect(famRes.ok()).toBeTruthy();
  const family = await famRes.json();
  const create = await request.post('/api/residents', {
    data: {
      familyId: family.id,
      firstName: 'Trans',
      lastName: 'Fer',
      dateOfBirth: '1950-01-01',
      gender: 'FEMALE',
      status: 'ACTIVE',
      homeId: homeA.id,
    },
  });
  expect(create.ok()).toBeTruthy();
  const { id: residentId } = await create.json();

  // 4) Navigate to operator residents page
  await page.goto('/operator/residents');
  await expect(page.getByRole('heading', { name: 'Residents' })).toBeVisible();

  // 5) Find the row and open Transfer popover, select Home B, click Go
  const row = page.getByRole('row').filter({ hasText: 'Trans Fer' }).first();
  await row.getByRole('button', { name: 'Transfer' }).click();
  await row.locator('select').selectOption(homeB.id);
  await row.getByRole('button', { name: 'Go' }).click();

  // 6) Verify via API the resident homeId is now Home B
  const getRes = await request.get(`/api/residents/${residentId}`);
  expect(getRes.ok()).toBeTruthy();
  const resJson = await getRes.json();
  const newHomeId = resJson?.resident?.homeId ?? resJson?.homeId;
  expect(newHomeId).toBe(homeB.id);
});
