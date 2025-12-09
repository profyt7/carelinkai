/**
 * Authentication E2E Tests
 * 
 * Tests authentication functionality for all user roles.
 */

import { test, expect } from '@playwright/test';
import { 
  TEST_USERS, 
  login, 
  loginAsAdmin, 
  loginAsOperator, 
  loginAsCaregiver, 
  loginAsFamily,
  logout,
  isAuthenticated,
  waitForPageReady
} from './helpers/auth';

test.describe('Authentication', () => {
  
  test('should display login page', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // Check for login form elements
    await expect(page.locator('h1, h2').filter({ hasText: /sign in/i })).toBeVisible();
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should reject invalid credentials', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // Try to login with invalid credentials
    await page.fill('input[type="email"], input[name="email"]', 'invalid@example.com');
    await page.fill('input[type="password"], input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('text=/invalid|incorrect|error/i')).toBeVisible({ timeout: 5000 });
  });

  test('should login as Admin', async ({ page }) => {
    await loginAsAdmin(page);
    await waitForPageReady(page);
    
    // Verify successful login
    expect(await isAuthenticated(page)).toBeTruthy();
    
    // Verify redirect to appropriate page (dashboard or operator page)
    expect(page.url()).not.toContain('/auth/signin');
  });

  test('should login as Operator', async ({ page }) => {
    await loginAsOperator(page);
    await waitForPageReady(page);
    
    // Verify successful login
    expect(await isAuthenticated(page)).toBeTruthy();
    expect(page.url()).not.toContain('/auth/signin');
  });

  test('should login as Caregiver', async ({ page }) => {
    await loginAsCaregiver(page);
    await waitForPageReady(page);
    
    // Verify successful login
    expect(await isAuthenticated(page)).toBeTruthy();
    expect(page.url()).not.toContain('/auth/signin');
  });

  test('should login as Family', async ({ page }) => {
    await loginAsFamily(page);
    await waitForPageReady(page);
    
    // Verify successful login
    expect(await isAuthenticated(page)).toBeTruthy();
    expect(page.url()).not.toContain('/auth/signin');
  });

  test('should maintain session on page reload', async ({ page }) => {
    await loginAsOperator(page);
    await waitForPageReady(page);
    
    // Reload the page
    await page.reload();
    await waitForPageReady(page);
    
    // Should still be authenticated
    expect(await isAuthenticated(page)).toBeTruthy();
  });

  test('should logout successfully', async ({ page }) => {
    await loginAsOperator(page);
    await waitForPageReady(page);
    
    // Logout
    await logout(page);
    
    // Should be redirected to signin or home page
    await page.waitForURL((url) => 
      url.pathname.includes('/auth/signin') || url.pathname === '/'
    );
  });

  test('should redirect to login when accessing protected route without auth', async ({ page }) => {
    // Try to access protected route without authentication
    await page.goto('/operator/residents');
    
    // Should redirect to signin page
    await page.waitForURL((url) => url.pathname.includes('/auth/signin'));
  });
});

test.describe('Role Verification After Login', () => {
  
  test('Admin should have access to admin features', async ({ page }) => {
    await loginAsAdmin(page);
    await waitForPageReady(page);
    
    // Navigate to operator management (admin-only)
    await page.goto('/operator');
    
    // Should see operator management page without errors
    await expect(page.locator('h1, h2').filter({ hasText: /operator/i })).toBeVisible();
  });

  test('Operator should have access to operator dashboard', async ({ page }) => {
    await loginAsOperator(page);
    await waitForPageReady(page);
    
    // Navigate to operator dashboard
    await page.goto('/operator');
    
    // Should see dashboard
    await expect(page.locator('body')).not.toContainText('Unauthorized');
  });

  test('Family should only see family dashboard', async ({ page }) => {
    await loginAsFamily(page);
    await waitForPageReady(page);
    
    // Try to access operator page
    await page.goto('/operator');
    
    // Should be redirected or show unauthorized
    // This depends on your implementation - adjust accordingly
    const isUnauthorized = 
      page.url().includes('/auth/signin') || 
      await page.locator('text=/unauthorized|access denied|forbidden/i').isVisible();
    
    expect(isUnauthorized).toBeTruthy();
  });
});
