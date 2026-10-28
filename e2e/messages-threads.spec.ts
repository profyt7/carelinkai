import { test, expect } from '@playwright/test';
import { loginAs } from './_helpers';

test('messages: threads list, open, and send message', async ({ page, request }) => {
  // Seed users
  await request.post('/api/dev/upsert-operator', { data: { email: 'op-msg1@example.com', companyName: 'Msg Co' } });
  const caregiver = await (await request.post('/api/dev/upsert-caregiver', { data: { email: 'care-msg1@example.com', firstName: 'Care', lastName: 'Giver' } })).json();

  // Login as operator and create initial message to caregiver to ensure a thread exists
  await loginAs(page, 'op-msg1@example.com');
  await page.evaluate(async (receiverId: string) => {
    const r = await fetch(`${location.origin}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ receiverId, content: 'Hello from operator' }),
    });
    if (!r.ok) throw new Error('seed message failed');
  }, caregiver.id as string);

  // Visit messages and expect the caregiver thread to appear
  await page.goto('/messages', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Care Giver').first()).toBeVisible({ timeout: 15000 });

  // Open the thread
  await page.getByText('Care Giver').first().click();
  await expect(page.getByText('Hello from operator').first()).toBeVisible();

  // Send a reply
  const input = page.getByPlaceholder('Type a message...');
  await input.fill('Reply from operator');
  await input.press('Enter');

  // The new message should appear
  await expect(page.getByText('Reply from operator').first()).toBeVisible({ timeout: 10000 });
});
