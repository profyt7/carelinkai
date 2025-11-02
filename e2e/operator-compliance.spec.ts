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

    // Dev login instead of UI login (more stable in e2e)
    await page.goto('/');
    const loggedIn = await page.evaluate(async (email) => {
      try {
        const r = await fetch('/api/dev/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
        return r.ok;
      } catch { return false; }
    }, OP_EMAIL);
    expect(loggedIn).toBeTruthy();

    // Navigate to Compliance
    await page.goto('/operator/compliance');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByText('Compliance')).toBeVisible();

    // Create a License via API (multipart)
    const exp = new Date(); exp.setDate(exp.getDate() + 30);
    const iss = new Date(); iss.setDate(iss.getDate() - 1);
    const licenseId: string = await page.evaluate(async ({ homeId, iss, exp }) => {
      const fd = new FormData();
      fd.append('type', 'General');
      fd.append('licenseNumber', 'E2E-12345');
      fd.append('issueDate', iss);
      fd.append('expirationDate', exp);
      fd.append('status', 'ACTIVE');
      const blob = new Blob([new Uint8Array([1,2,3,4])], { type: 'application/pdf' });
      fd.append('file', blob, 'test-cert.pdf');
      const r = await fetch(`/api/operator/homes/${homeId}/licenses`, { method: 'POST', body: fd, headers: { 'x-e2e-bypass': '1' } as any });
      if (!r.ok) throw new Error('license create failed');
      const j = await r.json();
      return j.licenseId as string;
    }, { homeId, iss: iss.toISOString().slice(0,10), exp: exp.toISOString().slice(0,10) });

    // Create an Inspection via API (multipart)
    const inspectionId: string = await page.evaluate(async ({ homeId }) => {
      const fd = new FormData();
      fd.append('inspectionType', 'Routine');
      fd.append('inspector', 'State Inspector');
      fd.append('result', 'PASSED');
      fd.append('inspectionDate', new Date().toISOString().slice(0,10));
      fd.append('findings', 'All good');
      const blob = new Blob([new Uint8Array([5,6,7,8])], { type: 'application/pdf' });
      fd.append('file', blob, 'test-cert.pdf');
      const r = await fetch(`/api/operator/homes/${homeId}/inspections`, { method: 'POST', body: fd, headers: { 'x-e2e-bypass': '1' } as any });
      if (!r.ok) throw new Error('inspection create failed');
      const j = await r.json();
      return j.inspectionId as string;
    }, { homeId });

    // Reload the page and verify the entries appear
    await page.reload({ waitUntil: 'domcontentloaded' });

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
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByText('E2E-12345')).toHaveCount(0);

    // Delete inspection via UI and confirm dialog
    page.once('dialog', d => d.accept());
    await page.locator('div', { hasText: 'State Inspector' }).locator('button:has-text("Delete")').click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByText('State Inspector')).toHaveCount(0);
  });
});
