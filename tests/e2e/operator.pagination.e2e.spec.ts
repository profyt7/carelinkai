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

test.describe('Operator Pagination Controls', () => {
  let homeId: string;

  test.beforeAll(async () => {
    const op = await prisma.user.findUnique({ where: { email: 'operator1@example.com' }, include: { operator: { include: { homes: { take: 1 } } } } });
    const home = op?.operator?.homes?.[0];
    if (!home) throw new Error('home not found');
    homeId = home.id;
  });

  test('Next/Prev and page size affect visible rows', async ({ page }) => {
    // Login as operator
    await page.goto('/auth/login');
    await page.fill('#email', 'operator1@example.com');
    await page.fill('#password', 'Operator123!');
    await page.click('button:has-text("Sign in")');
    await page.waitForURL('**/dashboard**');
    await page.goto('/dashboard/shifts');

    // Create 25 shifts to paginate (all same base time, distinct notes)
    const base = addMinutes(new Date(), 240);
    const ids: string[] = [];
    for (let i = 0; i < 25; i++) {
      const res = await page.request.post('/api/shifts', {
        data: {
          homeId,
          startTime: toIso(base),
          endTime: toIso(addHours(base, 2)),
          hourlyRate: 20 + i,
          notes: `E2E pagination ${i}`,
        },
      });
      const j = await res.json();
      expect(j.success).toBeTruthy();
      ids.push(j.data.id as string);
    }

    // Select home, page size 10, sort by createdAt desc to make newest first
    await page.getByTestId('home-filter').selectOption(homeId);
    await waitForShifts(page, ["homeId=" + homeId]);
    await page.getByTestId('page-size').selectOption('10');

    await page.getByTestId('sort-by').selectOption('createdAt');
    await waitForShifts(page, ['sortBy=createdAt']);

    await page.getByTestId('sort-order').selectOption('desc');
    await waitForShifts(page, ['sortOrder=desc']);

    // Page 1: expect first 10 rows visible
    const firstPageRows = await page.locator('tbody tr').count();
    expect(firstPageRows).toBeGreaterThan(0);
    expect(firstPageRows).toBeLessThanOrEqual(10);

    // Grab the first row id (newest)
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible();
    const firstRowId = await firstRow.getAttribute('data-shift-id');

    // Next to page 2
    await page.getByTestId('next-page').click();
    await waitForShifts(page, ["homeId=" + homeId, 'limit=10', 'offset=10']);
    await expect(page.getByTestId('page-indicator')).toContainText('Page 2');
    // First row from page 1 should not be visible now
    await expect(page.locator(`tr[data-shift-id='${firstRowId}']`)).toHaveCount(0);

    // Next to page 3
    await page.getByTestId('next-page').click();
    await waitForShifts(page, ["homeId=" + homeId, 'limit=10', 'offset=20']);
    await expect(page.getByTestId('page-indicator')).toContainText('Page 3');

    // Prev back to page 2 and ensure some row exists
    await page.getByTestId('prev-page').click();
    await waitForShifts(page, ["homeId=" + homeId, 'limit=10', 'offset=10']);
    await expect(page.getByTestId('page-indicator')).toContainText('Page 2');
    const rowsPage2 = await page.locator('tbody tr').count();
    expect(rowsPage2).toBeGreaterThan(0);
  });
});
