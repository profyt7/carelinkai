import { test, expect } from '@playwright/test';

const PASSWORD = 'Test@12345';

test.describe('@critical Operator signup', () => {
  test('register as OPERATOR → verification-required page → DB row correct', async ({ page, request }) => {
    const email = `signup-op-${Date.now()}@test.carelinkai.com`;

    await page.goto('/auth/register');

    // Select OPERATOR role card
    await page.getByText('Care Home Owner').click().catch(() =>
      page.locator('[data-role="OPERATOR"], label:has-text("Operator")').first().click()
    );

    // Fill form
    await page.getByLabel(/first name/i).fill('E2E');
    await page.getByLabel(/last name/i).fill('Operator');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^password$/i).first().fill(PASSWORD);
    await page.getByLabel(/confirm password/i).fill(PASSWORD);
    await page.getByRole('checkbox', { name: /terms/i }).check();

    await page.getByRole('button', { name: /create.*account|register|sign up/i }).click();

    // After submit, the app auto-attempts login (fails because PENDING) → redirects
    // to /auth/login?registered=true, OR shows an inline success/verify message
    await page.waitForURL(
      (url) =>
        url.pathname.includes('/auth/login') ||
        url.pathname.includes('/auth/verify') ||
        url.pathname.includes('/dashboard') ||
        url.pathname.includes('/operator'),
      { timeout: 20000 }
    );

    // Assert we are on a "verification required" or "account created" page
    const isLoginPage = page.url().includes('/auth/login');
    if (isLoginPage) {
      await expect(
        page.getByText(/account.*created|verify.*email|check.*inbox/i).first()
      ).toBeVisible({ timeout: 10000 });
    }

    // Assert DB row exists via dev endpoint
    const tokenRes = await request.get(`/api/dev/get-verification-token?email=${encodeURIComponent(email)}`);
    expect(tokenRes.ok()).toBeTruthy();
    const tokenData = await tokenRes.json();
    expect(tokenData.emailVerified).toBeNull();
    expect(tokenData.verificationToken).toBeTruthy();
  });
});
