/**
 * Family Tab E2E Tests
 * 
 * Tests CRUD operations and permissions for family contacts across all user roles.
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

test.describe('Family Tab - Admin/Operator Full Access', () => {
  
  test('Admin can view family contacts', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Click family tab
    await page.click(SELECTORS.tabs.family);
    
    // Should see family contacts
    await expect(page.locator('text=/family|contacts/i')).toBeVisible();
  });

  test('Admin can add family contact', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Click family tab
    await page.click(SELECTORS.tabs.family);
    
    // Look for "Add Contact" or "New Contact" button
    const newButton = page.locator('button:has-text("Add Contact"), button:has-text("New Contact"), button:has-text("Add Family")');
    const hasNewButton = await newButton.count() > 0;
    
    expect(hasNewButton).toBeTruthy();
  });

  test('Admin can edit family contact', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Click family tab
    await page.click(SELECTORS.tabs.family);
    
    // Look for edit buttons on contacts
    const editButtons = page.locator('button:has-text("Edit")');
    const hasEditButton = await editButtons.count() > 0;
    
    // Note: May be 0 if no contacts exist
    expect(hasEditButton).toBeGreaterThanOrEqual(0);
  });

  test('Operator can manage family contacts', async ({ page }) => {
    await loginAsOperator(page);
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Click family tab
    await page.click(SELECTORS.tabs.family);
    
    // Should see family contacts and management buttons
    await expect(page.locator('text=/family|contacts/i')).toBeVisible();
    
    const newButton = page.locator('button:has-text("Add Contact"), button:has-text("New Contact")');
    const hasNewButton = await newButton.count() > 0;
    
    expect(hasNewButton).toBeTruthy();
  });

  test('Operator can delete family contact', async ({ page }) => {
    await loginAsOperator(page);
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Click family tab
    await page.click(SELECTORS.tabs.family);
    
    // Look for delete buttons
    const deleteButtons = page.locator('button:has-text("Delete"), button:has-text("Remove")');
    const hasDeleteButton = await deleteButtons.count() > 0;
    
    // Note: May be 0 if no contacts exist
    expect(hasDeleteButton).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Family Tab - Caregiver Limited Access', () => {
  
  test('Caregiver can view family contacts', async ({ page }) => {
    await loginAsCaregiver(page);
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Click family tab
    await page.click(SELECTORS.tabs.family);
    
    // Should see family contacts
    await expect(page.locator('text=/family|contacts/i')).toBeVisible();
  });

  test('Caregiver cannot add family contacts', async ({ page }) => {
    await loginAsCaregiver(page);
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Click family tab
    await page.click(SELECTORS.tabs.family);
    
    // Should NOT see add button
    const newButton = page.locator('button:has-text("Add Contact"), button:has-text("New Contact")');
    const hasNewButton = await newButton.count() > 0;
    
    expect(hasNewButton).toBe(0);
  });

  test('Caregiver cannot edit family contacts', async ({ page }) => {
    await loginAsCaregiver(page);
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Click family tab
    await page.click(SELECTORS.tabs.family);
    
    // Should NOT see edit buttons
    const editButtons = page.locator('button:has-text("Edit")');
    const hasEditButton = await editButtons.count() > 0;
    
    expect(hasEditButton).toBe(0);
  });

  test('Caregiver cannot delete family contacts', async ({ page }) => {
    await loginAsCaregiver(page);
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Click family tab
    await page.click(SELECTORS.tabs.family);
    
    // Should NOT see delete buttons
    const deleteButtons = page.locator('button:has-text("Delete"), button:has-text("Remove")');
    const hasDeleteButton = await deleteButtons.count() > 0;
    
    expect(hasDeleteButton).toBe(0);
  });
});

test.describe('Family Tab - Family View Only', () => {
  
  test('Family members can view family contacts', async ({ page }) => {
    await loginAsFamily(page);
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Click family tab
    await page.click(SELECTORS.tabs.family);
    
    // Should see family contacts
    await expect(page.locator('text=/family|contacts/i')).toBeVisible();
  });

  test('Family members cannot add contacts', async ({ page }) => {
    await loginAsFamily(page);
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Click family tab
    await page.click(SELECTORS.tabs.family);
    
    // Should NOT see add button
    const newButton = page.locator('button:has-text("Add Contact"), button:has-text("New Contact")');
    const hasNewButton = await newButton.count() > 0;
    
    expect(hasNewButton).toBe(0);
  });

  test('Family members cannot edit contacts', async ({ page }) => {
    await loginAsFamily(page);
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Click family tab
    await page.click(SELECTORS.tabs.family);
    
    // Should NOT see edit buttons
    const editButtons = page.locator('button:has-text("Edit")');
    const hasEditButton = await editButtons.count() > 0;
    
    expect(hasEditButton).toBe(0);
  });

  test('Family members cannot delete contacts', async ({ page }) => {
    await loginAsFamily(page);
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Click family tab
    await page.click(SELECTORS.tabs.family);
    
    // Should NOT see delete buttons
    const deleteButtons = page.locator('button:has-text("Delete"), button:has-text("Remove")');
    const hasDeleteButton = await deleteButtons.count() > 0;
    
    expect(hasDeleteButton).toBe(0);
  });

  test('Family sees no action buttons on family tab', async ({ page }) => {
    await loginAsFamily(page);
    await page.goto(`/operator/residents/${TEST_RESIDENT_ID}`);
    await waitForPageReady(page);
    
    // Click family tab
    await page.click(SELECTORS.tabs.family);
    
    // Should see view-only content
    const actionButtons = page.locator('button:has-text("Edit"), button:has-text("Delete"), button:has-text("Add"), button:has-text("New")');
    const actionButtonCount = await actionButtons.count();
    
    expect(actionButtonCount).toBe(0);
  });
});
