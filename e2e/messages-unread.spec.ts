import { test, expect } from '@playwright/test';
import { loginAs } from './_helpers';

test('messages: unread badge shows for new inbound message and clears after view', async ({ page, request }) => {
  // Seed users
  const opEmail = 'op-msg2@example.com';
  const cgEmail = 'care-msg2@example.com';
  await request.post('/api/dev/upsert-operator', { data: { email: opEmail, companyName: 'Msg Co' } });
  const caregiver = await (await request.post('/api/dev/upsert-caregiver', { data: { email: cgEmail, firstName: 'Care', lastName: 'Giver' } })).json();

  // Create a message FROM caregiver TO operator to generate unread for operator
  await loginAs(page, cgEmail);
  const opUserId = await page.evaluate(async (email: string) => {
    const r = await fetch(`${location.origin}/api/dev/whoami`, { credentials: 'include' });
    const me = await r.json();
    // We don't have an endpoint to fetch user by email; use messages POST directly to receiverId via server
    return me.user?.id as string;
  }, cgEmail);

  // We need operator's userId; fetch via dev/activate-user by email? Fallback: hit /api/dev/activate-user to ensure and return id
  const ensureOp = await request.post('/api/dev/activate-user', { data: { email: opEmail } });
  const ensureOpJson = await ensureOp.json();
  const opId = (ensureOpJson.userId || ensureOpJson.id) as string;

  await page.evaluate(async (receiverId: string) => {
    const r = await fetch(`${location.origin}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ receiverId, content: 'New message for operator' }),
    });
    if (!r.ok) throw new Error('seed inbound message failed');
  }, opId);

  // Now login as operator and check unread badge
  await loginAs(page, opEmail);
  await page.goto('/messages', { waitUntil: 'domcontentloaded' });
  const thread = page.getByText('Care Giver').first();
  await expect(thread).toBeVisible({ timeout: 15000 });

  // Badge "1" should be visible inside the thread item
  const item = thread.locator('xpath=ancestor::div[contains(@class, "p-4")]');
  await expect(item.getByText('1')).toBeVisible();

  // Open thread to mark as read (server-side); then reload to refresh thread list
  await thread.click();
  await expect(page.getByText('New message for operator').first()).toBeVisible();
  await page.reload();

  // After reload, unread badge should disappear
  await expect(page.getByText('Care Giver').first()).toBeVisible();
  const itemAfter = page.getByText('Care Giver').first().locator('xpath=ancestor::div[contains(@class, "p-4")]');
  await expect(itemAfter.getByText('1')).toHaveCount(0);
});
