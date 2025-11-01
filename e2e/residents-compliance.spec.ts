import { test, expect } from '@playwright/test';

// [non-bypass] to run only in the non-bypass project locally
test.describe('[non-bypass] Operator Residents: Compliance end-to-end', () => {
  test.skip(!!process.env.CI, 'Run locally only');

  const OP_EMAIL = process.env.OP_EMAIL || 'operator+e2e@carelinkai.com';
  const OP_PASSWORD = process.env.OP_PASSWORD || 'Operator123!';

  test('create resident, add compliance item, mark complete, verify summary', async ({ page, context }) => {
    // Seed operator and a home
    const seedRes = await page.request.post('/api/dev/upsert-operator', {
      data: { email: OP_EMAIL, password: OP_PASSWORD, companyName: 'E2E Operator Inc.' },
    });
    expect(seedRes.ok()).toBeTruthy();
    const seed = await seedRes.json();
    const homeId: string = seed.homeId;

    // Establish session via dev helper to avoid UI flakiness in CI-like runs
    const devLogin = await page.request.post('/api/dev/login', { data: { email: OP_EMAIL } });
    expect(devLogin.ok()).toBeTruthy();
    await page.goto('/dashboard');

    // Verify server-side session established (whoami)
    {
      const deadline = Date.now() + 15000;
      let ok = false;
      while (Date.now() < deadline) {
        const body = await page.evaluate(async () => {
          try {
            const res = await fetch('/api/dev/whoami', { credentials: 'include' });
            if (!res.ok) return null;
            return await res.json();
          } catch { return null; }
        });
        if (body?.session?.user?.email) { ok = true; break; }
        await page.waitForTimeout(200);
      }
      expect(ok).toBeTruthy();
    }

    // Acquire/ensure a familyId to associate the resident
    const famRes = await page.request.get('/api/user/family');
    expect(famRes.ok()).toBeTruthy();
    const famJson = await famRes.json();
    const familyId: string = famJson.familyId;

    // Create a resident associated with this operator's home
    const newRes = await page.request.post('/api/residents', {
      data: {
        familyId,
        homeId,
        firstName: 'E2E',
        lastName: 'Resident',
        dateOfBirth: '1940-01-01',
        gender: 'FEMALE',
        status: 'ACTIVE',
      }
    });
    expect(newRes.ok()).toBeTruthy();
    const created = await newRes.json();
    const residentId: string = created.id;

    // Navigate to resident detail
    await page.goto(`/operator/residents/${residentId}`);
    await expect(page.getByText('Compliance')).toBeVisible();

    // Initially completed should be 0 for a fresh resident
    const summarySel = page.locator('section.card >> text=Compliance').locator('..');
    await expect(page.getByText('Completed: 0')).toBeVisible();

    // Add a compliance item via UI
    await page.getByLabel('Title').fill('Initial Care Plan Review');
    await page.getByRole('button', { name: 'Add' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Initial Care Plan Review')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('OPEN')).toBeVisible();

    // Mark it complete
    await page.getByRole('button', { name: 'Mark complete' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('COMPLETED')).toBeVisible({ timeout: 10000 });

    // Summary should reflect 0 open, 1 completed (dueSoon/overdue may vary if no dueDate)
    await expect(page.getByText('Open: 0')).toBeVisible();
    await expect(page.getByText('Completed: 1')).toBeVisible();

    // Cross-check via API summary
    const sum = await page.request.get(`/api/residents/${residentId}/compliance/summary`);
    expect(sum.ok()).toBeTruthy();
    const s = await sum.json();
    expect(s.open).toBe(0);
    expect(s.completed).toBe(1);
  });
});
