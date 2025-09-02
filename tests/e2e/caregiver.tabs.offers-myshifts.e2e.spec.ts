import { test, expect } from '@playwright/test';
import { PrismaClient, ShiftStatus } from '@prisma/client';
import { addHours, addMinutes } from 'date-fns';

const prisma = new PrismaClient();

// Helper to format dates for API ISO strings
const toIso = (d: Date) => d.toISOString();

test.describe('Caregiver Tabs: My Offers and My Shifts', () => {
  let caregiverId: string;
  let caregiverEmail: string;
  let homeId: string;
  let homeName: string;
  let shiftId: string | undefined;

  test.beforeAll(async () => {
    // Fetch caregiver1 and operator1's first home
    const caregiver = await prisma.caregiver.findFirst({
      where: { user: { email: 'caregiver1@example.com' } },
      include: { user: true }
    });
    if (!caregiver) throw new Error('caregiver1@example.com not found');
    caregiverId = caregiver.id;
    caregiverEmail = caregiver.user.email;

    const operator = await prisma.user.findUnique({
      where: { email: 'operator1@example.com' },
      include: { operator: { include: { homes: { take: 1, include: { address: true } } } } }
    });
    const home = operator?.operator?.homes?.[0];
    if (!home) throw new Error('Operator home not found');
    homeId = home.id;
    homeName = home.name;
  });

  test.afterAll(async () => {
    if (shiftId) {
      await prisma.caregiverShift.delete({ where: { id: shiftId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  test('My Offers shows offered shift; My Shifts shows assigned after confirm', async ({ browser }) => {
    const operatorContext = await browser.newContext();
    const caregiverContext = await browser.newContext();
    const operatorPage = await operatorContext.newPage();
    const caregiverPage = await caregiverContext.newPage();

    // Login operator
    await operatorPage.goto('/auth/login');
    await operatorPage.waitForSelector('form');
    await operatorPage.fill('#email', 'operator1@example.com');
    await operatorPage.fill('#password', 'Operator123!');
    await operatorPage.click('button:has-text("Sign in")');
    await operatorPage.waitForURL('**/dashboard**');

    // Create shift via API as operator
    const now = new Date();
    const start = addMinutes(now, 90);
    const end = addHours(start, 2);
    const createRes = await operatorPage.request.post('/api/shifts', {
      data: { homeId, startTime: toIso(start), endTime: toIso(end), hourlyRate: 26, notes: 'E2E offers/myshifts' }
    });
    const created = await createRes.json();
    expect(created.success).toBeTruthy();
    shiftId = created.data.id;

    // Offer to caregiver
    const offerRes = await operatorPage.request.post(`/api/shifts/${shiftId}/offer`, { data: { caregiverId } });
    const offered = await offerRes.json();
    expect(offered.success).toBeTruthy();

    // Login caregiver
    await caregiverPage.goto('/auth/login');
    await caregiverPage.waitForSelector('form');
    await caregiverPage.fill('#email', caregiverEmail);
    await caregiverPage.fill('#password', 'Caregiver123!');
    await caregiverPage.click('button:has-text("Sign in")');
    await caregiverPage.waitForURL('**/dashboard**');

    // Go to Shifts and open My Offers tab
    await caregiverPage.goto('/dashboard/shifts');
    await caregiverPage.waitForSelector('h1:has-text("Caregiver Shifts")');
    await caregiverPage.getByRole('button', { name: 'My Offers' }).click();

    // Expect the offered shift row to appear
    await expect(
      caregiverPage.locator(
        `tr:has(td:has-text("${homeName}")):has(td:has-text("$26.00/hr"))`
      )
    ).toBeVisible();

    // Accept via API for stability
    const acceptRes = await caregiverPage.request.post(`/api/shifts/${shiftId}/accept`, { data: {} });
    const accepted = await acceptRes.json();
    expect(accepted.success).toBeTruthy();

    // Confirm via operator API once an ACCEPTED application exists
    await expect.poll(async () => {
      const r = await operatorPage.request.get(`/api/shifts/${shiftId}`);
      if (!r.ok()) return 'PENDING';
      const j = await r.json();
      const hasAccepted = (j.data?.applications || []).some((a: any) => a.status === 'ACCEPTED');
      return hasAccepted ? 'READY' : 'PENDING';
    }).toBe('READY');

    const confirmRes = await operatorPage.request.post(`/api/shifts/${shiftId}/confirm`, { data: {} });
    const confirmed = await confirmRes.json();
    expect(confirmed.success).toBeTruthy();

    // Caregiver: open My Shifts tab and expect row visible
    await caregiverPage.getByRole('button', { name: 'My Shifts' }).click();
    await expect(
      caregiverPage.locator(
        `tr:has(td:has-text("${homeName}")):has(td:has-text("$26.00/hr"))`
      )
    ).toBeVisible();

    await operatorContext.close();
    await caregiverContext.close();
  });
});
