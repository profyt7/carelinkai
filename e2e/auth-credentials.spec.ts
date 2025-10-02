import { test, expect } from '@playwright/test';

// Non-bypass credential login flow using seeded admin user
test.describe('Auth: Credentials login (real flow)', () => {
  test('signs in with seeded admin and reaches dashboard', async ({ page, context }) => {
    // Ensure middleware bypass headers are not present for this test
    await context.setExtraHTTPHeaders({});

    // Make sure admin user exists and is active (dev-only endpoint)
    const res = await page.request.post('/api/dev/upsert-admin', {
      data: { email: process.env.ADMIN_EMAIL || 'admin@carelinkai.com', password: process.env.ADMIN_PASSWORD || 'Admin123!' }
    });
    expect(res.ok()).toBeTruthy();

    await page.goto('/auth/login');
    await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible();

    await page.getByLabel('Email address').fill(process.env.ADMIN_EMAIL || 'admin@carelinkai.com');
    await page.getByLabel('Password').fill(process.env.ADMIN_PASSWORD || 'Admin123!');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByText(/Dashboard/i)).toBeVisible();
  });
});
