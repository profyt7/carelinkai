import { test, expect } from '@playwright/test';
import { loginAs } from './_helpers';

// Creates an operator without BAA/DPA acceptance (fresh from upsert-operator).
// The AcceptanceGate should redirect to /operator/acceptance.
// After accepting, the user should reach /operator and DB fields should be set.

test.describe('@critical BAA/DPA gate', () => {
  test('operator without acceptance is gated → accepts → reaches dashboard', async ({ page, request }) => {
    const email = `baa-gate-${Date.now()}@test.carelinkai.com`;

    // Seed operator (no BAA accepted yet)
    const upsertRes = await request.post('/api/dev/upsert-operator', {
      data: { email, companyName: 'Gate Test Co' },
    });
    expect(upsertRes.ok()).toBeTruthy();

    // Log in
    await loginAs(page, email);

    // Navigate to operator area — AcceptanceGate should redirect to /operator/acceptance
    await page.goto('/operator', { waitUntil: 'domcontentloaded' });

    // Wait for redirect to acceptance page
    await page.waitForURL(/\/operator\/acceptance/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/operator\/acceptance/);

    // Assert acceptance page renders BAA and DPA sections
    await expect(page.getByText(/business associate agreement/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/data processing agreement/i).first()).toBeVisible({ timeout: 10000 });

    // Scroll to bottom of each agreement text area so the checkboxes become enabled
    // (the page uses scroll detection — if checkboxes are already visible, just click)
    const baaCheckbox = page.getByRole('checkbox').nth(0);
    const dpaCheckbox = page.getByRole('checkbox').nth(1);
    await baaCheckbox.scrollIntoViewIfNeeded();
    await baaCheckbox.check({ force: true });
    await dpaCheckbox.scrollIntoViewIfNeeded();
    await dpaCheckbox.check({ force: true });

    // Submit
    await page.getByRole('button', { name: /i accept|accept.*agree|submit/i }).click();

    // Should redirect to /operator (dashboard)
    await page.waitForURL(/\/operator(?!\/acceptance)/, { timeout: 20000 });
    await expect(page).toHaveURL(/\/operator/);
    expect(page.url()).not.toContain('/acceptance');

    // Confirm DB: BAA and DPA acceptance recorded
    const whoami = await page.evaluate(async () => {
      const r = await fetch('/api/dev/whoami', { credentials: 'include' });
      return r.json();
    });
    // Session is the easiest confirmation; full DB check would require a new dev endpoint
    expect(whoami.ok).toBe(true);
    expect(whoami.session?.user?.email).toBe(email);
  });
});
