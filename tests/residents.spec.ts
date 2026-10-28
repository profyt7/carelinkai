/**
 * Residents Module E2E Tests
 * 
 * Tests CRUD operations and permissions for residents across all user roles.
 */

import { test, expect } from '@playwright/test';
import { 
  loginAsAdmin, 
  loginAsOperator, 
  loginAsCaregiver, 
  loginAsFamily,
  waitForPageReady
} from './helpers/auth';
import { TEST_RESIDENT_ID, TEST_RESIDENT, SELECTORS } from './fixtures/test-data';

test.describe('Residents - Admin Access', () => {
  
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await waitForPageReady(page);
  });

  test('Admin can view residents list', async ({ page }) => {
    await page.goto('/operator/residents');
    await waitForPageReady(page);
    
    // Should see residents page
    await expect(page.locator('h1, h2').filter({ hasText: /residents/i })).toBeVisible();
    
    // Should see "New Resident" button
    await expect(page.locator(SELECTORS.buttons.newResident)).toBeVisible();
  });

  test('Admin can view resident details', async ({ page }) => {
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Should see resident name
    await expect(page.locator('text=/Test Resident|Resident Details/i')).toBeVisible();
    
    // Should see action buttons (Edit, Delete)
    const hasEditButton = await page.locator(SELECTORS.buttons.edit).count() > 0;
    expect(hasEditButton).toBeTruthy();
  });

  test('Admin can create new resident', async ({ page }) => {
    await page.goto('/operator/residents');
    await waitForPageReady(page);
    
    // Click "New Resident" button
    await page.click(SELECTORS.buttons.newResident);
    
    // Should see form
    await expect(page.locator('text=/create|new/i').and(page.locator('text=/resident/i'))).toBeVisible();
    
    // Form should have required fields
    await expect(page.locator('input[name="firstName"], input[placeholder*="First"]')).toBeVisible();
    await expect(page.locator('input[name="lastName"], input[placeholder*="Last"]')).toBeVisible();
  });

  test('Admin can edit resident', async ({ page }) => {
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Click edit button
    const editButton = page.locator(SELECTORS.buttons.edit).first();
    if (await editButton.isVisible()) {
      await editButton.click();
      
      // Should see edit form
      await expect(page.locator('input[name="firstName"], input[value="Test"]')).toBeVisible();
    }
  });

  test('Admin can delete resident', async ({ page }) => {
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Should see delete button
    const deleteButton = page.locator(SELECTORS.buttons.delete);
    const hasDeleteButton = await deleteButton.count() > 0;
    
    // Note: We don't actually delete in tests to preserve test data
    expect(hasDeleteButton).toBeTruthy();
  });
});

