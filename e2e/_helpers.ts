import { Page, APIRequestContext, expect } from '@playwright/test';

type HomeSeed = { name: string; capacity: number };

export async function upsertOperator(
  request: APIRequestContext,
  email: string,
  opts?: { companyName?: string; homes?: HomeSeed[] }
) {
  const companyName = opts?.companyName ?? 'Ops';
  const homes = opts?.homes ?? [{ name: 'Home A', capacity: 4 }];
  await request.post('/api/dev/upsert-operator', { data: { email, companyName, homes } });
}

export async function loginAs(page: Page, email: string) {
  await page.goto('/');
  await page.evaluate(async (e) => {
    await fetch(`${location.origin}/api/dev/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: e }),
    });
  }, email);
}

export async function getOperatorHomes(page: Page) {
  return await page.evaluate(async () => {
    const r = await fetch(`${location.origin}/api/operator/homes`, { credentials: 'include' });
    if (!r.ok) return [] as Array<{ id: string; name: string }>;
    const j = await r.json();
    return (j.homes || []) as Array<{ id: string; name: string }>;
  });
}

export async function getFirstHomeId(page: Page) {
  return await page.evaluate(async () => {
    const r = await fetch(`${location.origin}/api/operator/homes`, { credentials: 'include' });
    const j = await r.json();
    return (j.homes?.[0]?.id as string) || null;
  });
}

export async function getFamilyId(page: Page) {
  const fam = await page.evaluate(async () => (await fetch(`${location.origin}/api/user/family`, { credentials: 'include' })).json());
  return fam.familyId as string;
}

export async function createResident(page: Page, args: { familyId: string; homeId: string | null; firstName?: string; lastName?: string }) {
  const id = await page.evaluate(async (a) => {
    const r = await fetch(`${location.origin}/api/residents`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ familyId: a.familyId, homeId: a.homeId, firstName: a.firstName || 'E2E', lastName: a.lastName || 'Resident', dateOfBirth: '1940-01-01', gender: 'OTHER', status: 'ACTIVE' }),
    });
    const j = await r.json();
    return j.id as string;
  }, args);
  return id;
}

export async function openResidentDetail(page: Page, residentId: string) {
  await page.goto(`/operator/residents/${residentId}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Status:')).toBeVisible({ timeout: 10000 });
}

export async function discharge(page: Page) {
  await page.getByRole('button', { name: 'Discharge' }).click();
  await expect(page.getByText('Status: DISCHARGED')).toBeVisible({ timeout: 15000 });
}

export async function admit(page: Page) {
  await page.getByRole('button', { name: 'Admit' }).click();
  await expect(page.getByText('Status: ACTIVE')).toBeVisible({ timeout: 15000 });
}

export async function editResidentName(page: Page, newFirst: string) {
  await page.getByRole('link', { name: 'Edit' }).click();
  const first = page.getByPlaceholder('First name');
  await first.waitFor({ state: 'visible', timeout: 10000 });
  await first.fill(newFirst);
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(page.getByRole('heading', { name: new RegExp(newFirst) })).toBeVisible({ timeout: 15000 });
}
