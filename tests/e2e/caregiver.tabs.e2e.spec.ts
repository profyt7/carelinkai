import { test, expect } from '@playwright/test';
import { PrismaClient, ShiftStatus } from '@prisma/client';
import { addDays, addHours } from 'date-fns';

// Test group for caregiver tabs functionality
test.describe('Caregiver Tabs Functionality', () => {
  const prisma = new PrismaClient();
  let testShiftId: string;
  let homeName: string;

  // Setup: Create a test shift before running tests
  test.beforeAll(async () => {
    // Find operator1 and their first home
    const operator = await prisma.user.findUnique({
      where: { email: 'operator1@example.com' },
      include: {
        operator: {
          include: {
            homes: {
              take: 1,
              include: {
                address: true
              }
            }
          }
        }
      }
    });

    if (!operator?.operator?.homes[0]) {
      throw new Error('Operator or home not found');
    }

    const homeId = operator.operator.homes[0].id;
    homeName = operator.operator.homes[0].name;

    // Create a new shift starting tomorrow, lasting 8 hours
    const startTime = addDays(new Date(), 1);
    const endTime = addHours(startTime, 8);

    const shift = await prisma.caregiverShift.create({
      data: {
        homeId: homeId,
        startTime: startTime,
        endTime: endTime,
        status: ShiftStatus.OPEN,
        hourlyRate: 27,
        notes: 'E2E test shift for caregiver tabs test'
      }
    });

    testShiftId = shift.id;
    console.log(`Created test shift with ID: ${testShiftId}`);
  });

  // Cleanup: Delete the test shift after tests
  test.afterAll(async () => {
    if (testShiftId) {
      await prisma.caregiverShift.delete({
        where: { id: testShiftId }
      });
      console.log(`Deleted test shift with ID: ${testShiftId}`);
    }
    await prisma.$disconnect();
  });

  // Test: Verify My Applications tab shows applied shifts
  test('Caregiver tab: My Applications shows applied shifts', async ({ page }) => {
    // Step 1: Login as caregiver1
    await page.goto('/auth/login');
    await page.waitForSelector('form');
    
    await page.fill('input#email', 'caregiver1@example.com');
    await page.fill('input#password', 'Caregiver123!');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await page.waitForURL('**/dashboard**');
    
    // Step 2: Navigate to shifts page
    await page.click('a[href="/dashboard/shifts"]');
    
    // Wait for shifts page to load with the Open tab active by default
    await page.waitForSelector('h1:has-text("Caregiver Shifts")');
    
    // Step 3: Find and apply to our test shift
    // First ensure we're on the Open Shifts tab (default)
    await page.locator('button:has-text("Open Shifts")').first().click();
    
    // Find the row with our test shift by looking for the hourly rate
    const shiftRow = page.locator(`tr:has-text("$27.00/hr")`).filter({
      has: page.locator(`td:has-text("${homeName}")`)
    });
    
    // Click the Apply button for this shift
    await shiftRow.locator('button:has-text("Apply")').click();
    
    // Wait for success message
    await page.waitForSelector('text=Successfully applied');
    
    // Step 4: Navigate to My Applications tab
    await page.locator('button:has-text("My Applications")').click();
    
    // Step 5: Verify the shift appears in My Applications tab
    // The shift should be visible with the home name
    await expect(page.locator(`td:has-text("${homeName}")`)).toBeVisible();
    
    // Verify the row is present in My Applications
    const applicationRow = page.locator(`tr:has-text("${homeName}")`);
    await expect(applicationRow).toBeVisible();
    // And the Apply button is not shown for this row
    await expect(applicationRow.locator('button:has-text("Apply")')).toHaveCount(0);
  });
});
