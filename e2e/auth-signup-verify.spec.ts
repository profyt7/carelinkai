import { test, expect } from '@playwright/test';

// Regression guard for the POST-SIGNUP "verify your email" UX.
//
// An account is created with status PENDING and CANNOT sign in until the emailed
// verification link is clicked (src/lib/auth.ts throws on status === 'PENDING').
// Signup must therefore land the user on the login page's verify state — naming
// the email + offering a resend — NOT a bare login page and NOT an app dashboard.
//
// This exact redirect has regressed twice (#675 fixed one of two register-page
// redirects; #681 fixed the catch fallback + removed the dead auto-signin that
// could never succeed for a PENDING user), so it gets a dedicated, CI-wired test.

const PASSWORD = 'Test@12345';

test.describe('@critical Signup → verify-email state', () => {
  test('after signup the user lands on /auth/login?verify=1 with the verification-sent message + resend control', async ({
    page,
  }) => {
    const email = `signup-verify-${Date.now()}@test.carelinkai.com`;

    await page.goto('/auth/register', { waitUntil: 'domcontentloaded' });

    // Step 1 — credentials
    await expect(page.getByText(/login credentials/i)).toBeVisible({ timeout: 8000 });
    await page.fill('#email', email);
    await page.fill('#password', PASSWORD);
    await page.fill('#confirmPassword', PASSWORD);
    await page.getByRole('button', { name: /next/i }).click();

    // Step 2 — pick Family (any role lands on the same verify state; Family is canonical)
    await expect(page.getByText(/select how you'll be using/i)).toBeVisible({ timeout: 8000 });
    await page.getByRole('radio', { name: /family member/i }).check();
    await page.getByRole('button', { name: /next/i }).click();

    // Step 3 — minimal profile + submit
    await expect(page.getByText(/tell us about yourself/i)).toBeVisible({ timeout: 8000 });
    await page.fill('#firstName', 'Vera');
    await page.fill('#lastName', 'Ifyer');
    await page.getByRole('checkbox', { name: /terms/i }).check();
    await page.getByRole('button', { name: /create account/i }).click();

    // MUST redirect to the login page's verify state, carrying the email — never a
    // bare /auth/login and never straight into an app dashboard.
    await page.waitForURL(/\/auth\/login\?.*\bverify=1\b/, { timeout: 20000 });
    // The email is carried through so the login page can name it + pre-fill resend.
    await expect(page).toHaveURL(/[?&]email=/);

    // The verify-sent message names the email, and the resend control is offered.
    await expect(page.getByText(/we've sent a verification link to/i)).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(email)).toBeVisible();
    await expect(page.getByRole('button', { name: /resend verification email/i })).toBeVisible();
  });
});
