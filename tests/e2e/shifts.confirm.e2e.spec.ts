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
        where: { user: { email: 'caregiver1@example.com' } },
        include: { user: true }
      });
      if (specificCaregiver) {
        caregiverId = specificCaregiver.id;
        caregiverEmail = specificCaregiver.user.email;
      } else {
        const anyCaregiver = await prisma.caregiver.findFirst({ include: { user: true } });
        if (!anyCaregiver) throw new Error('No caregivers found in the database');
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
      await operatorPage.waitForURL('**/dashboard**');
    });
    
    // Step 2: Operator navigates to shifts page
    await test.step('Navigate to shifts page', async () => {
      await operatorPage.goto('/dashboard/shifts');
      await operatorPage.waitForSelector('h1:has-text("Caregiver Shifts")');
    });
    
    // Step 3: Operator posts a new shift
    await test.step('Post new shift', async () => {
      const now = new Date();
      const startTime = new Date(now.getTime() + 60 * 60 * 1000);
      const endTime = new Date(now.getTime() + 3 * 60 * 60 * 1000);
      await operatorPage.selectOption('select#homeId', { index: 1 });
      await operatorPage.fill('input#startTime', formatDateForInput(startTime));
      await operatorPage.fill('input#endTime', formatDateForInput(endTime));
      await operatorPage.fill('input#hourlyRate', '25');
      await operatorPage.fill('textarea#notes', 'E2E test shift for confirmation flow');
      await operatorPage.click('button:has-text("Post Shift")');
      await operatorPage.waitForSelector('div:has-text("Shift posted successfully")');
      const shiftsResponse = await operatorPage.request.get('/api/shifts');
      const shiftsData = await shiftsResponse.json();
      expect(shiftsData.success).toBeTruthy();
      const shifts = shiftsData.data;
      const ourShift = shifts
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .find((s: any) => s.status === 'OPEN');
      expect(ourShift).toBeTruthy();
      shiftId = ourShift.id;
      console.log(`Created shift with ID: ${shiftId}`);
    });
    
    // Step 4: Operator offers the shift to the caregiver via API
    await test.step('Operator offers shift to caregiver', async () => {
      const offerResponse = await operatorPage.request.post(`/api/shifts/${shiftId}/offer`, {
        data: { caregiverId, notes: 'Offering shift via E2E test' }
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
      await caregiverPage.waitForURL('**/dashboard**');
    });
    
    // Step 6: Caregiver accepts the shift via API
    await test.step('Caregiver accepts shift', async () => {
      const acceptResponse = await caregiverPage.request.post(`/api/shifts/${shiftId}/accept`, {
        data: { notes: 'Accepting shift via E2E test' }
      });
      const acceptData = await acceptResponse.json();
      expect(acceptData.success).toBeTruthy();
      console.log('Shift accepted by caregiver');
    });
    
    // Step 7: Operator confirms the shift via API (stabilized)
    await test.step('Operator confirms shift', async () => {
      await expect.poll(async () => {
        const r = await operatorPage.request.get(`/api/shifts/${shiftId}`);
        if (!r.ok()) return 'PENDING';
        const j = await r.json();
        const hasAccepted = (j.data?.applications || []).some((a: any) => a.status === 'ACCEPTED');
        return hasAccepted ? 'READY' : 'PENDING';
      }).toBe('READY');

      const confirmResponse = await operatorPage.request.post(`/api/shifts/${shiftId}/confirm`, { data: {} });
      const confirmData = await confirmResponse.json();
      expect(confirmData.success).toBeTruthy();

      await expect.poll(async () => {
        const updated = await operatorPage.request.get('/api/shifts');
        const json = await updated.json();
        const s = json.data.find((x: any) => x.id === shiftId);
        return s?.status;
      }).toBe('ASSIGNED');

      console.log('Shift confirmed by operator');
    });
    
    await operatorContext.close();
    await caregiverContext.close();
  });
});
