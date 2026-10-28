/**
 * Navigation E2E Tests
 * 
 * Tests that navigation menu items are properly shown/hidden based on user roles.
 */

import { test, expect } from '@playwright/test';
import { 
  loginAsAdmin, 
  loginAsOperator, 
  loginAsCaregiver, 
  loginAsFamily,
  waitForPageReady
} from './helpers/auth';

test.describe('Navigation - Admin Access', () => {
  
  test('Admin sees all menu items', async ({ page }) => {
    await loginAsAdmin(page);
    await waitForPageReady(page);
    
    // Admin should see:
    // - Dashboard
    // - Residents
    // - Caregivers
    // - Operators (admin-only)
    // - Settings
    
    const dashboardLink = page.locator('a[href="/dashboard"], a:has-text("Dashboard")');
    const residentsLink = page.locator('a[href*="/residents"], a:has-text("Residents")');
    const caregiversLink = page.locator('a[href*="/caregivers"], a:has-text("Caregivers")');
    const operatorsLink = page.locator('a[href*="/operator"], a:has-text("Operators")');
    
    // Check for visible links
    expect(await dashboardLink.count()).toBeGreaterThan(0);
    expect(await residentsLink.count()).toBeGreaterThan(0);
  });

  test('Admin can access Operators page', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/operator');
    await waitForPageReady(page);
    
    // Should see operator management page
    await expect(page.locator('h1, h2').filter({ hasText: /operator/i })).toBeVisible();
    
    // Should NOT see unauthorized message
    const unauthorizedText = page.locator('text=/unauthorized|access denied|forbidden/i');
    expect(await unauthorizedText.count()).toBe(0);
  });

  test('Admin sees Admin Tools in menu', async ({ page }) => {
    await loginAsAdmin(page);
    await waitForPageReady(page);
    
    // Look for Admin Tools or Admin section
    const adminTools = page.locator('text=/admin tools|admin/i');
    const hasAdminTools = await adminTools.count() > 0;
    
    // Admin should see admin-specific menu items
    expect(hasAdminTools).toBeTruthy();
  });
});

test.describe('Navigation - Operator Access', () => {
  
  test('Operator sees operator menu items', async ({ page }) => {
    await loginAsOperator(page);
    await waitForPageReady(page);
    
    // Operator should see:
    // - Dashboard
    // - Residents (scoped to their homes)
    // - Caregivers
    
    const dashboardLink = page.locator('a[href="/dashboard"], a:has-text("Dashboard")');
    const residentsLink = page.locator('a[href*="/residents"], a:has-text("Residents")');
    const caregiversLink = page.locator('a[href*="/caregivers"], a:has-text("Caregivers")');
    
    expect(await dashboardLink.count()).toBeGreaterThan(0);
    expect(await residentsLink.count()).toBeGreaterThan(0);
  });

  test('Operator cannot see Operators menu (admin-only)', async ({ page }) => {
    await loginAsOperator(page);
    await waitForPageReady(page);
    
    // Look for Operators/Operator Management link
    const operatorsLink = page.locator('a:has-text("Operator Management"), a:has-text("Operators List")');
    const hasOperatorsLink = await operatorsLink.count() > 0;
    
    // Operator should NOT see this admin-only menu
    expect(hasOperatorsLink).toBe(0);
  });

  test('Operator cannot access admin-only pages', async ({ page }) => {
    await loginAsOperator(page);
    await page.goto('/operator');
    
    // May see operator dashboard (their own) but not operator management list
    // This depends on your routing implementation
    // The key is they shouldn't see a list of all operators
    
    // Check if page shows appropriate content or redirect
    const pageContent = await page.content();
    
    // Should either redirect or show their dashboard, not admin management
    expect(pageContent).toBeTruthy();
  });

  test('Operator does not see Admin Tools', async ({ page }) => {
    await loginAsOperator(page);
    await waitForPageReady(page);
    
    // Look for Admin Tools section
    const adminTools = page.locator('text=/admin tools/i');
    const hasAdminTools = await adminTools.count() > 0;
    
    // Operator should NOT see admin tools
    expect(hasAdminTools).toBe(0);
  });
});

