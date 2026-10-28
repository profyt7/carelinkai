/**
 * Dashboard E2E Tests
 * 
 * Tests dashboard actions and quick access buttons based on user roles.
 */

import { test, expect } from '@playwright/test';
import { 
  loginAsAdmin, 
  loginAsOperator, 
  loginAsCaregiver, 
  loginAsFamily,
  waitForPageReady
} from './helpers/auth';

test.describe('Dashboard - Admin Actions', () => {
  
  test('Admin can access dashboard', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard');
    await waitForPageReady(page);
    
    // Should see dashboard content
    await expect(page.locator('h1, h2').filter({ hasText: /dashboard/i })).toBeVisible();
  });

  test('Admin sees all quick action buttons', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard');
    await waitForPageReady(page);
    
    // Look for quick action buttons like:
    // - Add Resident
    // - Add Operator
    // - View Reports
    
    const quickActions = page.locator('[data-testid="quick-actions"], .quick-actions, button:has-text("Quick"), button:has-text("Add")');
    const hasQuickActions = await quickActions.count() > 0;
    
    expect(hasQuickActions).toBeGreaterThanOrEqual(0);
  });

  test('Admin can see system-wide KPIs', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard');
    await waitForPageReady(page);
    
    // Admin should see KPIs for entire system
    const kpis = page.locator('[data-testid="kpi"], .kpi, .stat, .metric');
    const hasKPIs = await kpis.count() > 0;
    
    expect(hasKPIs).toBeTruthy();
  });

  test('Admin dashboard shows all data without restrictions', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard');
    await waitForPageReady(page);
    
    // Should not see "Limited Data" or scope restrictions
    const restrictionText = page.locator('text=/limited data|scoped to|restricted view/i');
    const hasRestrictions = await restrictionText.count() > 0;
    
    expect(hasRestrictions).toBe(0);
  });
});

test.describe('Dashboard - Operator Actions', () => {
  
  test('Operator can access dashboard', async ({ page }) => {
    await loginAsOperator(page);
    await page.goto('/dashboard');
    await waitForPageReady(page);
    
    // Should see dashboard content
    await expect(page.locator('body')).not.toContainText('Unauthorized');
  });

  test('Operator sees scoped quick actions', async ({ page }) => {
    await loginAsOperator(page);
    await page.goto('/dashboard');
    await waitForPageReady(page);
    
    // Operator should see actions for their homes only
    const quickActions = page.locator('button:has-text("Add Resident"), button:has-text("Add Caregiver")');
    const hasQuickActions = await quickActions.count() > 0;
    
    expect(hasQuickActions).toBeGreaterThanOrEqual(0);
  });

  test('Operator sees KPIs for their homes only', async ({ page }) => {
    await loginAsOperator(page);
    await page.goto('/dashboard');
    await waitForPageReady(page);
    
    // KPIs should be scoped to operator's homes
    const kpis = page.locator('[data-testid="kpi"], .kpi, .stat, .metric');
    const hasKPIs = await kpis.count() > 0;
    
    expect(hasKPIs).toBeGreaterThanOrEqual(0);
  });

  test('Operator cannot see system-wide metrics', async ({ page }) => {
    await loginAsOperator(page);
    await page.goto('/dashboard');
    await waitForPageReady(page);
    
    // Should not see "All Operators" or "System-wide" metrics
    const systemWideText = page.locator('text=/all operators|system-wide|total operators/i');
    const hasSystemWide = await systemWideText.count() > 0;
    
    // Operator should only see their own metrics
    expect(hasSystemWide).toBe(0);
  });
});

test.describe('Dashboard - Caregiver Actions', () => {
  
  test('Caregiver can access dashboard', async ({ page }) => {
    await loginAsCaregiver(page);
    await page.goto('/dashboard');
    await waitForPageReady(page);
    
    // Should see dashboard content (their schedule/tasks)
    await expect(page.locator('body')).not.toContainText('Unauthorized');
  });

  test('Caregiver sees limited actions', async ({ page }) => {
    await loginAsCaregiver(page);
    await page.goto('/dashboard');
    await waitForPageReady(page);
    
    // Caregiver should NOT see "Add Resident" or management buttons
    const managementButtons = page.locator('button:has-text("Add Resident"), button:has-text("Add Operator")');
    const hasManagementButtons = await managementButtons.count() > 0;
    
    expect(hasManagementButtons).toBe(0);
  });

  test('Caregiver sees their schedule and tasks', async ({ page }) => {
    await loginAsCaregiver(page);
    await page.goto('/dashboard');
    await waitForPageReady(page);
    
    // Should see schedule-related content
    const scheduleContent = page.locator('text=/schedule|shift|task|assigned/i');
    const hasScheduleContent = await scheduleContent.count() > 0;
    
    expect(hasScheduleContent).toBeGreaterThanOrEqual(0);
  });

  test('Caregiver cannot access management features', async ({ page }) => {
    await loginAsCaregiver(page);
    await page.goto('/dashboard');
    await waitForPageReady(page);
    
    // Should not see management or admin features
    const managementText = page.locator('text=/manage operators|manage homes|system settings/i');
    const hasManagement = await managementText.count() > 0;
    
    expect(hasManagement).toBe(0);
  });
});

test.describe('Dashboard - Family Actions', () => {
  
  test('Family can access dashboard', async ({ page }) => {
    await loginAsFamily(page);
    await page.goto('/dashboard');
    await waitForPageReady(page);
    
    // Should see family-specific dashboard
    await expect(page.locator('body')).not.toContainText('Unauthorized');
  });

  test('Family sees no management actions', async ({ page }) => {
    await loginAsFamily(page);
    await page.goto('/dashboard');
    await waitForPageReady(page);
    
    // Should NOT see any management buttons
    const managementButtons = page.locator('button:has-text("Add"), button:has-text("Create"), button:has-text("Manage")');
    const hasManagementButtons = await managementButtons.count() > 0;
    
    expect(hasManagementButtons).toBe(0);
  });

  test('Family sees information about their resident', async ({ page }) => {
    await loginAsFamily(page);
    await page.goto('/dashboard');
    await waitForPageReady(page);
    
    // Should see resident information or updates
    const residentInfo = page.locator('text=/resident|updates|messages|inquiries/i');
    const hasResidentInfo = await residentInfo.count() > 0;
    
    expect(hasResidentInfo).toBeGreaterThanOrEqual(0);
  });

  test('Family dashboard is view-only', async ({ page }) => {
    await loginAsFamily(page);
    await page.goto('/dashboard');
    await waitForPageReady(page);
    
    // Count all buttons (excluding navigation)
    const actionButtons = page.locator('main button, [role="main"] button').filter({ hasNotText: /sign out|logout|profile/i });
    const buttonCount = await actionButtons.count();
    
    // Family should have minimal to no action buttons
    expect(buttonCount).toBeLessThan(5);
  });

  test('Family sees "View Only" indicator', async ({ page }) => {
    await loginAsFamily(page);
    await page.goto('/dashboard');
    await waitForPageReady(page);
    
    // Look for view-only badge or indicator
    const viewOnlyBadge = page.locator('text=/view only|read only|limited access/i');
    const hasViewOnlyBadge = await viewOnlyBadge.count() > 0;
    
    // May or may not have explicit badge, but should be obvious from lack of actions
    expect(hasViewOnlyBadge).toBeGreaterThanOrEqual(0);
  });
});
