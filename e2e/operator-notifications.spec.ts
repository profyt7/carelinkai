import { test, expect, request } from '@playwright/test';

test.describe('Operator Notifications (SSE)', () => {
  test('receives a toast when a notification is published (dev endpoint)', async ({ page, request }) => {
    // Open any page that renders DashboardLayout/NotificationCenter
    await page.goto('/dashboard');

    // Publish a dev notification to the test topic
    const payload = {
      topic: 'notifications:test',
      event: 'notify',
      payload: {
        title: 'Test Notification',
        message: 'This is a test notification from E2E.'
      }
    };

    const res = await request.post('/api/dev/notifications/publish', {
      data: payload,
    });
    expect(res.ok()).toBeTruthy();

    // Expect toast to appear
    await expect(page.getByText('Test Notification')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('This is a test notification from E2E.')).toBeVisible();
  });
});
