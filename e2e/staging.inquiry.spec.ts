import { test, expect } from '@playwright/test';

// Minimal staging probe to ensure the inquiry endpoint is live.
// Uses real login (no dev helpers) and checks POST /api/inquiries is not 404.

test.describe('[non-bypass] Staging: Family login → inquiry endpoint presence', () => {
  test('[non-bypass] family can sign in and POST /api/inquiries is reachable', async ({ page, request }) => {
    const famEmail = process.env.FAMILY_EMAIL as string;
    const famPass = process.env.FAMILY_PASS as string;
    expect(famEmail, 'FAMILY_EMAIL must be set').toBeTruthy();
    expect(famPass, 'FAMILY_PASS must be set').toBeTruthy();

    // Login via UI
    await page.goto('/auth/login');
    await page.getByLabel('Email address').fill(famEmail);
    await page.getByLabel('Password').fill(famPass);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL(/\/dashboard/i, { timeout: 30000 });

    // Probe the inquiries API. We don't assert 200 because business validation
    // may return 400/404 if homeId is invalid. The goal is to avoid route-level 404.
    const res = await request.post('/api/inquiries', {
      data: { homeId: '1', message: 'Staging E2E probe' },
    });
    // Ensure the route exists (not Next.js 404)
    expect(res.status(), 'POST /api/inquiries should not be route-level 404').not.toBe(404);
  });
});
