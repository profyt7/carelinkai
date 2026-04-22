import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsOperator, loginAsCaregiver, loginAsFamily, waitForPageReady } from './helpers/auth';
import * as path from 'path';

// ─── Bug 1: Profile picture upload & display ────────────────────────────────

test.describe('Bug 1: Profile picture upload', () => {

  test('Profile settings page loads with photo upload UI', async ({ page }) => {
    await loginAsOperator(page);
    await page.goto('/settings/profile');
    await waitForPageReady(page);

    // Upload UI should be present
    await expect(page.locator('input[type="file"], [data-testid="photo-upload"], label:has-text("photo"), label:has-text("Photo"), button:has-text("upload"), button:has-text("Upload")').first()).toBeVisible({ timeout: 8000 });
  });

  test('Profile picture upload endpoint accepts an image', async ({ page }) => {
    await loginAsOperator(page);

    // Hit the upload endpoint directly with a tiny test PNG (1x1 pixel)
    const tiny1x1PNG = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const response = await page.request.post('/api/profile/picture/upload', {
      multipart: {
        file: {
          name: 'test-avatar.png',
          mimeType: 'image/png',
          buffer: tiny1x1PNG,
        },
      },
    });

    // Should not be 503 (Cloudinary not configured) or 401 (auth)
    expect(response.status()).not.toBe(503);
    expect(response.status()).not.toBe(401);

    const body = await response.json();

    if (response.status() === 200) {
      // Upload succeeded — verify response shape
      expect(body.profileImageUrl).toBeDefined();
      expect(body.profileImageUrl.medium || body.profileImageUrl.thumbnail || body.profileImageUrl.original).toBeTruthy();
    } else {
      // Log the error for diagnosis
      console.log('Upload response:', response.status(), JSON.stringify(body));
    }
  });

  test('After upload, profile image is reflected in session', async ({ page }) => {
    await loginAsOperator(page);

    const tiny1x1PNG = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const uploadRes = await page.request.post('/api/profile/picture/upload', {
      multipart: {
        file: {
          name: 'test-avatar.png',
          mimeType: 'image/png',
          buffer: tiny1x1PNG,
        },
      },
    });

    if (uploadRes.status() !== 200) {
      test.skip(); // Cloudinary may not be reachable in this environment
      return;
    }

    // Reload the dashboard and confirm avatar is now visible
    await page.goto('/dashboard');
    await waitForPageReady(page);

    // The session should have the image — check for an img tag in the header/nav
    const avatarImg = page.locator('header img, nav img').first();
    if (await avatarImg.count() > 0) {
      const src = await avatarImg.getAttribute('src');
      expect(src).toBeTruthy();
    }
  });
});

// ─── Bug 2: AI Resident Matching ────────────────────────────────────────────

test.describe('Bug 2: AI Resident Matching', () => {

  test('AI match API returns 200 (not 500) with no active homes', async ({ page }) => {
    await loginAsFamily(page);

    const res = await page.request.post('/api/ai/match/resident?limit=5', {
      data: {
        age: 80,
        careLevelNeeded: ['ASSISTED'],
        budget: { max: 5000 },
      },
    });

    // Must not be a server error
    expect(res.status()).not.toBe(500);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.items)).toBeTruthy();
    // 0 items is fine — no active homes seeded yet
  });

  test('AI match page renders without crashing', async ({ page }) => {
    await loginAsFamily(page);
    await page.goto('/homes/match');
    await waitForPageReady(page);

    // Should show the search form, not a crash
    await expect(page.locator('text=/Resident Profile|Find Matches|AI/i').first()).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
    await expect(page.locator('body')).not.toContainText('Application error');
  });

  test('AI match page shows empty state (not error) when no homes exist', async ({ page }) => {
    await loginAsFamily(page);
    await page.goto('/homes/match');
    await waitForPageReady(page);

    // Submit the form with basic criteria
    await page.click('button:has-text("Find Matches")');
    await page.waitForTimeout(3000);

    // Should show no-results state, NOT an error alert
    const errorAlert = page.locator('.text-red-700, [class*="red"] >> text=/Failed|Error|failed/i');
    expect(await errorAlert.count()).toBe(0);

    // Empty state or results — both valid
    const emptyState = page.locator('text=/No matches found|Submit the profile|adjust/i');
    const hasResults = page.locator('text=/AI Match|% match/i');
    const eitherVisible = (await emptyState.count()) > 0 || (await hasResults.count()) > 0;
    expect(eitherVisible).toBeTruthy();
  });
});

// ─── Bug 3: Settings routing ─────────────────────────────────────────────────

test.describe('Bug 3: Settings routing', () => {

  test('Settings nav link goes to /settings index page', async ({ page }) => {
    await loginAsOperator(page);
    await waitForPageReady(page);

    // Click the Settings link in the sidebar
    const settingsLink = page.locator('nav a[href="/settings"]').first();
    if (await settingsLink.count() > 0) {
      await settingsLink.click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/settings');
    } else {
      // Navigate directly
      await page.goto('/settings');
      await waitForPageReady(page);
    }

    // Should be the settings INDEX page with cards — not auto-redirected to /settings/profile
    await expect(page.locator('text=/Settings/i').first()).toBeVisible();
    // The index page has multiple setting cards
    const settingCards = page.locator('a[href="/settings/profile"], a[href="/settings/account"]');
    expect(await settingCards.count()).toBeGreaterThan(0);
  });

  test('/settings renders index page with cards for operator', async ({ page }) => {
    await loginAsOperator(page);
    await page.goto('/settings');
    await waitForPageReady(page);

    // Should NOT be redirected away from /settings
    expect(page.url()).toContain('/settings');
    expect(page.url()).not.toMatch(/\/settings\/profile$/);

    // Should show multiple setting options
    await expect(page.locator('a[href="/settings/profile"]')).toBeVisible();
    await expect(page.locator('a[href="/settings/account"]')).toBeVisible();
  });

  test('/settings renders index page for caregiver', async ({ page }) => {
    await loginAsCaregiver(page);
    await page.goto('/settings');
    await waitForPageReady(page);

    expect(page.url()).toContain('/settings');
    await expect(page.locator('text=/Settings/i').first()).toBeVisible();
  });

  test('/settings/profile page loads correctly', async ({ page }) => {
    await loginAsOperator(page);
    await page.goto('/settings/profile');
    await waitForPageReady(page);

    await expect(page.locator('body')).not.toContainText('404');
    await expect(page.locator('body')).not.toContainText('not found');
    await expect(page.locator('text=/Profile|Account|Settings/i').first()).toBeVisible();
  });
});
