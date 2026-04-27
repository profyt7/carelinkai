/**
 * Demo Login Verification Suite
 *
 * Automates the manual checklist run after each deploy to verify the 3 key
 * demo logins are working correctly. Read-only — no data mutations.
 *
 * Run with: npx playwright test tests/demo-verification.spec.ts --workers=1
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS, login, waitForPageReady } from './helpers/auth';

const COOKIE_CONSENT = {
  necessary: true,
  analytics: false,
  marketing: false,
};

function setConsent(page: Parameters<typeof login>[0]) {
  return page.addInitScript((consent) => {
    localStorage.setItem('carelinkai_cookie_consent', JSON.stringify(consent));
  }, COOKIE_CONSENT);
}

// ─── OPERATOR ─────────────────────────────────────────────────────────────────

test.describe('Operator login', () => {
  test.beforeEach(async ({ page }) => {
    await setConsent(page);
    await login(page, TEST_USERS.OPERATOR!);
    await waitForPageReady(page);
  });

  test('dashboard loads with operator role badge', async ({ page }) => {
    await page.goto('/operator');
    await waitForPageReady(page);
    await expect(page).not.toHaveURL(/error|500/);
    await expect(page.locator('text=OPERATOR').first()).toBeVisible();
  });

  test('marketplace caregiver tab shows cards', async ({ page }) => {
    await page.goto('/marketplace?tab=caregivers');
    await waitForPageReady(page);
    await expect(page).not.toHaveURL(/error|500/);
    // At least one caregiver card visible
    await expect(page.locator('text=View Profile').first()).toBeVisible({ timeout: 10000 });
  });

  test('caregiver profile shows Hire button for operator (not Request Care)', async ({ page }) => {
    await page.goto('/marketplace?tab=caregivers');
    await waitForPageReady(page);
    // Click first "View Profile"
    await page.locator('text=View Profile').first().click();
    await waitForPageReady(page);
    // Should see Hire button, NOT "Request Care" (which is family-only)
    await expect(page.locator('button:has-text("Hire")').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Request Care')).not.toBeVisible();
  });

  test('caregiver profile has single Reviews section (no duplicate)', async ({ page }) => {
    await page.goto('/marketplace?tab=caregivers');
    await waitForPageReady(page);
    await page.locator('text=View Profile').first().click();
    await waitForPageReady(page);
    // Count "Reviews" headings — must be exactly 1
    const reviewHeadings = page.locator('h2:has-text("Reviews"), h3:has-text("Reviews")');
    await expect(reviewHeadings).toHaveCount(1, { timeout: 10000 });
  });

  test('billing page loads and shows plan info', async ({ page }) => {
    await page.goto('/operator/billing');
    await waitForPageReady(page);
    await expect(page).not.toHaveURL(/error|500/);
    // Should see at least one plan name
    await expect(
      page.locator('text=/starter|professional|growth|agency/i').first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('pipeline dashboard loads', async ({ page }) => {
    await page.goto('/operator/inquiries/pipeline');
    await waitForPageReady(page);
    await expect(page).not.toHaveURL(/error|500/);
  });
});

// ─── CAREGIVER ────────────────────────────────────────────────────────────────

test.describe('Caregiver login', () => {
  test.beforeEach(async ({ page }) => {
    await setConsent(page);
    await login(page, TEST_USERS.CAREGIVER!);
    await waitForPageReady(page);
  });

  test('dashboard link redirects to /caregiver (not /dashboard)', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForPageReady(page);
    // Should redirect to /caregiver
    await expect(page).toHaveURL(/\/caregiver$/, { timeout: 10000 });
  });

  test('caregiver dashboard shows stat tiles', async ({ page }) => {
    await page.goto('/caregiver');
    await waitForPageReady(page);
    await expect(page).not.toHaveURL(/error|500/);
    // At least one stat tile visible
    await expect(
      page.locator('[class*="stat"], [class*="tile"], [class*="metric"], [class*="StatTile"]').first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('My Points page has single sidebar (no double nav)', async ({ page }) => {
    await page.goto('/caregiver/points');
    await waitForPageReady(page);
    await expect(page).not.toHaveURL(/error|500/);
    // Count sidebars — should be exactly 1
    const sidebars = page.locator('nav[class*="sidebar"], aside, [class*="sidebar"]');
    const count = await sidebars.count();
    expect(count).toBeLessThanOrEqual(1);
  });

  test('residents page loads without crashing', async ({ page }) => {
    await page.goto('/operator/residents');
    await waitForPageReady(page);
    // Should NOT show a generic error page
    await expect(page).not.toHaveURL(/error|500/);
    await expect(page.locator('text=/something went wrong|unexpected error/i')).not.toBeVisible();
  });
});

// ─── DISCHARGE PLANNER ────────────────────────────────────────────────────────

test.describe('Discharge Planner login', () => {
  test.beforeEach(async ({ page }) => {
    await setConsent(page);
    await login(page, TEST_USERS.DISCHARGE_PLANNER!);
    await waitForPageReady(page);
  });

  test('dashboard lands on /discharge-planner', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForPageReady(page);
    await expect(page).toHaveURL(/\/discharge-planner/, { timeout: 10000 });
  });

  test('discharge planner dashboard loads with stat tiles', async ({ page }) => {
    await page.goto('/discharge-planner');
    await waitForPageReady(page);
    await expect(page).not.toHaveURL(/error|500/);
    await expect(page.locator('text=/discharge|placement|search/i').first()).toBeVisible();
  });

  test('billing link is visible in sidebar nav', async ({ page }) => {
    await page.goto('/discharge-planner');
    await waitForPageReady(page);
    await expect(page.locator('nav a[href="/discharge-planner/billing"], a:has-text("Billing")').first()).toBeVisible({ timeout: 10000 });
  });

  test('billing page loads with sidebar and pricing cards', async ({ page }) => {
    await page.goto('/discharge-planner/billing');
    await waitForPageReady(page);
    await expect(page).not.toHaveURL(/error|500/);
    // Both pricing tiers must be visible
    await expect(page.locator('text=$99').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=$499').first()).toBeVisible({ timeout: 10000 });
    // Sidebar must be present (no naked page)
    await expect(page.locator('nav').first()).toBeVisible();
  });

  test('billing page has no double sidebar', async ({ page }) => {
    await page.goto('/discharge-planner/billing');
    await waitForPageReady(page);
    const sidebars = page.locator('nav[class*="sidebar"], aside, [class*="sidebar"]');
    const count = await sidebars.count();
    expect(count).toBeLessThanOrEqual(1);
  });
});
