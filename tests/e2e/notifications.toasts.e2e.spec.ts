import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { addHours, addMinutes } from 'date-fns';

const prisma = new PrismaClient();
const toIso = (d: Date) => d.toISOString();

async function row(page, id: string) {
  const r = page.locator(`tr[data-shift-id='${id}']`).first();
  await expect(r).toBeVisible();
  return r;
}

test.describe('Notifications Toasts', () => {
  let homeId: string;
  let caregiverId: string;
  const caregiverEmail = 'caregiver1@example.com';

  test.beforeAll(async () => {
    // Get operator home
    const op = await prisma.user.findUnique({ 
      where: { email: 'operator1@example.com' }, 
      include: { operator: { include: { homes: { take: 1 } } } } 
    });
    const home = op?.operator?.homes?.[0];
    if (!home) throw new Error('home not found');
    homeId = home.id;

    // Get caregiver ID
    const cg = await prisma.caregiver.findFirst({ 
      where: { user: { email: caregiverEmail } } 
    });
    if (!cg) throw new Error('caregiver not found');
    caregiverId = cg.id;
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test('Apply → Offer → Accept → Confirm shows success toasts', async ({ browser }) => {
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
    const base = addMinutes(new Date(), 200);
    const created = await op.request.post('/api/shifts', { 
      data: { 
        homeId, 
        startTime: toIso(base), 
        endTime: toIso(addHours(base, 2)), 
        hourlyRate: 27, 
        notes: 'E2E toast' 
      } 
    });
    const cjson = await created.json();
    expect(cjson.success).toBeTruthy();
    const shiftId = cjson.data.id as string;

    // Caregiver login (no apply step)
    await cg.goto('/auth/login');
    await cg.fill('#email', caregiverEmail);
    await cg.fill('#password', 'Caregiver123!');
    await cg.click('button:has-text("Sign in")');
    await cg.waitForURL('**/dashboard**');

    // Operator offers directly via UI
    await op.goto('/dashboard/shifts');
    await op.getByTestId('home-filter').selectOption(homeId);
    const rowOp = await row(op, shiftId);
    
    // Fill caregiver ID and click Offer
    await rowOp.locator('input[placeholder="e.g., cg_123"]').fill(caregiverId);
    await rowOp.locator('button:has-text("Offer")').first().click();
    await expect(op.getByText('Successfully offered the shift to the caregiver!')).toBeVisible();

    // Caregiver accepts via UI
    await cg.goto('/dashboard/shifts');
    await cg.getByRole('button', { name: 'My Offers' }).click();
    const rowOffer = await row(cg, shiftId);
    await rowOffer.locator('button:has-text("Accept")').click();
    await expect(cg.getByText('Successfully accepted the offer!')).toBeVisible();

    // Operator confirms via UI
    await op.goto('/dashboard/shifts');
    await op.getByTestId('home-filter').selectOption(homeId);
    const rowOp2 = await row(op, shiftId);
    await rowOp2.getByTestId('confirm-btn').click();
    await expect(op.getByText('Successfully confirmed the shift!')).toBeVisible();

    await operatorContext.close();
    await caregiverContext.close();
  });

  test('Withdraw and Reject show success toasts', async ({ browser }) => {
    const operatorContext = await browser.newContext();
    const caregiverContext = await browser.newContext();
    const op = await operatorContext.newPage();
    const cg = await caregiverContext.newPage();

    // Operator login and create shift
    await op.goto('/auth/login');
    await op.fill('#email', 'operator1@example.com');
    await op.fill('#password', 'Operator123!');
    await op.click('button:has-text("Sign in")');
    await op.waitForURL('**/dashboard**');

    const base = addMinutes(new Date(), 220);
    const created = await op.request.post('/api/shifts', { 
      data: { 
        homeId, 
        startTime: toIso(base), 
        endTime: toIso(addHours(base, 2)), 
        hourlyRate: 26, 
        notes: 'E2E toast withdraw/reject' 
      } 
    });
    const cjson = await created.json();
    expect(cjson.success).toBeTruthy();
    const shiftId = cjson.data.id as string;

    // Caregiver login
    await cg.goto('/auth/login');
    await cg.fill('#email', caregiverEmail);
    await cg.fill('#password', 'Caregiver123!');
    await cg.click('button:has-text("Sign in")');
    await cg.waitForURL('**/dashboard**');

    // Apply via API instead of UI
    const applyRes = await cg.request.post(`/api/shifts/${shiftId}/applications`, { data: {} });
    const applyJson = await applyRes.json();
    expect(applyJson.success).toBeTruthy();

    // Navigate to My Applications and withdraw
    await cg.goto('/dashboard/shifts');
    await cg.getByRole('button', { name: 'My Applications' }).click();
    const rowCg = await row(cg, shiftId);
    await rowCg.locator('button:has-text("Withdraw")').click();
    await expect(cg.getByText('Application withdrawn')).toBeVisible();

    // Apply again via API
    const reapplyRes = await cg.request.post(`/api/shifts/${shiftId}/applications`, { data: {} });
    const reapplyJson = await reapplyRes.json();
    expect(reapplyJson.success).toBeTruthy();

    // Operator rejects via UI
    await op.goto('/dashboard/shifts');
    await op.getByTestId('home-filter').selectOption(homeId);
    const rowOp = await row(op, shiftId);
    await rowOp.locator('div:has-text("Applications:")').locator('button:has-text("Reject")').first().click();
    await expect(op.getByText('Application rejected')).toBeVisible();

    await operatorContext.close();
    await caregiverContext.close();
  });
});
