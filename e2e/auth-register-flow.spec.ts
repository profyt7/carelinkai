import { test, expect } from '@playwright/test';
import { loginAs } from './_helpers';

// E2E suite for the role-aware 3-step signup flow at /auth/register.
//
// Step 1 — Email + Password
// Step 2 — Account type selector (role tiles)
// Step 3 — Type-specific form (FAMILY gets full form; others get minimal form)
//
// ?role=ROLE deep-link: Step 1 → Next skips Step 2 entirely (auto-advance).
// ?claimToken=<tok> deep-link: token redeemed after signup for operator founder flow.

const PASSWORD = 'Test@12345';

// ── helpers ──────────────────────────────────────────────────────────────────

async function fillStep1(page: any, email: string) {
  await page.fill('#email', email);
  await page.fill('#password', PASSWORD);
  await page.fill('#confirmPassword', PASSWORD);
  await page.getByRole('button', { name: /next/i }).click();
}

// ── Family path ───────────────────────────────────────────────────────────────

test.describe('@critical Register — Family path', () => {
  test('full flow: email/pw → pick Family → fill care-recipient fields → land on family onboarding', async ({
    page,
  }) => {
    const email = `reg-family-${Date.now()}@test.carelinkai.com`;

    await page.goto('/auth/register', { waitUntil: 'domcontentloaded' });

    // Step 1 — credentials
    await expect(page.getByText(/login credentials/i)).toBeVisible({ timeout: 8000 });
    await fillStep1(page, email);

    // Step 2 — role selector
    await expect(page.getByText(/select how you'll be using/i)).toBeVisible({ timeout: 8000 });
    const familyTile = page.getByRole('radio', { name: /family member/i });
    await familyTile.check();
    await expect(familyTile).toBeChecked();
    await page.getByRole('button', { name: /next/i }).click();

    // Step 3 — FAMILY-specific fields visible
    await expect(page.getByText(/tell us about yourself/i)).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/who are you looking for care for/i)).toBeVisible();
    await expect(page.getByPlaceholder(/care needs/i).or(page.getByText(/care needs or preferences/i))).toBeVisible();

    // Fill profile
    await page.fill('#firstName', 'Jane');
    await page.fill('#lastName', 'Smith');
    await page.getByRole('checkbox', { name: /terms/i }).check();
    await page.getByRole('button', { name: /create account/i }).click();

    // Should redirect to family onboarding (after success splash)
    await page.waitForURL(/\/settings\/family|\/auth\/login/, { timeout: 20000 });
  });
});

// ── Operator path — no role param ─────────────────────────────────────────────

test.describe('@critical Register — Operator path (manual role select)', () => {
  test('email/pw → manually pick Operator on Step 2 → minimal Step 3 → land on /operator/onboarding/1', async ({
    page,
  }) => {
    const email = `reg-op-${Date.now()}@test.carelinkai.com`;

    await page.goto('/auth/register', { waitUntil: 'domcontentloaded' });

    // Step 1
    await expect(page.getByText(/login credentials/i)).toBeVisible({ timeout: 8000 });
    await fillStep1(page, email);

    // Step 2 — explicitly pick Operator
    await expect(page.getByText(/select how you'll be using/i)).toBeVisible({ timeout: 8000 });
    await page.getByRole('radio', { name: /care home operator/i }).check();
    await page.getByRole('button', { name: /next/i }).click();

    // Step 3 — family-only fields NOT visible
    await expect(page.getByText(/tell us about yourself/i)).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/who are you looking for care for/i)).not.toBeVisible();

    // Fill minimal profile
    await page.fill('#firstName', 'Alice');
    await page.fill('#lastName', 'Operator');
    await page.getByRole('checkbox', { name: /terms/i }).check();
    await page.getByRole('button', { name: /create account/i }).click();

    // Should land on operator onboarding wizard
    await page.waitForURL(/\/operator\/onboarding\/1|\/auth\/login/, { timeout: 20000 });
  });
});

// ── Operator path — ?role=OPERATOR deep-link ──────────────────────────────────

