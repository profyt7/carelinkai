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

    // Wait for NextAuth cookie to appear (dev: next-auth.session-token; prod: __Secure-next-auth.session-token)
    const cookieDeadline = Date.now() + 20000;
    let haveSessionCookie = false;
    while (Date.now() < cookieDeadline) {
      const cookies = await context.cookies('http://localhost:3000');
      if (cookies.some(c => c.name.includes('next-auth.session-token'))) {
        haveSessionCookie = true;
        break;
      }
      await page.waitForTimeout(200);
    }
    expect(haveSessionCookie).toBeTruthy();

    // Ensure we end up on dashboard
    await expect(page).toHaveURL(/.*dashboard/);

    // Wait for any loading state to clear (DashboardLayout shows "Loading..." while hydrating)
    const loading = page.getByText('Loading...');
    await loading.waitFor({ state: 'detached', timeout: 15000 }).catch(() => undefined);

    // Assert a stable dashboard marker: title heading or welcome text
    await expect(page.getByText(/Welcome back/i)).toBeVisible({ timeout: 15000 });
  });
});
