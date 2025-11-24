import { test, expect } from '@playwright/test';
import { loginAs } from './_helpers';

test('messages: search filters thread list by name and last message', async ({ page, request }) => {
  const opEmail = 'op-search@example.com';
  const cgA = { email: 'care-search-a@example.com', firstName: 'Charlie', lastName: 'Alpha' };
  const cgB = { email: 'care-search-b@example.com', firstName: 'Delta', lastName: 'Bravo' };

  // Seed users
  await request.post('/api/dev/upsert-operator', { data: { email: opEmail, companyName: 'Msg Co' } });
  const cgARes = await (await request.post('/api/dev/upsert-caregiver', { data: cgA })).json();
  const cgBRes = await (await request.post('/api/dev/upsert-caregiver', { data: cgB })).json();

  // Login as operator and create messages to both
  await loginAs(page, opEmail);
  await page.evaluate(async ({ aId, bId }) => {
    const send = async (receiverId: string, content: string) => {
      const r = await fetch(`${location.origin}/api/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ receiverId, content })
      });
      if (!r.ok) throw new Error('seed message failed');
    };
    await send(aId, 'first to Charlie');
    await send(bId, 'unique-keyword-zulu');
  }, { aId: cgARes.id as string, bId: cgBRes.id as string });

  await page.goto('/messages', { waitUntil: 'domcontentloaded' });

  // Both threads visible
  await expect(page.getByText('Charlie Alpha').first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Delta Bravo').first()).toBeVisible();

  const search = page.getByPlaceholder('Search messages');

  // Filter by name (brav -> Delta Bravo only)
  await search.fill('brav');
  await expect(page.getByText('Delta Bravo').first()).toBeVisible();
  await expect(page.getByText('Charlie Alpha').first()).toHaveCount(0);

  // Filter by last message content keyword
  await search.fill('zulu');
  await expect(page.getByText('Delta Bravo').first()).toBeVisible();

  // Clear search shows both
  await search.fill('');
  await expect(page.getByText('Charlie Alpha').first()).toBeVisible();
  await expect(page.getByText('Delta Bravo').first()).toBeVisible();
});
