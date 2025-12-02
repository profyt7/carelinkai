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

    // Open the operator-owned home directly
    await famPage.goto(`/homes/${targetHomeId}`, { waitUntil: 'domcontentloaded' });
    // Start inquiry flow
    await famPage.getByRole('button', { name: 'Schedule a Tour' }).first().click();

    const token = `E2E-${Date.now()}`;
    await famPage.locator('#name').fill('E2E Tester');
    await famPage.locator('#email').fill(FAMILY_EMAIL!);
    await famPage.locator('#careAssisted').check();
    await famPage.locator('#message').fill(`Hello from ${token}`);
    await famPage.getByRole('button', { name: 'Continue to Schedule Tour' }).click();

    // Pick first available date and a time slot
    const dateBtn = famPage.locator('form >> text=/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\\s+\\d{1,2}$/').first();
    await dateBtn.click();
    await famPage.getByRole('button', { name: '10:00 AM' }).click();
    await famPage.getByRole('button', { name: 'Schedule Tour' }).click();

    await expect(famPage.getByRole('heading', { name: 'Tour Scheduled!' })).toBeVisible({ timeout: 20_000 });
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
