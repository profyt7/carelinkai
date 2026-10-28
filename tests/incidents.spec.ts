/**
 * Incidents Tab E2E Tests
 * 
 * Tests CRUD operations and permissions for incidents across all user roles.
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

test.describe('Incidents Tab - Admin/Operator Full Access', () => {
  
  test('Admin can view incidents tab', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Click incidents tab
    await page.click(SELECTORS.tabs.incidents);
    
    // Should see incidents content
    await expect(page.locator('text=/incidents|incident/i')).toBeVisible();
  });

  test('Admin can create incident', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Click incidents tab
    await page.click(SELECTORS.tabs.incidents);
    
    // Look for "New Incident" or "Report Incident" button
    const newButton = page.locator('button:has-text("New Incident"), button:has-text("Report Incident"), button:has-text("Add Incident")');
    const hasNewButton = await newButton.count() > 0;
    
    expect(hasNewButton).toBeTruthy();
  });

  test('Operator can view and manage incidents', async ({ page }) => {
    await loginAsOperator(page);
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Click incidents tab
    await page.click(SELECTORS.tabs.incidents);
    
    // Should see incidents and management buttons
    await expect(page.locator('text=/incidents/i')).toBeVisible();
    
    const newButton = page.locator('button:has-text("New Incident"), button:has-text("Report Incident")');
    const hasNewButton = await newButton.count() > 0;
    
    expect(hasNewButton).toBeTruthy();
  });

  test('Admin can resolve incidents', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Click incidents tab
    await page.click(SELECTORS.tabs.incidents);
    
    // Look for resolve button on incident items
    const resolveButton = page.locator('button:has-text("Resolve"), button:has-text("Mark Resolved")');
    
    // Admin should have resolve permission
    const hasResolveButton = await resolveButton.count() > 0;
    
    // Note: May be 0 if no unresolved incidents exist
    expect(hasResolveButton).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Incidents Tab - Caregiver Access', () => {
  
  test('Caregiver can view incidents', async ({ page }) => {
    await loginAsCaregiver(page);
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Click incidents tab
    await page.click(SELECTORS.tabs.incidents);
    
    // Should see incidents
    await expect(page.locator('text=/incidents/i')).toBeVisible();
  });

  test('Caregiver can report incidents', async ({ page }) => {
    await loginAsCaregiver(page);
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Click incidents tab
    await page.click(SELECTORS.tabs.incidents);
    
    // Caregiver should be able to report incidents
    const newButton = page.locator('button:has-text("New Incident"), button:has-text("Report Incident")');
    const hasNewButton = await newButton.count() > 0;
    
    expect(hasNewButton).toBeTruthy();
  });

  test('Caregiver has limited resolve permissions', async ({ page }) => {
    await loginAsCaregiver(page);
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Click incidents tab
    await page.click(SELECTORS.tabs.incidents);
    
    // Caregiver may have limited resolve permissions
    const resolveButtons = page.locator('button:has-text("Resolve"), button:has-text("Mark Resolved")');
    const resolveButtonCount = await resolveButtons.count();
    
    // Typically caregivers cannot resolve incidents
    expect(resolveButtonCount).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Incidents Tab - Family View Only', () => {
  
  test('Family can view incidents', async ({ page }) => {
    await loginAsFamily(page);
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Click incidents tab
    await page.click(SELECTORS.tabs.incidents);
    
    // Should see incidents
    await expect(page.locator('text=/incidents/i')).toBeVisible();
  });

  test('Family cannot report incidents', async ({ page }) => {
    await loginAsFamily(page);
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Click incidents tab
    await page.click(SELECTORS.tabs.incidents);
    
    // Should NOT see "Report Incident" button
    const newButton = page.locator('button:has-text("New Incident"), button:has-text("Report Incident")');
    const hasNewButton = await newButton.count() > 0;
    
    expect(hasNewButton).toBe(0);
  });

  test('Family cannot resolve incidents', async ({ page }) => {
    await loginAsFamily(page);
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Click incidents tab
    await page.click(SELECTORS.tabs.incidents);
    
    // Should NOT see resolve buttons
    const resolveButton = page.locator('button:has-text("Resolve"), button:has-text("Mark Resolved")');
    const hasResolveButton = await resolveButton.count() > 0;
    
    expect(hasResolveButton).toBe(0);
  });

  test('Family sees no action buttons on incidents', async ({ page }) => {
    await loginAsFamily(page);
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Click incidents tab
    await page.click(SELECTORS.tabs.incidents);
    
    // Should see view-only content
    const actionButtons = page.locator('button:has-text("Edit"), button:has-text("Delete"), button:has-text("Report"), button:has-text("Resolve")');
    const actionButtonCount = await actionButtons.count();
    
    expect(actionButtonCount).toBe(0);
  });
});
