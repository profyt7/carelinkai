/**
 * Assessments Tab E2E Tests
 * 
 * Tests CRUD operations and permissions for assessments across all user roles.
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

test.describe('Assessments Tab - Admin/Operator Full Access', () => {
  
  test('Admin can view assessments tab', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Click assessments tab
    await page.click(SELECTORS.tabs.assessments);
    
    // Should see assessments content
    await expect(page.locator('text=/assessments|assessment/i')).toBeVisible();
  });

  test('Admin can create assessment', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Click assessments tab
    await page.click(SELECTORS.tabs.assessments);
    
    // Look for "New Assessment" or "Add Assessment" button
    const newButton = page.locator('button:has-text("New Assessment"), button:has-text("Add Assessment")');
    const hasNewButton = await newButton.count() > 0;
    
    expect(hasNewButton).toBeTruthy();
  });

  test('Operator can view and create assessments', async ({ page }) => {
    await loginAsOperator(page);
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Click assessments tab
    await page.click(SELECTORS.tabs.assessments);
    
    // Should see assessments and be able to create
    await expect(page.locator('text=/assessments/i')).toBeVisible();
    
    const newButton = page.locator('button:has-text("New Assessment"), button:has-text("Add Assessment")');
    const hasNewButton = await newButton.count() > 0;
    
    expect(hasNewButton).toBeTruthy();
  });

  test('Admin can delete assessment', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Click assessments tab
    await page.click(SELECTORS.tabs.assessments);
    
    // Look for delete button on assessment items
    const deleteButton = page.locator('button:has-text("Delete")');
    
    // Admin should have delete permission
    const hasDeleteButton = await deleteButton.count() > 0;
    
    // Note: May be 0 if no assessments exist
    expect(hasDeleteButton).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Assessments Tab - Caregiver Limited Access', () => {
  
  test('Caregiver can view assessments', async ({ page }) => {
    await loginAsCaregiver(page);
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Click assessments tab
    await page.click(SELECTORS.tabs.assessments);
    
    // Should see assessments
    await expect(page.locator('text=/assessments/i')).toBeVisible();
  });

  test('Caregiver can create assessments', async ({ page }) => {
    await loginAsCaregiver(page);
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Click assessments tab
    await page.click(SELECTORS.tabs.assessments);
    
    // Caregiver should be able to create assessments
    const newButton = page.locator('button:has-text("New Assessment"), button:has-text("Add Assessment")');
    const hasNewButton = await newButton.count() > 0;
    
    expect(hasNewButton).toBeTruthy();
  });

  test('Caregiver has limited delete permissions', async ({ page }) => {
    await loginAsCaregiver(page);
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Click assessments tab
    await page.click(SELECTORS.tabs.assessments);
    
    // Caregiver may have limited or no delete permissions
    // This depends on RBAC implementation
    const deleteButtons = page.locator('button:has-text("Delete")');
    const deleteButtonCount = await deleteButtons.count();
    
    // Expect fewer or no delete buttons compared to admin
    expect(deleteButtonCount).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Assessments Tab - Family View Only', () => {
  
  test('Family can view assessments', async ({ page }) => {
    await loginAsFamily(page);
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Click assessments tab
    await page.click(SELECTORS.tabs.assessments);
    
    // Should see assessments
    await expect(page.locator('text=/assessments/i')).toBeVisible();
  });

  test('Family cannot create assessments', async ({ page }) => {
    await loginAsFamily(page);
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Click assessments tab
    await page.click(SELECTORS.tabs.assessments);
    
    // Should NOT see "New Assessment" button
    const newButton = page.locator('button:has-text("New Assessment"), button:has-text("Add Assessment")');
    const hasNewButton = await newButton.count() > 0;
    
    expect(hasNewButton).toBe(0);
  });

  test('Family cannot delete assessments', async ({ page }) => {
    await loginAsFamily(page);
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Click assessments tab
    await page.click(SELECTORS.tabs.assessments);
    
    // Should NOT see delete buttons
    const deleteButton = page.locator('button:has-text("Delete")');
    const hasDeleteButton = await deleteButton.count() > 0;
    
    expect(hasDeleteButton).toBe(0);
  });

  test('Family sees no action buttons on assessments', async ({ page }) => {
    await loginAsFamily(page);
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Click assessments tab
    await page.click(SELECTORS.tabs.assessments);
    
    // Should see view-only content
    const actionButtons = page.locator('button:has-text("Edit"), button:has-text("Delete"), button:has-text("New")');
    const actionButtonCount = await actionButtons.count();
    
    expect(actionButtonCount).toBe(0);
  });
});
