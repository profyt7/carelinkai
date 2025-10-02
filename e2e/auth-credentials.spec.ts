import { test, expect } from '@playwright/test';

// Non-bypass credential login flow using seeded admin user
test.describe('Auth: Credentials login (real flow)', () => {
  test('signs in with seeded admin and reaches dashboard', async ({ page, context }) => {
    // Ensure middleware bypass headers are not present for this test
    await context.setExtraHTTPHeaders({});

    await page.goto('/auth/login');
    await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible();

    await page.getByLabel('Email address').fill(process.env.ADMIN_EMAIL || 'admin@carelinkai.com');
    await page.getByLabel('Password').fill(process.env.ADMIN_PASSWORD || 'Admin123!');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByText(/Dashboard/i)).toBeVisible();
  });
});
