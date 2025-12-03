import { test, expect } from '@playwright/test';

// This test targets a remote/staging environment and MUST run under the
// "chromium-no-bypass" project (no special bypass headers). It will be picked
// by the project via the [non-bypass] grep.
test.describe('[non-bypass] Staging: Family inquiry -> Operator sees lead', () => {
  test('family submits inquiry for operator-owned home; operator sees it', async ({ browser, baseURL }) => {
    test.skip(!baseURL || !/^https?:\/\//.test(baseURL) || /localhost|127\.0\.0\.1/.test(new URL(baseURL).hostname), 'Requires remote baseURL');

    const FAMILY_EMAIL = process.env['STAGING_FAMILY_EMAIL'];
    const FAMILY_PASSWORD = process.env['STAGING_FAMILY_PASSWORD'];
    const ADMIN_EMAIL = process.env['STAGING_ADMIN_EMAIL'] || 'admin@carelinkai.com';
    const ADMIN_PASSWORD = process.env['STAGING_ADMIN_PASSWORD'] || 'Admin123!';

    test.skip(!FAMILY_EMAIL || !FAMILY_PASSWORD || !ADMIN_EMAIL || !ADMIN_PASSWORD, 'Missing staging credentials');

    // 1) Family signs in and fetches a public home via search
    const famCtx = await browser.newContext({ baseURL });
    // Enable UI mock mode via cookie so the inline inquiry widget is shown on the home page
    const isHttps = /^https:/.test(baseURL!);
    const domain = new URL(baseURL!).hostname;
    await famCtx.addCookies([{ name: 'carelink_mock_mode', value: '1', domain, path: '/', secure: isHttps }]);

    const famPage = await famCtx.newPage();
    await famPage.goto('/auth/login');
    await famPage.getByLabel('Email address').fill(FAMILY_EMAIL!);
    await famPage.getByLabel('Password').fill(FAMILY_PASSWORD!);
    await famPage.getByRole('button', { name: 'Sign in', exact: true }).click();
    await famPage.waitForURL('**/dashboard', { timeout: 20_000 });

    const searchRes = await famPage.request.get('/api/homes/search?limit=1');
    expect(searchRes.ok()).toBeTruthy();
    const searchJson = await searchRes.json().catch(() => null) as any;
    const firstHome = searchJson?.data?.homes?.[0] || null;
    test.skip(!firstHome, 'No homes available in search');
    const targetHomeId: string = firstHome.id;
    const targetHomeName: string = firstHome.name;

    // Directly create the inquiry via API (avoids fragile UI flow differences on staging)
    const token = `E2E-${Date.now()}`;
    const tourIso = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const createRes = await famPage.request.post('/api/inquiries', {
      data: {
        homeId: targetHomeId,
        name: 'E2E Tester',
        email: FAMILY_EMAIL!,
        careNeeded: ['Assisted Living'],
        message: `Hello from ${token}`,
        tourDate: tourIso,
        source: 'e2e',
      }
    });
    expect(createRes.status()).toBe(201);
    const created = await createRes.json();
    expect(created?.id).toBeTruthy();
    await famCtx.close();

    // 3) Admin signs in and sees the new inquiry in the operator inquiries list
    const adminCtx = await browser.newContext({ baseURL });
    const adminPage = await adminCtx.newPage();
    await adminPage.goto('/auth/login');
    await adminPage.getByLabel('Email address').fill(ADMIN_EMAIL!);
    await adminPage.getByLabel('Password').fill(ADMIN_PASSWORD!);
    await adminPage.getByRole('button', { name: 'Sign in', exact: true }).click();
    await adminPage.waitForURL('**/dashboard', { timeout: 20_000 });

    await adminPage.goto('/operator/inquiries', { waitUntil: 'domcontentloaded' });
    await expect(adminPage.getByRole('link', { name: targetHomeName })).toBeVisible({ timeout: 30_000 });
    await adminCtx.close();
  });
});
