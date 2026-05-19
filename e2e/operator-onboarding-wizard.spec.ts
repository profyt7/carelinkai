import { test, expect } from '@playwright/test';
import { loginAs } from './_helpers';

const PASSWORD = 'Test@12345';

// Tests that a fresh OPERATOR with no facilities is funnelled through the
// onboarding wizard and can create their first home.
test.describe('@critical Operator onboarding wizard', () => {
  test('operator with 0 homes and accepted BAA is redirected to wizard → can create facility', async ({
    page,
    request,
  }) => {
    const email = `onboard-${Date.now()}@test.carelinkai.com`;

    // 1. Register fresh OPERATOR — creates Operator record with 0 homes
    const regRes = await request.post('/api/auth/register', {
      data: {
        email,
        password: PASSWORD,
        firstName: 'E2E',
        lastName: 'Wizard',
        role: 'OPERATOR',
        agreeToTerms: true,
      },
    });
    expect(regRes.status()).toBeLessThan(400);

    // 2. Bypass login (skip email verification check — dev endpoint mints JWT regardless of status)
    await loginAs(page, email);

    // 3. Visit /operator → AcceptanceGate intercepts → redirect to /operator/acceptance
    await page.goto('/operator', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/operator\/acceptance/, { timeout: 15000 });

    // 4. Accept BAA + DPA on the acceptance page
    await expect(page.getByText(/business associate agreement/i).first()).toBeVisible({ timeout: 10000 });
    const checkboxes = page.getByRole('checkbox');
    await checkboxes.nth(0).check({ force: true });
    await checkboxes.nth(1).check({ force: true });
    await page.getByRole('button', { name: /i accept|accept.*agree|submit/i }).click();

    // 5. After acceptance → /operator → OperatorDashboardPage sees 0 homes → /operator/onboarding
    await page.waitForURL(/\/operator\/onboarding/, { timeout: 20000 });
    await expect(page).toHaveURL(/\/operator\/onboarding/);

    // 6. Step 1: Company Profile — should be pre-filled or empty
    await expect(page.getByText(/set up your company|company.*facility/i).first()).toBeVisible({ timeout: 10000 });
    const companyInput = page.getByPlaceholder(/sunrise care homes|company.*name/i).first();
    await companyInput.fill('E2E Test Facility');
    await page.getByRole('button', { name: /next|continue/i }).click();

    // 7. Step 2: First Home
    await expect(page.getByText(/add your first home/i)).toBeVisible({ timeout: 10000 });
    await page.getByPlaceholder(/e\.?g\.?\s*sunrise/i).fill('E2E Home Alpha');
    await page.getByPlaceholder(/brief description/i).fill('A test home for e2e purposes.');
    await page.getByPlaceholder(/street/i).fill('100 Main St');
    await page.getByPlaceholder(/city/i).fill('Cleveland');
    await page.getByPlaceholder(/state/i).fill('OH');
    await page.getByPlaceholder(/zip/i).fill('44101');
    await page.getByPlaceholder(/capacity/i).fill('10');

    // Select at least one care type
    const careLevelCheckbox = page.getByRole('checkbox').first();
    if (!await careLevelCheckbox.isChecked()) await careLevelCheckbox.check({ force: true });

    await page.getByRole('button', { name: /next|continue/i }).click();

    // 8. Step 3: Choose Plan renders
    await expect(page.getByText(/choose.*plan|plan.*starter|professional/i).first()).toBeVisible({ timeout: 15000 });
  });
});
