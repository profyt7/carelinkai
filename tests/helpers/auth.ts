/**
 * Authentication Helpers for Playwright E2E Tests
 * 
 * Provides utilities for logging in as different user roles and managing auth state.
 */

import { Page, expect } from '@playwright/test';

export interface TestUser {
  email: string;
  password: string;
  role: 'ADMIN' | 'OPERATOR' | 'CAREGIVER' | 'FAMILY';
  name: string;
}

export const TEST_USERS: Record<string, TestUser> = {
  ADMIN: {
    email: 'demo.admin@carelinkai.test',
    password: 'DemoUser123!',
    role: 'ADMIN',
    name: 'Demo Admin',
  },
  OPERATOR: {
    email: 'demo.operator@carelinkai.test',
    password: 'DemoUser123!',
    role: 'OPERATOR',
    name: 'Demo Operator',
  },
  CAREGIVER: {
    email: 'demo.aide@carelinkai.test',
    password: 'DemoUser123!',
    role: 'CAREGIVER',
    name: 'Demo Aide',
  },
  FAMILY: {
    email: 'demo.family@carelinkai.test',
    password: 'DemoUser123!',
    role: 'FAMILY',
    name: 'Demo Family',
  },
};

/**
 * Log in as a specific test user
 */
export async function login(page: Page, user: TestUser): Promise<void> {
  await page.goto('/auth/login');
  
  // Wait for page to be fully loaded
  await page.waitForLoadState('networkidle');
  
  // Wait for the sign-in page to load
  await expect(page.locator('h1, h2').filter({ hasText: /sign in|login/i })).toBeVisible();
  
  // Fill in credentials using specific ID selectors
  await page.fill('#email', user.email);
  await page.fill('#password', user.password);
  
  // Add small delay before submission to ensure form is ready
  await page.waitForTimeout(500);
  
  // Click sign in button
  await page.click('button[type="submit"]');
  
  // Wait for successful login (redirect away from login page)
  await page.waitForURL((url) => !url.pathname.includes('/auth/login'), {
    timeout: 15000,
  });
  
  // Wait for page to settle after navigation
  await page.waitForLoadState('networkidle');
  
  // Verify we're logged in by checking for user name or dashboard elements
  await expect(page.locator('body')).not.toContainText('Sign In');
}

/**
 * Log in as admin
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await login(page, TEST_USERS.ADMIN);
}

/**
 * Log in as operator
 */
export async function loginAsOperator(page: Page): Promise<void> {
  await login(page, TEST_USERS.OPERATOR);
}

/**
 * Log in as caregiver
 */
export async function loginAsCaregiver(page: Page): Promise<void> {
  await login(page, TEST_USERS.CAREGIVER);
}

/**
 * Log in as family member
 */
export async function loginAsFamily(page: Page): Promise<void> {
  await login(page, TEST_USERS.FAMILY);
}

/**
 * Log out the current user
 */
export async function logout(page: Page): Promise<void> {
  // Look for user menu or logout button
  const userMenuButton = page.locator('button:has-text("Admin User"), button:has-text("Operator"), button:has-text("Caregiver"), button:has-text("Family"), [data-testid="user-menu"]').first();
  
  if (await userMenuButton.isVisible()) {
    await userMenuButton.click();
    
    // Click logout/sign out option
    await page.click('text=/sign out|logout/i');
  } else {
    // Alternative: direct navigation to signout
    await page.goto('/auth/signout');
    await page.click('button:has-text("Sign out")');
  }
  
  // Verify we're logged out
  await page.waitForURL((url) => url.pathname.includes('/auth/signin') || url.pathname === '/');
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  // Check for common authenticated indicators
  const authIndicators = [
    page.locator('[data-testid="user-menu"]'),
    page.locator('button:has-text("Demo Admin")'),
    page.locator('button:has-text("Demo Operator")'),
    page.locator('button:has-text("Demo Aide")'),
    page.locator('button:has-text("Demo Family")'),
    page.locator('button:has-text("Open user menu")'),
  ];
  
  for (const indicator of authIndicators) {
    if (await indicator.isVisible()) {
      return true;
    }
  }
  
  return false;
}

/**
 * Verify user role after login
 */
export async function verifyUserRole(page: Page, expectedRole: string): Promise<void> {
  // This depends on your UI showing role information
  // Adjust selectors based on actual implementation
  const roleIndicator = page.locator('[data-testid="user-role"], .user-role');
  
  if (await roleIndicator.isVisible()) {
    await expect(roleIndicator).toContainText(expectedRole, { ignoreCase: true });
  }
}

/**
 * Save authentication state for reuse
 */
export async function saveAuthState(page: Page, path: string): Promise<void> {
  await page.context().storageState({ path });
}

/**
 * Wait for page to be ready after login
 */
export async function waitForPageReady(page: Page): Promise<void> {
  // Wait for navigation to complete
  await page.waitForLoadState('networkidle');
  
  // Wait for common page elements
  await page.waitForSelector('main, [role="main"], .main-content', {
    timeout: 10000,
  });
}
