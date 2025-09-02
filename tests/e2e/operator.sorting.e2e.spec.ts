import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { addHours, addMinutes } from 'date-fns';

const prisma = new PrismaClient();
const toIso = (d: Date) => d.toISOString();

async function rowIndexFor(page, shiftId: string) {
  const row = page.locator(`tr[data-shift-id='${shiftId}']`).first();
  await expect(row).toBeVisible();
  const idx = await row.evaluate((el) => (el as HTMLTableRowElement).rowIndex);
  return idx;
}

test.describe('Operator Sorting Controls', () => {
  let homeId: string;

  test.beforeAll(async () => {
    const op = await prisma.user.findUnique({ where: { email: 'operator1@example.com' }, include: { operator: { include: { homes: { take: 1 } } } } });
    const home = op?.operator?.homes?.[0];
    if (!home) throw new Error('home not found');
    homeId = home.id;
  });

  test('Sort by Rate asc/desc reorders rows', async ({ page, request }) => {
    // Login as operator
    await page.goto('/auth/login');
    await page.fill('#email', 'operator1@example.com');
    await page.fill('#password', 'Operator123!');
    await page.click('button:has-text("Sign in")');
    await page.waitForURL('**/dashboard**');

    // Create 3 shifts with distinct hourly rates
    const base = addMinutes(new Date(), 200);

    const mk = async (rate: number) => {
      const res = await request.post('/api/shifts', { data: { homeId, startTime: toIso(base), endTime: toIso(addHours(base, 2)), hourlyRate: rate, notes: `E2E sort ${rate}` } });
      const j = await res.json();
      expect(j.success).toBeTruthy();
      return j.data.id as string;
    };

    const id20 = await mk(20);
    const id30 = await mk(30);
    const id25 = await mk(25);

    // Filter to our home and set page size large
    await page.getByTestId('home-filter').selectOption(homeId);
    await page.getByTestId('page-size').selectOption('50');

    // Sort by Rate asc
    await page.getByTestId('sort-by').selectOption('hourlyRate');
    await page.getByTestId('sort-order').selectOption('asc');

    const asc20 = await rowIndexFor(page, id20);
    const asc25 = await rowIndexFor(page, id25);
    const asc30 = await rowIndexFor(page, id30);

    expect(asc20).toBeLessThan(asc25);
    expect(asc25).toBeLessThan(asc30);

    // Sort by Rate desc
    await page.getByTestId('sort-order').selectOption('desc');

    const desc20 = await rowIndexFor(page, id20);
    const desc25 = await rowIndexFor(page, id25);
    const desc30 = await rowIndexFor(page, id30);

    expect(desc30).toBeLessThan(desc25);
    expect(desc25).toBeLessThan(desc20);
  });
});
