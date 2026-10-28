import { test, expect } from '@playwright/test';
import { loginAs, upsertOperator } from './_helpers';

test('messages: start a new thread via New message picker and send first message', async ({ page, request }) => {
  const opEmail = 'op-newthread@example.com';
  const cgA = { email: 'care-newthread-a@example.com', firstName: 'Echo', lastName: 'Charlie' };
  const cgB = { email: 'care-newthread-b@example.com', firstName: 'Foxtrot', lastName: 'Delta' };

  // Seed operator and caregivers
  await upsertOperator(request, opEmail, { companyName: 'Msg Co' });
  await request.post('/api/dev/upsert-caregiver', { data: cgA });
  await request.post('/api/dev/upsert-caregiver', { data: cgB });

  // Login as operator and create employments for both caregivers
  await loginAs(page, opEmail);
  const employ = async (email: string) => {
    const r = await page.evaluate(async (e) => {
      const res = await fetch(`${location.origin}/api/operator/caregivers`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ caregiverEmail: e, position: 'Caregiver' }),
      });
      return { ok: res.ok, status: res.status };
    }, email);
    if (!employ.ok) throw new Error(`employment failed: ${employ.status}`);
  };
  await employ(cgA.email);
  await employ(cgB.email);

  // Navigate to messages
  await page.goto('/messages', { waitUntil: 'domcontentloaded' });

  // Start a new message
  await page.getByRole('button', { name: 'New message' }).click();
  const picker = page.getByPlaceholder('Search caregivers by name or email');
  await picker.fill('Echo');
  await expect(page.getByText('Echo Charlie')).toBeVisible();
  await page.getByRole('button', { name: /Echo Charlie/ }).click();

  // Send first message
  const editor = page.getByRole('textbox');
  await editor.fill('hello new thread');
  await page.keyboard.press('Enter');

  // Verify message appears in conversation
  await expect(page.getByText('hello new thread').first()).toBeVisible({ timeout: 15000 });

  // Verify thread list shows this conversation and last message snippet
  await expect(page.getByText('Echo Charlie').first()).toBeVisible();
  await expect(page.getByText(/hello new thread/).first()).toBeVisible();
});
