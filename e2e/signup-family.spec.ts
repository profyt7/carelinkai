import { test, expect } from '@playwright/test';

const PASSWORD = 'Test@12345';

test.describe('@critical Family signup', () => {
  test('register as FAMILY → verification-required page → DB row correct', async ({ page, request }) => {
    const email = `signup-fam-${Date.now()}@test.carelinkai.com`;

    await page.goto('/auth/register');

    // Select FAMILY role card
    await page.getByText('Looking for Care').click().catch(() =>
      page.locator('[data-role="FAMILY"], label:has-text("Family")').first().click()
    );

    await page.getByLabel(/first name/i).fill('E2E');
    await page.getByLabel(/last name/i).fill('Family');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^password$/i).first().fill(PASSWORD);
    await page.getByLabel(/confirm password/i).fill(PASSWORD);
    await page.getByRole('checkbox', { name: /terms/i }).check();

    await page.getByRole('button', { name: /create.*account|register|sign up/i }).click();

    await page.waitForURL(
      (url) =>
        url.pathname.includes('/auth/login') ||
        url.pathname.includes('/auth/verify') ||
        url.pathname.includes('/dashboard') ||
        url.pathname.includes('/settings/family'),
      { timeout: 20000 }
    );

    const isLoginPage = page.url().includes('/auth/login');
    if (isLoginPage) {
      await expect(
        page.getByText(/account.*created|verify.*email|check.*inbox/i).first()
      ).toBeVisible({ timeout: 10000 });
    }

    // Verify DB: user created, email not yet verified
    const tokenRes = await request.get(`/api/dev/get-verification-token?email=${encodeURIComponent(email)}`);
    expect(tokenRes.ok()).toBeTruthy();
    const tokenData = await tokenRes.json();
    expect(tokenData.emailVerified).toBeNull();
    expect(tokenData.verificationToken).toBeTruthy();
  });
});
