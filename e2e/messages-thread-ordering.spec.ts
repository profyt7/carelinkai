import { test, expect } from '@playwright/test';
import { loginAs } from './_helpers';

test('messages: threads order updates by latest activity', async ({ page, request }) => {
  const opEmail = 'op-order@example.com';
  const cgA = { email: 'care-a@example.com', firstName: 'Alpha', lastName: 'One' };
  const cgB = { email: 'care-b@example.com', firstName: 'Bravo', lastName: 'Two' };

  // Seed users
  await request.post('/api/dev/upsert-operator', { data: { email: opEmail, companyName: 'Msg Co' } });
  const cgARes = await (await request.post('/api/dev/upsert-caregiver', { data: cgA })).json();
  const cgBRes = await (await request.post('/api/dev/upsert-caregiver', { data: cgB })).json();

  // Login as operator
  await loginAs(page, opEmail);

  // Create initial messages so both threads exist
  await page.evaluate(async ({ aId, bId }) => {
    const send = async (receiverId: string, content: string) => {
      const r = await fetch(`${location.origin}/api/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ receiverId, content })
      });
      if (!r.ok) throw new Error('seed message failed');
    };
    await send(aId, 'hi A');
    await send(bId, 'hi B earlier');
  }, { aId: cgARes.id as string, bId: cgBRes.id as string });

  // Now send a newer message to A so A should be first
  await page.evaluate(async (aId: string) => {
    const r = await fetch(`${location.origin}/api/messages`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ receiverId: aId, content: 'latest to A' })
    });
    if (!r.ok) throw new Error('latest message failed');
  }, cgARes.id as string);

  await page.goto('/messages', { waitUntil: 'domcontentloaded' });

  // Verify both threads visible
  const aItem = page.getByText('Alpha One').first();
  const bItem = page.getByText('Bravo Two').first();
  await expect(aItem).toBeVisible({ timeout: 15000 });
  await expect(bItem).toBeVisible();

  // Check order: A should appear before B
  const items = page.locator('div.border-b.p-4');
  const texts = await items.allTextContents();
  const idxA = texts.findIndex(t => t.includes('Alpha One'));
  const idxB = texts.findIndex(t => t.includes('Bravo Two'));
  expect(idxA).toBeGreaterThanOrEqual(0);
  expect(idxB).toBeGreaterThanOrEqual(0);
  expect(idxA).toBeLessThan(idxB);
});
