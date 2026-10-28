/**
 * Production Smoke Tests for CareLinkAI
 *
 * Lightweight, read-only tests designed to run against production after each deploy.
 * These tests do NOT create, mutate, or delete any data.
 *
 * Run with: npm run test:e2e:prod
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS, login, waitForPageReady } from './helpers/auth';

// ─── Infrastructure ───────────────────────────────────────────────────────────

test.describe('Infrastructure', () => {
  test('health endpoint returns ok', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.db).toBe('ok');
  });

  test('homepage is reachable', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/error|500/);
  });
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

test.describe('Auth', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('invalid credentials shows error', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[type="email"], input[name="email"]', 'nobody@example.com');
    await page.fill('input[type="password"], input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=/invalid|incorrect|error/i')).toBeVisible({ timeout: 8000 });
  });

  test('unauthenticated access to /operator redirects to login', async ({ page }) => {
    await page.goto('/operator');
    await page.waitForURL(/auth\/login|signin/i, { timeout: 10000 });
  });

  test('unauthenticated access to /admin redirects to login', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForURL(/auth\/login|signin/i, { timeout: 10000 });
  });
});

// ─── Operator smoke ───────────────────────────────────────────────────────────

test.describe('Operator portal', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('carelinkai_cookie_consent', JSON.stringify({
        necessary: true, analytics: false, marketing: false,
      }));
    });
    await login(page, TEST_USERS.OPERATOR);
    await waitForPageReady(page);
  });

  test('operator dashboard loads', async ({ page }) => {
    await page.goto('/operator');
    await waitForPageReady(page);
    await expect(page).not.toHaveURL(/error|500/);
    await expect(page.locator('h1, h2, [data-testid="dashboard"]').first()).toBeVisible();
  });

  test('operator billing page loads', async ({ page }) => {
    await page.goto('/operator/billing');
    await waitForPageReady(page);
    await expect(page).not.toHaveURL(/error|500/);
  });

  test('operator homes page loads', async ({ page }) => {
    await page.goto('/operator/homes');
    await waitForPageReady(page);
    await expect(page).not.toHaveURL(/error|500/);
  });
});

// ─── Family smoke ─────────────────────────────────────────────────────────────

test.describe('Family portal', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('carelinkai_cookie_consent', JSON.stringify({
        necessary: true, analytics: false, marketing: false,
      }));
    });
    await login(page, TEST_USERS.FAMILY);
    await waitForPageReady(page);
  });

  test('family dashboard loads', async ({ page }) => {
    await page.goto('/family');
    await waitForPageReady(page);
    await expect(page).not.toHaveURL(/error|500/);
  });

  test('search page loads', async ({ page }) => {
    await page.goto('/search');
    await waitForPageReady(page);
    await expect(page).not.toHaveURL(/error|500/);
  });
});

// ─── Admin smoke ──────────────────────────────────────────────────────────────

test.describe('Admin portal', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('carelinkai_cookie_consent', JSON.stringify({
        necessary: true, analytics: false, marketing: false,
      }));
    });
    await login(page, TEST_USERS.ADMIN);
    await waitForPageReady(page);
  });

  test('admin dashboard loads', async ({ page }) => {
    await page.goto('/admin');
    await waitForPageReady(page);
    await expect(page).not.toHaveURL(/error|500/);
  });

  test('admin users page loads', async ({ page }) => {
    await page.goto('/admin/users');
    await waitForPageReady(page);
    await expect(page).not.toHaveURL(/error|500/);
  });
});
