/**
 * Compliance Tab E2E Tests
 * 
 * Tests that Compliance tab is restricted to Admin/Operator only.
 */

import { test, expect } from '@playwright/test';
import { 
  loginAsAdmin, 
  loginAsOperator, 
  loginAsCaregiver, 
  loginAsFamily,
  waitForPageReady
} from './helpers/auth';
import { TEST_RESIDENT_ID, SELECTORS } from './fixtures/test-data';

test.describe('Compliance Tab - Admin/Operator Only', () => {
  
  test('Admin can view compliance tab', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Click compliance tab
    await page.click(SELECTORS.tabs.compliance);
    
    // Should see compliance content
    await expect(page.locator('text=/compliance/i')).toBeVisible();
    
    // Should NOT see "Restricted Access" message
    const restrictedMessage = page.locator(SELECTORS.badges.restrictedAccess);
    const hasRestrictedMessage = await restrictedMessage.count() > 0;
    
    expect(hasRestrictedMessage).toBe(0);
  });

  test('Admin can manage compliance items', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Click compliance tab
    await page.click(SELECTORS.tabs.compliance);
    
    // Look for "Add Compliance" or similar button
    const newButton = page.locator('button:has-text("Add Compliance"), button:has-text("New Compliance Item")');
    const hasNewButton = await newButton.count() > 0;
    
    expect(hasNewButton).toBeTruthy();
  });

  test('Operator can view compliance tab', async ({ page }) => {
    await loginAsOperator(page);
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Click compliance tab
    await page.click(SELECTORS.tabs.compliance);
    
    // Should see compliance content
    await expect(page.locator('text=/compliance/i')).toBeVisible();
    
    // Should NOT see "Restricted Access" message
    const restrictedMessage = page.locator(SELECTORS.badges.restrictedAccess);
    const hasRestrictedMessage = await restrictedMessage.count() > 0;
    
    expect(hasRestrictedMessage).toBe(0);
  });

  test('Operator can manage compliance items', async ({ page }) => {
    await loginAsOperator(page);
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Click compliance tab
    await page.click(SELECTORS.tabs.compliance);
    
    // Should see management buttons
    const newButton = page.locator('button:has-text("Add Compliance"), button:has-text("New Compliance Item")');
    const hasNewButton = await newButton.count() > 0;
    
    expect(hasNewButton).toBeTruthy();
  });
});

test.describe('Compliance Tab - Caregiver Restricted', () => {
  
  test('Caregiver sees "Restricted Access" message', async ({ page }) => {
    await loginAsCaregiver(page);
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Click compliance tab
    await page.click(SELECTORS.tabs.compliance);
    
    // Should see "Restricted Access" message
    await expect(page.locator(SELECTORS.badges.restrictedAccess)).toBeVisible();
  });

  test('Caregiver cannot see compliance items', async ({ page }) => {
    await loginAsCaregiver(page);
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Click compliance tab
    await page.click(SELECTORS.tabs.compliance);
    
    // Should NOT see compliance items list
    const complianceList = page.locator('[data-testid="compliance-list"], .compliance-items');
    const hasComplianceList = await complianceList.count() > 0;
    
    expect(hasComplianceList).toBe(0);
  });

  test('Caregiver cannot add compliance items', async ({ page }) => {
    await loginAsCaregiver(page);
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Click compliance tab
    await page.click(SELECTORS.tabs.compliance);
    
    // Should NOT see add button
    const newButton = page.locator('button:has-text("Add Compliance"), button:has-text("New Compliance Item")');
    const hasNewButton = await newButton.count() > 0;
    
    expect(hasNewButton).toBe(0);
  });
});

test.describe('Compliance Tab - Family Restricted', () => {
  
  test('Family sees "Restricted Access" message', async ({ page }) => {
    await loginAsFamily(page);
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Click compliance tab
    await page.click(SELECTORS.tabs.compliance);
    
    // Should see "Restricted Access" message
    await expect(page.locator(SELECTORS.badges.restrictedAccess)).toBeVisible();
  });

  test('Family cannot see compliance items', async ({ page }) => {
    await loginAsFamily(page);
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Click compliance tab
    await page.click(SELECTORS.tabs.compliance);
    
    // Should NOT see compliance items list
    const complianceList = page.locator('[data-testid="compliance-list"], .compliance-items');
    const hasComplianceList = await complianceList.count() > 0;
    
    expect(hasComplianceList).toBe(0);
  });

  test('Family cannot add compliance items', async ({ page }) => {
    await loginAsFamily(page);
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Click compliance tab
    await page.click(SELECTORS.tabs.compliance);
    
    // Should NOT see add button
    const newButton = page.locator('button:has-text("Add Compliance"), button:has-text("New Compliance Item")');
    const hasNewButton = await newButton.count() > 0;
    
    expect(hasNewButton).toBe(0);
  });

  test('Compliance tab is completely hidden for unauthorized roles', async ({ page }) => {
    await loginAsFamily(page);
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Check if compliance tab exists
    const complianceTab = page.locator(SELECTORS.tabs.compliance);
    const tabExists = await complianceTab.count() > 0;
    
    if (tabExists) {
      // If tab exists, it should show restricted message when clicked
      await page.click(SELECTORS.tabs.compliance);
      await expect(page.locator(SELECTORS.badges.restrictedAccess)).toBeVisible();
    } else {
      // Tab is completely hidden - this is also acceptable
      expect(tabExists).toBe(0);
    }
  });
});
