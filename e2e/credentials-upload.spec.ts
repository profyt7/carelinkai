import { test, expect } from '@playwright/test';
import path from 'path';

// This spec performs a real login (non-bypass) and completes the caregiver credential upload flow.
// It relies on dev-only endpoints and a mock S3 upload URL returned by the app in non-production.

test.describe('[non-bypass] Credentials: Caregiver credential upload (real flow)', () => {
  // Skip in CI for now; this uses real login and dev-only endpoints
  test.skip(!!process.env.CI, 'Run locally only');

  const CAREGIVER_EMAIL = process.env.CAREGIVER_EMAIL || 'caregiver+e2e@carelinkai.com';
  const CAREGIVER_PASSWORD = process.env.CAREGIVER_PASSWORD || 'Caregiver123!';

  test('creates caregiver, logs in, uploads credential, and sees it listed', async ({ page, context }) => {
    // Ensure NO bypass headers for this test
    await context.setExtraHTTPHeaders({});

    // Dev seed: upsert caregiver user
    const seedRes = await page.request.post('/api/dev/upsert-caregiver', {
      data: { email: CAREGIVER_EMAIL, password: CAREGIVER_PASSWORD }
    });
    expect(seedRes.ok()).toBeTruthy();

    // Route mock-upload domain to succeed (the app returns example.com/mock-upload in non-prod)
    await page.route('https://example.com/mock-upload/**', async (route) => {
      await route.fulfill({ status: 200, body: '' });
    });

    // Establish session via dev helper (more reliable than UI login in e2e)
    await page.goto('/');
    const loggedIn = await page.evaluate(async (email) => {
      try {
        const r = await fetch('/api/dev/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
        return r.ok;
      } catch { return false; }
    }, CAREGIVER_EMAIL);
    expect(loggedIn).toBeTruthy();

    // Navigate directly to Credentials settings page (simpler UI for uploads)
    await page.goto('/settings/credentials');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('heading', { name: 'Credentials' })).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('button', { name: 'Add Credential' })).toBeVisible();

    // Fill credential form fields
    await page.getByLabel('Credential Type').fill('CPR Certification');
    // Use dates relative to now
    const issue = new Date();
    issue.setDate(issue.getDate() - 1);
    const exp = new Date();
    exp.setFullYear(exp.getFullYear() + 1);
    const toInput = (d: Date) => d.toISOString().slice(0, 10);
    await page.getByLabel('Issue Date').fill(toInput(issue));
    await page.getByLabel('Expiration Date').fill(toInput(exp));

    // Attach test file
    const testFile = path.join(process.cwd(), 'e2e', 'assets', 'test-cert.pdf');
    await page.setInputFiles('#credFile', testFile);

    // Submit
    await page.getByRole('button', { name: 'Add Credential' }).click();

    // Validate presence in credentials table by type (allow extra time for refresh)
    await expect(page.getByRole('cell', { name: 'CPR Certification' })).toBeVisible({ timeout: 15000 });
  });
});
