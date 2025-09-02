import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { addHours, addMinutes } from 'date-fns';

const prisma = new PrismaClient();
const toIso = (d: Date) => d.toISOString();

test.describe('Operator Reject Flow', () => {
  let caregiverEmail = 'caregiver1@example.com';
  let caregiverId: string;
  let homeId: string;
  let homeName: string;
  let shiftId: string | undefined;

  test.beforeAll(async () => {
    const cg = await prisma.caregiver.findFirst({ where: { user: { email: caregiverEmail } } });
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

  test('Reject application; status becomes REJECTED and removed from My Applications', async ({ browser }) => {
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

    const start = addMinutes(new Date(), 150);
    const end = addHours(start, 2);
    const created = await opPage.request.post('/api/shifts', { data: { homeId, startTime: toIso(start), endTime: toIso(end), hourlyRate: 29, notes: 'E2E reject' } });
    const cjson = await created.json();
    expect(cjson.success).toBeTruthy();
    shiftId = cjson.data.id;

    // Caregiver login and apply via API
    await cgPage.goto('/auth/login');
    await cgPage.fill('#email', caregiverEmail);
    await cgPage.fill('#password', 'Caregiver123!');
    await cgPage.click('button:has-text("Sign in")');
    await cgPage.waitForURL('**/dashboard**');

    const applyRes = await cgPage.request.post(`/api/shifts/${shiftId}/applications`, { data: {} });
    const applyJson = await applyRes.json();
    expect(applyJson.success).toBeTruthy();

    // Operator rejects via API
    const rejRes = await opPage.request.post(`/api/shifts/${shiftId}/applications/${caregiverId}/reject`, { data: {} });
    const rejJson = await rejRes.json();
    expect(rejJson.success).toBeTruthy();

    // Verify via API the application is REJECTED
    const shiftRes = await opPage.request.get(`/api/shifts/${shiftId}`);
    const shiftJson = await shiftRes.json();
    const app = (shiftJson.data?.applications || []).find((a: any) => a.caregiverId === caregiverId);
    expect(app?.status).toBe('REJECTED');

    // Caregiver My Applications should no longer include the shift
    await cgPage.goto('/dashboard/shifts');
    await cgPage.getByRole('button', { name: 'My Applications' }).click();
    await expect(cgPage.locator(`tr:has(td:has-text("${homeName}"))`)).toHaveCount(0);

    await operatorContext.close();
    await caregiverContext.close();
  });
});
