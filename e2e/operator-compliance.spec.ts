import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('[non-bypass] Operator Compliance: upload license and inspection (real flow)', () => {
  test.skip(!!process.env.CI, 'Run locally only');

  const OP_EMAIL = process.env.OP_EMAIL || 'operator+e2e@carelinkai.com';
  const OP_PASSWORD = process.env.OP_PASSWORD || 'Operator123!';

  test('seed operator, login, create license and inspection, verify download + delete flows', async ({ page, context }) => {
    await context.setExtraHTTPHeaders({});

    // Seed operator + home
    const seedRes = await page.request.post('/api/dev/upsert-operator', {
      data: { email: OP_EMAIL, password: OP_PASSWORD, companyName: 'E2E Operator Inc.' },
    });
    expect(seedRes.ok()).toBeTruthy();
    const seed = await seedRes.json();
    const homeId: string = seed.homeId;

    // Login via UI
    await page.goto('/auth/login');
    await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible();
    await page.getByLabel('Email address').fill(OP_EMAIL);
    await page.getByLabel('Password').fill(OP_PASSWORD);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    // Expect to land on dashboard
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 20000 });

    // Ensure server-side session is established
    {
      const deadline = Date.now() + 20000;
      let ok = false;
      while (Date.now() < deadline) {
        const r = await page.request.get('/api/dev/whoami');
        if (r.ok()) {
          const body = await r.json();
          if (body?.session?.user?.email) { ok = true; break; }
        }
        await page.waitForTimeout(200);
      }
      expect(ok).toBeTruthy();
    }

    // Navigate to Compliance
    await page.goto('/operator/compliance');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Compliance')).toBeVisible();

    // Create a License via API (multipart)
    const testFile = path.join(process.cwd(), 'e2e', 'assets', 'test-cert.pdf');
    const exp = new Date(); exp.setDate(exp.getDate() + 30); // within "soon" window
    const iss = new Date(); iss.setDate(iss.getDate() - 1);

    const form = await page.request.fetch(`/api/operator/homes/${homeId}/licenses`, {
      method: 'POST',
      multipart: {
        type: 'General',
        licenseNumber: 'E2E-12345',
        issueDate: iss.toISOString().slice(0,10),
        expirationDate: exp.toISOString().slice(0,10),
        status: 'ACTIVE',
        file: { name: 'test-cert.pdf', mimeType: 'application/pdf', buffer: await page.context().storageState().then(() => require('fs').readFileSync(testFile)) },
      } as any,
    });
    expect(form.ok()).toBeTruthy();
    const licJson = await form.json();
    const licenseId: string = licJson.licenseId;

    // Create an Inspection via API (multipart)
    const insp = await page.request.fetch(`/api/operator/homes/${homeId}/inspections`, {
      method: 'POST',
      multipart: {
        inspectionType: 'Routine',
        inspector: 'State Inspector',
        result: 'PASSED',
        inspectionDate: new Date().toISOString().slice(0,10),
        findings: 'All good',
        file: { name: 'test-cert.pdf', mimeType: 'application/pdf', buffer: require('fs').readFileSync(testFile) },
      } as any,
    });
    expect(insp.ok()).toBeTruthy();
    const inspJson = await insp.json();
    const inspectionId: string = inspJson.inspectionId;

    // Reload the page and verify the entries appear
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify license appears in the expiring list
    await expect(page.getByText('E2E-12345')).toBeVisible({ timeout: 10000 });
    // Verify download link exists and responds with redirect (no follow)
    await expect(page.locator(`a[href="/api/operator/homes/${homeId}/licenses/${licenseId}/download"]`)).toBeVisible();
    const licDl = await page.request.get(`/api/operator/homes/${homeId}/licenses/${licenseId}/download`, { maxRedirects: 0 } as any);
    expect(licDl.status()).toBe(302);

    // Verify inspection appears in list
    await expect(page.getByText('State Inspector')).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`a[href="/api/operator/homes/${homeId}/inspections/${inspectionId}/download"]`)).toBeVisible();
    const inspDl = await page.request.get(`/api/operator/homes/${homeId}/inspections/${inspectionId}/download`, { maxRedirects: 0 } as any);
    expect(inspDl.status()).toBe(302);

    // Delete license via UI and confirm dialog
    page.once('dialog', d => d.accept());
    await page.locator('div', { hasText: 'License #E2E-12345' }).locator('button:has-text("Delete")').click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('E2E-12345')).toHaveCount(0);

    // Delete inspection via UI and confirm dialog
    page.once('dialog', d => d.accept());
    await page.locator('div', { hasText: 'State Inspector' }).locator('button:has-text("Delete")').click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('State Inspector')).toHaveCount(0);
  });
});
