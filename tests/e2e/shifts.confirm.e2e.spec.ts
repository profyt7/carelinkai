import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
const prisma = new PrismaClient();

// Helper to format dates for datetime-local inputs
const formatDateForInput = (date: Date) => {
  return date.toISOString().slice(0, 16); // Format as yyyy-MM-ddTHH:mm
};

test.describe('Caregiver Shifts Confirmation Flow', () => {
  let caregiverId: string;
  let caregiverEmail: string;
  
  // Setup - fetch caregiver details before tests run
  test.beforeAll(async () => {
    try {
      // Try to find caregiver1@example.com first
      const specificCaregiver = await prisma.caregiver.findFirst({
        where: {
          user: {
            email: 'caregiver1@example.com'
          }
        },
        include: {
          user: true
        }
      });
      
      if (specificCaregiver) {
        caregiverId = specificCaregiver.id;
        caregiverEmail = specificCaregiver.user.email;
      } else {
        // Fallback to any caregiver
        const anyCaregiver = await prisma.caregiver.findFirst({
          include: {
            user: true
          }
        });
        
        if (!anyCaregiver) {
          throw new Error('No caregivers found in the database');
        }
        
        caregiverId = anyCaregiver.id;
        caregiverEmail = anyCaregiver.user.email;
      }
      
      console.log(`Using caregiver: ${caregiverEmail} (ID: ${caregiverId})`);
    } catch (error) {
      console.error('Error fetching caregiver details:', error);
      throw error;
    }
  });
  
  // Cleanup - disconnect Prisma client after tests
  test.afterAll(async () => {
    await prisma.$disconnect();
  });
  
  test('End-to-end shift confirmation flow: offer → accept → confirm', async ({ browser }) => {
    // Create two separate contexts for operator and caregiver
    const operatorContext = await browser.newContext();
    const caregiverContext = await browser.newContext();
    
    const operatorPage = await operatorContext.newPage();
    const caregiverPage = await caregiverContext.newPage();
    
    let shiftId: string;
    
    // Step 1: Operator logs in
    await test.step('Operator login', async () => {
      await operatorPage.goto('/auth/login');
      await operatorPage.waitForSelector('form');
      
      await operatorPage.fill('input#email', 'operator1@example.com');
      await operatorPage.fill('input#password', 'Operator123!');
      await operatorPage.click('button:has-text("Sign in")');
      
      // Wait for dashboard to load
      await operatorPage.waitForURL('**/dashboard**');
    });
    
    // Step 2: Operator navigates to shifts page
    await test.step('Navigate to shifts page', async () => {
      await operatorPage.goto('/dashboard/shifts');
      await operatorPage.waitForSelector('h1:has-text("Caregiver Shifts")');
    });
    
    // Step 3: Operator posts a new shift
    await test.step('Post new shift', async () => {
      // Calculate near-future times for the shift
      const now = new Date();
      const startTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
      const endTime = new Date(now.getTime() + 3 * 60 * 60 * 1000); // 3 hours from now
      
      // Fill out the shift form
      await operatorPage.selectOption('select#homeId', { index: 1 }); // Select the first home
      await operatorPage.fill('input#startTime', formatDateForInput(startTime));
      await operatorPage.fill('input#endTime', formatDateForInput(endTime));
      await operatorPage.fill('input#hourlyRate', '25');
      await operatorPage.fill('textarea#notes', 'E2E test shift for confirmation flow');
      
      // Submit the form
      await operatorPage.click('button:has-text("Post Shift")');
      
      // Wait for success toast
      await operatorPage.waitForSelector('div:has-text("Shift posted successfully")');
      
      // Get all shifts to find the one we just created
      const shiftsResponse = await operatorPage.request.get('/api/shifts');
      const shiftsData = await shiftsResponse.json();
      
      expect(shiftsData.success).toBeTruthy();
      
      const shifts = shiftsData.data;
      
      // Sort by creation time (newest first) and pick the latest OPEN shift
      const ourShift = shifts
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .find(shift => shift.status === 'OPEN');
      
      expect(ourShift).toBeTruthy();
      shiftId = ourShift.id;
      console.log(`Created shift with ID: ${shiftId}`);
    });
    
    // Step 4: Operator offers the shift to the caregiver via API
    await test.step('Operator offers shift to caregiver', async () => {
      const offerResponse = await operatorPage.request.post(`/api/shifts/${shiftId}/offer`, {
        data: {
          caregiverId: caregiverId,
          notes: 'Offering shift via E2E test'
        }
      });
      
      const offerData = await offerResponse.json();
      expect(offerData.success).toBeTruthy();
      console.log('Shift offered to caregiver');
    });
    
    // Step 5: Caregiver logs in
    await test.step('Caregiver login', async () => {
      await caregiverPage.goto('/auth/login');
      await caregiverPage.waitForSelector('form');
      
      await caregiverPage.fill('input#email', caregiverEmail);
      await caregiverPage.fill('input#password', 'Caregiver123!');
      await caregiverPage.click('button:has-text("Sign in")');
      
      // Wait for dashboard to load
      await caregiverPage.waitForURL('**/dashboard**');
    });
    
    // Step 6: Caregiver accepts the shift via API
    await test.step('Caregiver accepts shift', async () => {
      const acceptResponse = await caregiverPage.request.post(`/api/shifts/${shiftId}/accept`, {
        data: {
          notes: 'Accepting shift via E2E test'
        }
      });
      
      const acceptData = await acceptResponse.json();
      expect(acceptData.success).toBeTruthy();
      console.log('Shift accepted by caregiver');
    });
    
    // Step 7: Operator confirms the shift
    await test.step('Operator confirms shift', async () => {
      // Reload the shifts page to see the updated status
      await operatorPage.reload();
      await operatorPage.waitForSelector('h1:has-text("Caregiver Shifts")');

      // Wait for the table to load
      await operatorPage.waitForSelector('table');

      // Click the Confirm button for our specific shift
      const confirmForShift = operatorPage
        .locator(`button[data-testid="confirm-btn"][data-shift-id="${shiftId}"]`)
        .first();

      await expect(confirmForShift).toBeVisible();
      await confirmForShift.click();

      // Poll until the shift status becomes ASSIGNED
      await expect.poll(async () => {
        const updated = await operatorPage.request.get('/api/shifts');
        const json = await updated.json();
        const s = json.data.find((x: any) => x.id === shiftId);
        return s?.status;
      }).toBe('ASSIGNED');

      console.log('Shift confirmed by operator');
    });
    
    // Close contexts
    await operatorContext.close();
    await caregiverContext.close();
  });
});
