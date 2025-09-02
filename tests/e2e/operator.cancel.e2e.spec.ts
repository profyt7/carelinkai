import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { addHours, addMinutes } from 'date-fns';

const prisma = new PrismaClient();
const toIso = (d: Date) => d.toISOString();

test.describe('Operator Cancel Flow', () => {
  let homeId: string;

  test.beforeAll(async () => {
    const op = await prisma.user.findUnique({ where: { email: 'operator1@example.com' }, include: { operator: { include: { homes: { take: 1 } } } } });
    const home = op?.operator?.homes?.[0];
    if (!home) throw new Error('home not found');
    homeId = home.id;
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test('Cancel shift; status becomes CANCELED and visible under CANCELED filter', async ({ page }) => {
    // Login as operator
    await page.goto('/auth/login');
    await page.fill('#email', 'operator1@example.com');
    await page.fill('#password', 'Operator123!');
    await page.click('button:has-text("Sign in")');
    await page.waitForURL('**/dashboard**');

    // Create shift
    const base = addMinutes(new Date(), 120);
    const res = await page.request.post('/api/shifts', {
      data: { homeId, startTime: toIso(base), endTime: toIso(addHours(base, 2)), hourlyRate: 33, notes: 'E2E cancel' },
    });
    const j = await res.json();
    expect(j.success).toBeTruthy();
    const shiftId = j.data.id as string;

    // Cancel via API
    const cancelRes = await page.request.post(`/api/shifts/${shiftId}/cancel`, { data: {} });
    const cancelJson = await cancelRes.json();
    expect(cancelJson.success).toBeTruthy();

    // Verify DB status
    const rec = await prisma.caregiverShift.findUnique({ where: { id: shiftId } });
    expect(rec?.status).toBe('CANCELED');

    // UI filter checks
    await page.goto('/dashboard/shifts');
    await page.getByTestId('home-filter').selectOption(homeId);
    await page.getByTestId('page-size').selectOption('50');

    // OPEN should not show it
    await page.getByTestId('status-filter').selectOption('OPEN');
    await expect(page.locator(`tr[data-shift-id='${shiftId}']`)).toHaveCount(0);

    // CANCELED should show it
    await page.getByTestId('status-filter').selectOption('CANCELED');
    await expect(page.locator(`tr[data-shift-id='${shiftId}']`)).toBeVisible();
  });
});