test.describe('@critical Register — Operator path (?role=OPERATOR deep-link)', () => {
  test('?role=OPERATOR: Step 1 Next auto-advances to Step 3, skipping Step 2', async ({
    page,
  }) => {
    const email = `reg-op-link-${Date.now()}@test.carelinkai.com`;

    await page.goto('/auth/register?role=OPERATOR', { waitUntil: 'domcontentloaded' });

    // Step 1
    await expect(page.getByText(/login credentials/i)).toBeVisible({ timeout: 8000 });
    await fillStep1(page, email);

    // Should jump directly to Step 3 — "Select how you'll be using" (Step 2) should be skipped
    await expect(page.getByText(/tell us about yourself/i)).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/select how you'll be using/i)).not.toBeVisible();

    // Family-only fields must NOT appear
    await expect(page.getByText(/who are you looking for care for/i)).not.toBeVisible();

    // Fill profile and submit
    await page.fill('#firstName', 'Bob');
    await page.fill('#lastName', 'DeepLink');
    await page.getByRole('checkbox', { name: /terms/i }).check();
    await page.getByRole('button', { name: /create account/i }).click();

    await page.waitForURL(/\/operator\/onboarding\/1|\/auth\/login/, { timeout: 20000 });
  });

  test('Back from Step 3 lands on Step 2 with Operator tile highlighted', async ({
    page,
  }) => {
    await page.goto('/auth/register?role=OPERATOR', { waitUntil: 'domcontentloaded' });

    // Step 1 → auto-advance to Step 3
    await fillStep1(page, `reg-back-${Date.now()}@test.carelinkai.com`);
    await expect(page.getByText(/tell us about yourself/i)).toBeVisible({ timeout: 8000 });

    // Hit Back
    await page.getByRole('button', { name: /back/i }).click();

    // Should land on Step 2 with Operator pre-selected
    await expect(page.getByText(/select how you'll be using/i)).toBeVisible({ timeout: 8000 });
    const operatorRadio = page.getByRole('radio', { name: /care home operator/i });
    await expect(operatorRadio).toBeChecked();
  });
});

// ── Operator path — ?claimToken (Cleveland founder deep-link) ─────────────────

test.describe('@critical Register — Cleveland founder claim-token flow', () => {
  test('?claimToken redeemed after signup → clevelandFounder=true on operator record', async ({
    page,
    request,
  }) => {
    const opEmail = `reg-founder-${Date.now()}@test.carelinkai.com`;

    // Seed a home so admin can generate a claim link against it
    await request.post('/api/dev/upsert-admin', {
      data: { email: 'admin@carelinkai.com' },
    });

    // We need a homeId — seed a dummy operator record to get one
    const seedRes = await request.post('/api/dev/upsert-operator', {
      data: {
        email: `seed-home-${Date.now()}@test.carelinkai.com`,
        companyName: 'Seed Co',
        homes: [{ name: 'Seed Home', capacity: 5 }],
      },
    });
    expect(seedRes.ok()).toBeTruthy();
    const seedData = await seedRes.json();
    const homeId = seedData.homes?.[0]?.id ?? seedData.homeId;
    expect(homeId).toBeTruthy();

    // Admin generates claim link for the new operator's email
    await loginAs(page, 'admin@carelinkai.com');
    const claimRes = await page.evaluate(
      async ({ hid, email }: { hid: string; email: string }) => {
        const r = await fetch(`/api/admin/homes/${hid}/claim-link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ operatorEmail: email, clevelandFounder: true }),
        });
        return { status: r.status, body: await r.json() };
      },
      { hid: homeId, email: opEmail }
    );
    expect(claimRes.status).toBe(200);
    const { token } = claimRes.body;
    expect(token).toBeTruthy();

    // New operator registers via the claim-token deep-link
    const registerUrl = `/auth/register?role=OPERATOR&claimToken=${encodeURIComponent(token)}`;
    await page.goto(registerUrl, { waitUntil: 'domcontentloaded' });

    // Step 1 → auto-advance to Step 3
    await fillStep1(page, opEmail);
    await expect(page.getByText(/tell us about yourself/i)).toBeVisible({ timeout: 8000 });

    await page.fill('#firstName', 'Chris');
    await page.fill('#lastName', 'Founder');
    await page.getByRole('checkbox', { name: /terms/i }).check();
    await page.getByRole('button', { name: /create account/i }).click();

    // Wait for redirect to onboarding wizard
    await page.waitForURL(/\/operator\/onboarding\/1|\/auth\/login/, { timeout: 20000 });

    // After redirect, verify the claim was applied (founder flag set)
    // Use a short delay to let the claim redemption API call complete
    await page.waitForTimeout(3000);
    const statusRes = await page.evaluate(async () => {
      const r = await fetch('/api/operator/onboarding/status', {
        credentials: 'include',
      });
      return r.json();
    });
    expect(statusRes.clevelandFounder).toBe(true);
    expect(statusRes.freeAccessUntil).toBeTruthy();
  });
});
