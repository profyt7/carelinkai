import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { addHours, addMinutes } from 'date-fns';

const prisma = new PrismaClient();
const toIso = (d: Date) => d.toISOString();

test.describe('Operator Complete Flow', () => {
  let homeId: string;
  let caregiverId: string;
  let caregiverEmail: string = 'caregiver1@example.com';

  test.beforeAll(async () => {
    const op = await prisma.user.findUnique({ where: { email: 'operator1@example.com' }, include: { operator: { include: { homes: { take: 1 } } } } });
    const home = op?.operator?.homes?.[0];
    if (!home) throw new Error('home not found');
    homeId = home.id;

    const cg = await prisma.caregiver.findFirst({ where: { user: { email: caregiverEmail } }, include: { user: true } });
    if (!cg) throw new Error('caregiver not found');
    caregiverId = cg.id;
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test('Complete assigned shift; status becomes COMPLETED and visible in caregiver My Shifts', async ({ browser }) => {
    const operatorContext = await browser.newContext();
    const caregiverContext = await browser.newContext();
    const op = await operatorContext.newPage();
    const cg = await caregiverContext.newPage();

    // Operator login
    await op.goto('/auth/login');
    await op.fill('#email', 'operator1@example.com');
    await op.fill('#password', 'Operator123!');
    await op.click('button:has-text("Sign in")');
    await op.waitForURL('**/dashboard**');

    // Create shift
    const base = addMinutes(new Date(), 180);
    const created = await op.request.post('/api/shifts', { data: { homeId, startTime: toIso(base), endTime: toIso(addHours(base, 2)), hourlyRate: 29, notes: 'E2E complete' } });
    const cjson = await created.json();
    expect(cjson.success).toBeTruthy();
    const shiftId = cjson.data.id as string;

    // Offer to caregiver
    const offerRes = await op.request.post(`/api/shifts/${shiftId}/offer`, { data: { caregiverId } });
    const offerJson = await offerRes.json();
    expect(offerJson.success).toBeTruthy();

    // Caregiver login and accept
    await cg.goto('/auth/login');
    await cg.fill('#email', caregiverEmail);
    await cg.fill('#password', 'Caregiver123!');
    await cg.click('button:has-text("Sign in")');
    await cg.waitForURL('**/dashboard**');

    const acceptRes = await cg.request.post(`/api/shifts/${shiftId}/accept`, { data: {} });
    const acceptJson = await acceptRes.json();
    expect(acceptJson.success).toBeTruthy();

    // Operator confirms (poll until ACCEPTED present)
    await expect.poll(async () => {
      const r = await op.request.get(`/api/shifts/${shiftId}`);
      if (!r.ok()) return 'PENDING';
      const j = await r.json();
      const hasAccepted = (j.data?.applications || []).some((a: any) => a.status === 'ACCEPTED');
      return hasAccepted ? 'READY' : 'PENDING';
    }).toBe('READY');
    const confirmRes = await op.request.post(`/api/shifts/${shiftId}/confirm`, { data: {} });
    const confirmJson = await confirmRes.json();
    expect(confirmJson.success).toBeTruthy();

    await expect.poll(async () => {
      const r = await op.request.get(`/api/shifts/${shiftId}`);
      if (!r.ok()) return 'PENDING';
      const j = await r.json();
      return j.data?.status;
    }).toBe('ASSIGNED');

    // Complete via API
    const completeRes = await op.request.post(`/api/shifts/${shiftId}/complete`, { data: {} });
    const completeJson = await completeRes.json();
    expect(completeJson.success).toBeTruthy();

    // Verify DB status
    const rec = await prisma.caregiverShift.findUnique({ where: { id: shiftId } });
    expect(rec?.status).toBe('COMPLETED');

    // Caregiver My Shifts should contain the row
    await cg.goto('/dashboard/shifts');
    await cg.getByRole('button', { name: 'My Shifts' }).click();
    await expect(cg.locator(`tr[data-shift-id='${shiftId}']`)).toBeVisible();

    await operatorContext.close();
    await caregiverContext.close();
  });
});