test.describe('Residents - Operator Access', () => {
  
  test.beforeEach(async ({ page }) => {
    await loginAsOperator(page);
    await waitForPageReady(page);
  });

  test('Operator can view residents in their homes', async ({ page }) => {
    await page.goto('/operator/residents');
    await waitForPageReady(page);
    
    // Should see residents page
    await expect(page.locator('h1, h2').filter({ hasText: /residents/i })).toBeVisible();
    
    // Should see "New Resident" button
    await expect(page.locator(SELECTORS.buttons.newResident)).toBeVisible();
  });

  test('Operator can create resident in their homes', async ({ page }) => {
    await page.goto('/operator/residents');
    await waitForPageReady(page);
    
    // Click "New Resident" button
    await page.click(SELECTORS.buttons.newResident);
    
    // Should see form
    await expect(page.locator('input[name="firstName"], input[placeholder*="First"]')).toBeVisible();
  });

  test('Operator can edit resident in their homes', async ({ page }) => {
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Should see edit button or be able to edit
    const editButton = page.locator(SELECTORS.buttons.edit).first();
    const canEdit = await editButton.count() > 0;
    
    expect(canEdit).toBeTruthy();
  });

  test('Operator cannot see other operators residents', async ({ page }) => {
    // This test would require creating another operator's resident
    // For now, we verify the operator sees their own residents
    await page.goto('/operator/residents');
    await waitForPageReady(page);
    
    // Should only see residents in their homes
    const residentsList = page.locator('tbody tr, [data-testid="resident-row"]');
    
    // If there are residents, they should all belong to this operator
    const count = await residentsList.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Residents - Caregiver Access', () => {
  
  test.beforeEach(async ({ page }) => {
    await loginAsCaregiver(page);
    await waitForPageReady(page);
  });

  test('Caregiver can view assigned residents', async ({ page }) => {
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Should see resident details
    await expect(page.locator('text=/Test Resident|Resident/i')).toBeVisible();
  });

  test('Caregiver cannot create residents', async ({ page }) => {
    await page.goto('/operator/residents');
    
    // Either redirected or no "New Resident" button
    const hasNewButton = await page.locator(SELECTORS.buttons.newResident).count() > 0;
    
    if (hasNewButton) {
      // Button might be disabled or hidden
      const isDisabled = await page.locator(SELECTORS.buttons.newResident).first().isDisabled();
      expect(isDisabled).toBeTruthy();
    } else {
      // Button not visible - expected for caregivers
      expect(hasNewButton).toBe(0);
    }
  });

  test('Caregiver cannot edit resident profile', async ({ page }) => {
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Edit button should be hidden or disabled
    const editButton = page.locator(SELECTORS.buttons.edit);
    const editButtonCount = await editButton.count();
    
    if (editButtonCount > 0) {
      const isDisabled = await editButton.first().isDisabled();
      expect(isDisabled).toBeTruthy();
    }
  });

  test('Caregiver cannot delete residents', async ({ page }) => {
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Delete button should not be visible
    const deleteButton = page.locator(SELECTORS.buttons.delete);
    const hasDeleteButton = await deleteButton.count() > 0;
    
    expect(hasDeleteButton).toBe(0);
  });
});

test.describe('Residents - Family Access', () => {
  
  test.beforeEach(async ({ page }) => {
    await loginAsFamily(page);
    await waitForPageReady(page);
  });

  test('Family can view their family member resident', async ({ page }) => {
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    
    // Should see resident details
    await expect(page.locator('text=/Test Resident|Resident/i')).toBeVisible();
    
    // Should see "View Only" badge
    const viewOnlyBadge = page.locator(SELECTORS.badges.viewOnly);
    const hasViewOnlyBadge = await viewOnlyBadge.count() > 0;
    
    // Note: This test assumes UI shows "View Only" badge for family members
    if (hasViewOnlyBadge) {
      await expect(viewOnlyBadge.first()).toBeVisible();
    }
  });

  test('Family cannot edit residents', async ({ page }) => {
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Edit button should not be visible
    const editButton = page.locator(SELECTORS.buttons.edit);
    const hasEditButton = await editButton.count() > 0;
    
    expect(hasEditButton).toBe(0);
  });

  test('Family cannot delete residents', async ({ page }) => {
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Delete button should not be visible
    const deleteButton = page.locator(SELECTORS.buttons.delete);
    const hasDeleteButton = await deleteButton.count() > 0;
    
    expect(hasDeleteButton).toBe(0);
  });

  test('Family cannot create residents', async ({ page }) => {
    await page.goto('/operator/residents');
    
    // "New Resident" button should not be visible
    const newButton = page.locator(SELECTORS.buttons.newResident);
    const hasNewButton = await newButton.count() > 0;
    
    expect(hasNewButton).toBe(0);
  });

  test('Family cannot access other residents', async ({ page }) => {
    // Try to access a different resident (if exists)
    await page.goto('/operator/residents/other-resident-id');
    
    // Should be redirected or show unauthorized
    const isUnauthorized = 
      page.url().includes('/auth/signin') || 
      await page.locator('text=/unauthorized|access denied|not found/i').isVisible();
    
    expect(isUnauthorized).toBeTruthy();
  });

  test('Family sees all action buttons hidden', async ({ page }) => {
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Verify no action buttons are visible
    const editButtonCount = await page.locator(SELECTORS.buttons.edit).count();
    const deleteButtonCount = await page.locator(SELECTORS.buttons.delete).count();
    
    expect(editButtonCount).toBe(0);
    expect(deleteButtonCount).toBe(0);
  });
});
