import { test, expect } from '@playwright/test';
import { loginAs } from './_helpers';

test('messages: inbound message appears in real-time without reload', async ({ page, request, browser }) => {
  // Seed operator and caregiver
  const opEmail = 'op-rt@example.com';
  const cgEmail = 'care-rt@example.com';
  await request.post('/api/dev/upsert-operator', { data: { email: opEmail, companyName: 'Msg Co' } });
  const cg = await (await request.post('/api/dev/upsert-caregiver', { data: { email: cgEmail, firstName: 'Care', lastName: 'RT' } })).json();

  // Ensure operator userId for sending target
  const ensured = await (await request.post('/api/dev/activate-user', { data: { email: opEmail } })).json();
  const opId = (ensured.userId || ensured.id) as string;

  // Operator opens Messages (subscribes to SSE)
  await loginAs(page, opEmail);
  await page.goto('/messages', { waitUntil: 'domcontentloaded' });
  // Initially, caregiver thread may not exist yet

  // Create a separate browser page as the caregiver to send a message to operator
  const ctx = await browser.newContext();
  const sender = await ctx.newPage();
  await loginAs(sender, cgEmail);
  await sender.evaluate(async (receiverId: string) => {
    const r = await fetch(`${location.origin}/api/messages`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ receiverId, content: 'Realtime hello' })
    });
    if (!r.ok) throw new Error('send failed');
  }, opId);
  await sender.close();
  await ctx.close();

  // Operator page should update without reload
  await expect(page.getByText('Care RT').first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Realtime hello').first()).toBeVisible();
});
