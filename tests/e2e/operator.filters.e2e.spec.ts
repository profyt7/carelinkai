import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { addHours, addMinutes } from 'date-fns';

const prisma = new PrismaClient();
const toIso = (d: Date) => d.toISOString();

async function waitForShifts(page, params: string[]) {
  await page.waitForResponse(
    (res) => res.url().includes('/api/shifts') && params.every((p) => res.url().includes(p)) && res.status() === 200
  );
}

test.describe('Operator Status Filter', () => {
  let homeId: string;

  test.beforeAll(async () => {
    const op = await prisma.user.findUnique({ where: { email: 'operator1@example.com' }, include: { operator: { include: { homes: { take: 1 } } } } });
    const home = op?.operator?.homes?.[0];
    if (!home) throw new Error('home not found');
    homeId = home.id;
  });

  test('Filtering by status toggles rows (OPEN vs CANCELED)', async ({ page }) => {
    // Login as operator
    await page.goto('/auth/login');
    await page.fill('#email', 'operator1@example.com');
    await page.fill('#password', 'Operator123!');
    await page.click('button:has-text("Sign in")');
    await page.waitForURL('**/dashboard**');
    await page.goto('/dashboard/shifts');

    // Create one OPEN shift and one CANCELED shift
    const base = addMinutes(new Date(), 300);

    const createShift = async () => {
      const res = await page.request.post('/api/shifts', {
        data: {
          homeId,
          startTime: toIso(base),
          endTime: toIso(addHours(base, 2)),
          hourlyRate: 40,
          notes: `E2E filter`,
        },
      });
      const j = await res.json();
      expect(j.success).toBeTruthy();
      return j.data.id as string;
    };

    const idOpen = await createShift();
    const idCanceled = await createShift();

    // Cancel one via API
    const cancelRes = await page.request.post(`/api/shifts/${idCanceled}/cancel`, { data: {} });
    const cancelJson = await cancelRes.json();
    expect(cancelJson.success).toBeTruthy();

    // Filter to our home and big page size
    await page.getByTestId('home-filter').selectOption(homeId);
    await waitForShifts(page, ["homeId=" + homeId]);
    await page.getByTestId('page-size').selectOption('50');

    // Filter OPEN
    await page.getByTestId('status-filter').selectOption('OPEN');
    await waitForShifts(page, ["homeId=" + homeId, 'status=OPEN']);
    await expect(page.locator(`tr[data-shift-id='${idOpen}']`)).toBeVisible();
    await expect(page.locator(`tr[data-shift-id='${idCanceled}']`)).toHaveCount(0);

    // Filter CANCELED
    await page.getByTestId('status-filter').selectOption('CANCELED');
    await waitForShifts(page, ["homeId=" + homeId, 'status=CANCELED']);
    await expect(page.locator(`tr[data-shift-id='${idCanceled}']`)).toBeVisible();
    await expect(page.locator(`tr[data-shift-id='${idOpen}']`)).toHaveCount(0);
  });
});
