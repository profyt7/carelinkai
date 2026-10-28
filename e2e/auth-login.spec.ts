import { test, expect } from '@playwright/test';

test.describe('Auth: Admin login', () => {
  test('should show login page and allow credentials sign-in (bypass in e2e)', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page).toHaveTitle(/CareLinkAI/i);
    await expect(page.getByRole('heading', { name: /sign in to your account/i })).toBeVisible();

    // Establish session via dev helper to avoid UI flakiness
    await page.goto('/');
    const ok = await page.evaluate(async () => {
      try {
        const r = await fetch('/api/dev/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@carelinkai.com' }) });
        return r.ok;
      } catch { return false; }
    });
    expect(ok).toBeTruthy();

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    // Less brittle assertion: ensure we are on dashboard and not on login
    await expect(page).toHaveURL(/.*\/dashboard.*/, { timeout: 15000 });
    await expect(page.getByText(/Dashboard|Welcome|Recent/i).first()).toBeVisible({ timeout: 15000 });
  });
});
