import { test, expect } from '@playwright/test';
import { loginAs } from './_helpers';

// Regression / feature suite for the 4-step operator onboarding wizard
// (shipped 2026-06-01, replaces the original 3-step page.tsx wizard).
//
// Flow: OPERATOR registers → AcceptanceGate detects no onboardingCompletedAt
// → redirects to /operator/onboarding/1 → wizard steps → plan selection or
// Cleveland founder free access path.

const PASSWORD = 'Test@12345';

async function registerOperator(request: any, email: string) {
  const res = await request.post('/api/auth/register', {
    data: {
      email,
      password: PASSWORD,
      firstName: 'E2E',
      lastName: 'Wizard',
      role: 'OPERATOR',
      agreeToTerms: true,
    },
  });
  expect(res.status()).toBeLessThan(400);
}

test.describe('@critical Operator onboarding wizard (4-step)', () => {
  test('after login, OPERATOR is sent to /operator (not /dashboard)', async ({
    page,
    request,
  }) => {
    const email = `login-redirect-${Date.now()}@test.carelinkai.com`;
    await registerOperator(request, email);
    await loginAs(page, email);
    // Should land in the operator area (wizard or dashboard, not /dashboard)
    await expect(page).toHaveURL(/\/operator/, { timeout: 15000 });
  });

  test('new operator is redirected to wizard and can reach plan selection with all 4 tiers', async ({
    page,
    request,
  }) => {
    const email = `onboard-${Date.now()}@test.carelinkai.com`;
    await registerOperator(request, email);
    await loginAs(page, email);

    // Visiting /operator triggers the AcceptanceGate → onboarding redirect
    await page.goto('/operator', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/operator\/onboarding\/1/, { timeout: 15000 });

    // Step 1: Company profile
    await expect(page.getByText(/company profile/i).first()).toBeVisible({ timeout: 10000 });
    const companyInput = page.getByPlaceholder(/sunrise senior living/i).first();
    await companyInput.fill('E2E Wizard Co');
    await page.getByRole('button', { name: /continue/i }).click();

    // Step 2: First home
    await page.waitForURL(/\/operator\/onboarding\/2/, { timeout: 10000 });
    await expect(page.getByText(/add your first home/i)).toBeVisible({ timeout: 10000 });

    await page.getByPlaceholder(/sunrise east wing/i).fill('E2E Home Alpha');
    await page.getByPlaceholder(/warm.*community/i).fill('A test home for e2e purposes.');
    await page.getByPlaceholder(/1234 Oak Lane/i).fill('100 Main St');
    await page.getByPlaceholder(/city/i).fill('Cleveland');
    await page.getByPlaceholder(/OH/i).fill('OH');
    await page.getByPlaceholder(/zip/i).fill('44101');
    await page.getByPlaceholder(/capacity/i).fill('10');

    // Pick at least one care type
    await page.getByText('Assisted Living').click();
    await page.getByRole('button', { name: /continue/i }).click();

    // Step 3: Claim link — skip
    await page.waitForURL(/\/operator\/onboarding\/3/, { timeout: 10000 });
    await expect(page.getByText(/cleveland founder access/i)).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /skip/i }).click();

    // Step 4: All 4 paid tiers visible
    await page.waitForURL(/\/operator\/onboarding\/4/, { timeout: 10000 });
    await expect(page.getByText(/choose a plan/i)).toBeVisible({ timeout: 10000 });
    for (const tier of ['starter', 'professional', 'growth', 'agency']) {
      await expect(page.getByText(new RegExp(tier, 'i'))).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('@critical Cleveland founder claim flow', () => {
  test('admin generates claim link → operator redeems it → free access granted', async ({
    page,
    request,
  }) => {
    const opEmail = `founder-${Date.now()}@test.carelinkai.com`;

    // Seed operator and a home via dev endpoint
    const seedRes = await request.post('/api/dev/upsert-operator', {
      data: { email: opEmail, companyName: 'Cleveland Founder Co', homes: [{ name: 'Founder Home', capacity: 5 }] },
    });
    expect(seedRes.ok()).toBeTruthy();
    const seedData = await seedRes.json();
    const homeId = seedData.homes?.[0]?.id ?? seedData.homeId;
    expect(homeId).toBeTruthy();

    // Ensure admin account exists
    await request.post('/api/dev/upsert-admin', { data: { email: 'admin@carelinkai.com' } });
    await loginAs(page, 'admin@carelinkai.com');

    // Generate claim link
    const claimLinkRes = await page.evaluate(
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

    expect(claimLinkRes.status).toBe(200);
    const { token } = claimLinkRes.body;
    expect(token).toBeTruthy();

    // Operator redeems the token
    await loginAs(page, opEmail);

    const redeemRes = await page.evaluate(
      async (t: string) => {
        const r = await fetch('/api/operator/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ token: t }),
        });
        return { status: r.status, body: await r.json() };
      },
      token
    );

    expect(redeemRes.status).toBe(200);
    expect(redeemRes.body.clevelandFounder).toBe(true);
    expect(redeemRes.body.freeAccessUntil).toBeTruthy();

    // Onboarding status should reflect clevelandFounder + seededHomeId
    const statusRes = await page.evaluate(async () => {
      const r = await fetch('/api/operator/onboarding/status', { credentials: 'include' });
      return r.json();
    });
    expect(statusRes.clevelandFounder).toBe(true);
    expect(statusRes.seededHomeId).toBeTruthy();
    expect(statusRes.seededHome).toBeTruthy();
  });

  test('claim token applied at signup: founder flag set without manual /api/operator/claim call', async ({
    page,
    request,
  }) => {
    const opEmail = `founder-signup-${Date.now()}@test.carelinkai.com`;

    // Seed a home for the claim token
    await request.post('/api/dev/upsert-admin', { data: { email: 'admin@carelinkai.com' } });
    const seedRes = await request.post('/api/dev/upsert-operator', {
      data: { email: `seed-only-${Date.now()}@test.carelinkai.com`, companyName: 'Seed Co', homes: [{ name: 'Seed Home', capacity: 8 }] },
    });
    expect(seedRes.ok()).toBeTruthy();
    const seedData = await seedRes.json();
    const homeId = seedData.homes?.[0]?.id ?? seedData.homeId;

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
        return r.json();
      },
      { hid: homeId, email: opEmail }
    );
    expect(claimRes.token).toBeTruthy();

    // Register via API with claimToken in body (simulates the register page submitting it)
    const regRes = await request.post('/api/auth/register', {
      data: {
        email: opEmail,
        password: 'Test@12345',
        firstName: 'Founder',
        lastName: 'Signup',
        role: 'OPERATOR',
        agreeToTerms: true,
        claimToken: claimRes.token,
      },
    });
    expect(regRes.status()).toBe(201);

    // Log in and verify founder flags are already set (no manual claim call needed)
    await loginAs(page, opEmail);
    const statusRes = await page.evaluate(async () => {
      const r = await fetch('/api/operator/onboarding/status', { credentials: 'include' });
      return r.json();
    });
    expect(statusRes.clevelandFounder).toBe(true);
    expect(statusRes.freeAccessUntil).toBeTruthy();
    expect(statusRes.seededHomeId).toBe(homeId);
  });

  test('Step 2 pre-populates seeded home for founders', async ({
    page,
    request,
  }) => {
    const opEmail = `founder-step2-${Date.now()}@test.carelinkai.com`;

    await request.post('/api/dev/upsert-admin', { data: { email: 'admin@carelinkai.com' } });
    const seedRes = await request.post('/api/dev/upsert-operator', {
      data: { email: `seed-s2-${Date.now()}@test.carelinkai.com`, companyName: 'S2 Co', homes: [{ name: 'Canterbury Commons', capacity: 12 }] },
    });
    const seedData = await seedRes.json();
    const homeId = seedData.homes?.[0]?.id ?? seedData.homeId;

    await loginAs(page, 'admin@carelinkai.com');
    const claimRes = await page.evaluate(
      async ({ hid, email }: { hid: string; email: string }) => {
        const r = await fetch(`/api/admin/homes/${hid}/claim-link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ operatorEmail: email, clevelandFounder: true }),
        });
        return r.json();
      },
      { hid: homeId, email: opEmail }
    );

    // Register with claim token
    await request.post('/api/auth/register', {
      data: { email: opEmail, password: 'Test@12345', firstName: 'Step2', lastName: 'Test', role: 'OPERATOR', agreeToTerms: true, claimToken: claimRes.token },
    });
    await loginAs(page, opEmail);
    await page.goto('/operator/onboarding/2', { waitUntil: 'domcontentloaded' });

    // Step 2 should show "Confirm your home" and pre-populate the home name
    await expect(page.getByText(/confirm your home/i)).toBeVisible({ timeout: 10000 });
    const nameInput = page.locator('input[placeholder="Sunrise East Wing"]');
    await expect(nameInput).toHaveValue('Canterbury Commons', { timeout: 8000 });
  });

  test('claim token locked to operator email — different operator cannot redeem', async ({
    page,
    request,
  }) => {
    const targetEmail = `founder-target-${Date.now()}@test.carelinkai.com`;
    const otherEmail = `founder-other-${Date.now()}@test.carelinkai.com`;

    await request.post('/api/dev/upsert-operator', {
      data: { email: targetEmail, companyName: 'Target Co', homes: [{ name: 'Target Home', capacity: 5 }] },
    });
    await request.post('/api/dev/upsert-operator', {
      data: { email: otherEmail, companyName: 'Other Co', homes: [{ name: 'Other Home', capacity: 5 }] },
    });
    await request.post('/api/dev/upsert-admin', { data: { email: 'admin@carelinkai.com' } });

    // Admin generates token for targetEmail
    await loginAs(page, 'admin@carelinkai.com');
    const seedData = await (await request.post('/api/dev/upsert-operator', {
      data: { email: targetEmail, companyName: 'Target Co', homes: [{ name: 'Seed', capacity: 3 }] },
    })).json();
    const homeId = seedData.homes?.[0]?.id ?? seedData.homeId;

    const tokenRes = await page.evaluate(
      async ({ hid, email }: { hid: string; email: string }) => {
        const r = await fetch(`/api/admin/homes/${hid}/claim-link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ operatorEmail: email }),
        });
        return r.json();
      },
      { hid: homeId, email: targetEmail }
    );

    // otherOperator tries to redeem — must get 403
    await loginAs(page, otherEmail);
    const badRedeemRes = await page.evaluate(
      async (t: string) => {
        const r = await fetch('/api/operator/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ token: t }),
        });
        return r.status;
      },
      tokenRes.token
    );
    expect(badRedeemRes).toBe(403);
  });
});
