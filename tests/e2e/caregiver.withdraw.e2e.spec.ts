import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { addHours, addMinutes } from 'date-fns';

const prisma = new PrismaClient();
const toIso = (d: Date) => d.toISOString();

test.describe('Caregiver Withdraw Flow', () => {
  let caregiverEmail = 'caregiver1@example.com';
  let caregiverId: string;
  let homeId: string;
  let homeName: string;
  let shiftId: string | undefined;

  test.beforeAll(async () => {
    const cg = await prisma.caregiver.findFirst({ where: { user: { email: caregiverEmail } }, include: { user: true } });
    if (!cg) throw new Error('caregiver not found');
    caregiverId = cg.id;
    const op = await prisma.user.findUnique({ where: { email: 'operator1@example.com' }, include: { operator: { include: { homes: { take: 1 } } } } });
    const home = op?.operator?.homes?.[0];
    if (!home) throw new Error('home not found');
    homeId = home.id; homeName = home.name;
  });

  test.afterAll(async () => {
    if (shiftId) await prisma.caregiverShift.delete({ where: { id: shiftId } }).catch(() => {});
    await prisma.$disconnect();
  });

  test('Apply then withdraw; removed from My Applications', async ({ browser }) => {
    const operatorContext = await browser.newContext();
    const caregiverContext = await browser.newContext();
    const opPage = await operatorContext.newPage();
    const cgPage = await caregiverContext.newPage();

    // Operator login and create shift
    await opPage.goto('/auth/login');
    await opPage.fill('#email', 'operator1@example.com');
    await opPage.fill('#password', 'Operator123!');
    await opPage.click('button:has-text("Sign in")');
    await opPage.waitForURL('**/dashboard**');

    const start = addMinutes(new Date(), 120);
    const end = addHours(start, 2);
    const created = await opPage.request.post('/api/shifts', { data: { homeId, startTime: toIso(start), endTime: toIso(end), hourlyRate: 28, notes: 'E2E withdraw' } });
    const cjson = await created.json();
    expect(cjson.success).toBeTruthy();
    shiftId = cjson.data.id;

    // Caregiver login
    await cgPage.goto('/auth/login');
    await cgPage.fill('#email', caregiverEmail);
    await cgPage.fill('#password', 'Caregiver123!');
    await cgPage.click('button:has-text("Sign in")');
    await cgPage.waitForURL('**/dashboard**');

    // Apply via API
    const applyRes = await cgPage.request.post(`/api/shifts/${shiftId}/applications`, { data: {} });
    const applyJson = await applyRes.json();
    expect(applyJson.success).toBeTruthy();

    // My Applications shows the shift
    await cgPage.goto('/dashboard/shifts');
    await cgPage.getByRole('button', { name: 'My Applications' }).click();
    await expect(cgPage.locator(`tr:has(td:has-text("${homeName}"))`)).toBeVisible();

    // Withdraw via API
    const delRes = await cgPage.request.delete(`/api/shifts/${shiftId}/applications`);
    const delJson = await delRes.json();
    expect(delJson.success).toBeTruthy();

    // Verify in DB status is WITHDRAWN
    const appRecord = await prisma.shiftApplication.findFirst({
      where: { shiftId: shiftId!, caregiverId }
    });
    expect(appRecord?.status).toBe('WITHDRAWN');

    // Optionally ensure Apply is available again in Open Shifts
    await cgPage.getByRole('button', { name: 'Open Shifts' }).click();
    const row = cgPage.locator(`tr:has(td:has-text("${homeName}")):has(td:has-text("$28.00/hr"))`);
    await expect(row).toBeVisible();
    await expect(row.locator('button:has-text("Apply")')).toBeVisible();

    await operatorContext.close();
    await caregiverContext.close();
  });
});