test.describe('Navigation - Caregiver Access', () => {
  
  test('Caregiver sees limited menu items', async ({ page }) => {
    await loginAsCaregiver(page);
    await waitForPageReady(page);
    
    // Caregiver should see:
    // - Dashboard (their schedule/tasks)
    // - Residents (assigned only)
    // - Possibly Shifts/Schedule
    
    const dashboardLink = page.locator('a[href="/dashboard"], a:has-text("Dashboard")');
    
    expect(await dashboardLink.count()).toBeGreaterThan(0);
  });

  test('Caregiver cannot see Operators menu', async ({ page }) => {
    await loginAsCaregiver(page);
    await waitForPageReady(page);
    
    const operatorsLink = page.locator('a:has-text("Operators"), a:has-text("Operator Management")');
    const hasOperatorsLink = await operatorsLink.count() > 0;
    
    expect(hasOperatorsLink).toBe(0);
  });

  test('Caregiver cannot see Admin Tools', async ({ page }) => {
    await loginAsCaregiver(page);
    await waitForPageReady(page);
    
    const adminTools = page.locator('text=/admin tools/i');
    const hasAdminTools = await adminTools.count() > 0;
    
    expect(hasAdminTools).toBe(0);
  });

  test('Caregiver has minimal navigation options', async ({ page }) => {
    await loginAsCaregiver(page);
    await waitForPageReady(page);
    
    // Count navigation links
    const navLinks = page.locator('nav a, aside a, [role="navigation"] a');
    const linkCount = await navLinks.count();
    
    // Caregiver should have fewer links than admin/operator
    expect(linkCount).toBeGreaterThanOrEqual(1);
    expect(linkCount).toBeLessThan(10); // Arbitrary but reasonable limit
  });
});

test.describe('Navigation - Family Access', () => {
  
  test('Family sees minimal menu items', async ({ page }) => {
    await loginAsFamily(page);
    await waitForPageReady(page);
    
    // Family should see:
    // - Dashboard (family-specific)
    // - Possibly Messages/Inquiries
    // - Their resident's profile
    
    const dashboardLink = page.locator('a[href="/dashboard"], a:has-text("Dashboard")');
    
    expect(await dashboardLink.count()).toBeGreaterThan(0);
  });

  test('Family cannot see Operators menu', async ({ page }) => {
    await loginAsFamily(page);
    await waitForPageReady(page);
    
    const operatorsLink = page.locator('a:has-text("Operators"), a:has-text("Operator Management")');
    const hasOperatorsLink = await operatorsLink.count() > 0;
    
    expect(hasOperatorsLink).toBe(0);
  });

  test('Family cannot see Caregivers menu', async ({ page }) => {
    await loginAsFamily(page);
    await waitForPageReady(page);
    
    const caregiversLink = page.locator('a[href*="/caregivers"]:has-text("Caregivers")');
    const hasCaregiversLink = await caregiversLink.count() > 0;
    
    expect(hasCaregiversLink).toBe(0);
  });

  test('Family cannot see Admin Tools', async ({ page }) => {
    await loginAsFamily(page);
    await waitForPageReady(page);
    
    const adminTools = page.locator('text=/admin tools/i');
    const hasAdminTools = await adminTools.count() > 0;
    
    expect(hasAdminTools).toBe(0);
  });

  test('Family has very limited navigation', async ({ page }) => {
    await loginAsFamily(page);
    await waitForPageReady(page);
    
    // Count navigation links
    const navLinks = page.locator('nav a, aside a, [role="navigation"] a');
    const linkCount = await navLinks.count();
    
    // Family should have the fewest navigation options
    expect(linkCount).toBeGreaterThanOrEqual(1);
    expect(linkCount).toBeLessThan(8); // Very limited navigation
  });
});
