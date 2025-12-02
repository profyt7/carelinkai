import { test, expect } from '@playwright/test';

// This test targets a remote/staging environment and MUST run under the
// "chromium-no-bypass" project (no special bypass headers). It will be picked
// by the project via the [non-bypass] grep.
test.describe('[non-bypass] Staging: Family inquiry -> Operator sees lead', () => {
  test('family submits inquiry for operator-owned home; operator sees it', async ({ browser, baseURL }) => {
    test.skip(!baseURL || !/^https?:\/\//.test(baseURL) || /localhost|127\.0\.0\.1/.test(new URL(baseURL).hostname), 'Requires remote baseURL');

    const FAMILY_EMAIL = process.env['STAGING_FAMILY_EMAIL'];
    const FAMILY_PASSWORD = process.env['STAGING_FAMILY_PASSWORD'];
    const OP_EMAIL = process.env['STAGING_OPERATOR_EMAIL'];
    const OP_PASSWORD = process.env['STAGING_OPERATOR_PASSWORD'];

    test.skip(!FAMILY_EMAIL || !FAMILY_PASSWORD || !OP_EMAIL || !OP_PASSWORD, 'Missing staging credentials');

    // 1) Sign in as operator to discover an owned home
    const opCtx1 = await browser.newContext({ baseURL });
    const opPage1 = await opCtx1.newPage();
    await opPage1.goto('/auth/login');
    await opPage1.getByLabel('Email address').fill(OP_EMAIL!);
    await opPage1.getByLabel('Password').fill(OP_PASSWORD!);
    await opPage1.getByRole('button', { name: 'Sign in', exact: true }).click();
    await opPage1.waitForURL('**/dashboard', { timeout: 20_000 });

    const homesRes = await opPage1.request.get('/api/operator/homes');
    expect(homesRes.ok()).toBeTruthy();
    const homesJson = await homesRes.json().catch(() => null) as any;
    const firstHome = (homesJson?.homes || [])[0];
    test.skip(!firstHome, 'Operator has no homes in staging');
    const targetHomeId: string = firstHome.id;
    const targetHomeName: string = firstHome.name;
    await opCtx1.close();

    // 2) Family signs in, enables runtime mock mode, opens that home, and submits inquiry
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

    // 3) Operator signs in and sees the new inquiry in their list
    const opCtx2 = await browser.newContext({ baseURL });
    const opPage2 = await opCtx2.newPage();
    await opPage2.goto('/auth/login');
    await opPage2.getByLabel('Email address').fill(OP_EMAIL!);
    await opPage2.getByLabel('Password').fill(OP_PASSWORD!);
    await opPage2.getByRole('button', { name: 'Sign in' }).click();
    await opPage2.waitForURL('**/dashboard', { timeout: 20_000 });

    await opPage2.goto('/operator/inquiries', { waitUntil: 'domcontentloaded' });
    await expect(opPage2.getByRole('link', { name: targetHomeName })).toBeVisible({ timeout: 30_000 });
    await opCtx2.close();
  });
});
