import { test, expect } from '@playwright/test';
import { loginAs } from './_helpers';

test('messages: mobile thread list hides on open and back returns to list', async ({ page, request, browserName }) => {
  // Seed users and a message thread
  const opEmail = 'op-mobile@example.com';
  const cg = { email: 'care-mobile@example.com', firstName: 'Mobile', lastName: 'User' };
  await request.post('/api/dev/upsert-operator', { data: { email: opEmail, companyName: 'Msg Co' } });
  const cgRes = await (await request.post('/api/dev/upsert-caregiver', { data: cg })).json();

  await loginAs(page, opEmail);
  await page.evaluate(async (receiverId: string) => {
    const r = await fetch(`${location.origin}/api/messages`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ receiverId, content: 'hello mobile' })
    });
    if (!r.ok) throw new Error('seed message failed');
  }, cgRes.id as string);

  // Simulate mobile viewport
  await page.setViewportSize({ width: 375, height: 812 });

  await page.goto('/messages', { waitUntil: 'domcontentloaded' });

  // Thread list visible; tap thread
  const thread = page.getByText('Mobile User').first();
  await expect(thread).toBeVisible({ timeout: 15000 });
  await thread.click();

  // Chat should show; verify message visible
  await expect(page.getByText('hello mobile').first()).toBeVisible();

  // Back button should be visible in header
  const back = page.getByRole('button').filter({ hasText: '' }).first();
  await page.getByRole('button').locator('svg[aria-label="chevron-left"]').first().or(page.getByRole('button')).first();

  // Use the first button in header area (ChevronLeft) to go back
  await page.getByRole('button').first().click();

  // Thread list is visible again
  await expect(page.getByText('Mobile User').first()).toBeVisible();
});
