import { test, expect } from '@playwright/test';

// Assumptions:
// - Dev endpoints are enabled in CI via dev server with ALLOW_DEV_ENDPOINTS=1
// - We create an operator and login via /api/dev endpoints
// - DocumentsPanel uses a simple URL-based upload (no presigned flows in tests)

test('resident documents: add and delete document via UI', async ({ page, request }) => {
  await page.goto('/');

  // 1) Seed operator and login
  const up = await request.post('/api/dev/upsert-operator', {
    data: { email: 'op-docs@example.com', companyName: 'Docs Ops', homes: [{ name: 'Docs Home', capacity: 5 }] },
  });
  expect(up.ok()).toBeTruthy();

  const devLoginOk = await page.evaluate(async () => {
    const r = await fetch(`${location.origin}/api/dev/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'op-docs@example.com' })
    });
    return r.ok;
  });
  expect(devLoginOk).toBeTruthy();

  // 2) Create family and resident
  const family = await page.evaluate(async () => {
    const r = await fetch(`${location.origin}/api/user/family`, { credentials: 'include' });
    if (!r.ok) throw new Error('family failed');
    return r.json();
  });

  const residentId = await page.evaluate(async (args) => {
    const r = await fetch(`${location.origin}/api/residents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        familyId: args.familyId,
        firstName: 'Doc',
        lastName: ' Test',
        dateOfBirth: '1955-05-05',
        gender: 'MALE',
        status: 'ACTIVE'
      }),
    });
    if (!r.ok) throw new Error('resident create failed');
    const j = await r.json();
    return j.id as string;
  }, { familyId: (family.familyId as string) });

  // 3) Navigate to resident page and open Documents panel
  await page.goto(`/operator/residents/${residentId}`);
  await expect(page.getByRole('heading', { name: 'Documents' })).toBeVisible();

  // 4) Fill document form and add
  await page.getByPlaceholder('Title').fill('E2E Policy PDF');
  await page.getByPlaceholder('File URL (https://...)').fill('https://example.com/policy.pdf');
  await page.getByPlaceholder('MIME Type (e.g. application/pdf)').fill('application/pdf');
  await page.getByPlaceholder('Size (bytes)').fill('12345');
  await page.getByRole('button', { name: 'Add' }).click();

  // Verify presence via table text and API fallback
  await expect(page.getByText('E2E Policy PDF').first()).toBeVisible({ timeout: 10000 });
  const countAfterAdd = await page.evaluate(async (rid) => {
    const r = await fetch(`${location.origin}/api/residents/${rid}/documents?limit=10`, { credentials: 'include' });
    if (!r.ok) return 0;
    const j = await r.json();
    return (j.items || []).length as number;
  }, residentId);
  expect(countAfterAdd).toBeGreaterThan(0);

  // 5) Delete the document (handle confirm dialog)
  page.once('dialog', (d) => d.accept());
  await page.getByRole('row', { name: /E2E Policy PDF/ }).getByRole('button', { name: 'Delete' }).click();

  // Verify deletion via API
  const countAfterDelete = await page.evaluate(async (rid) => {
    const r = await fetch(`${location.origin}/api/residents/${rid}/documents?limit=10`, { credentials: 'include' });
    if (!r.ok) return 0;
    const j = await r.json();
    return (j.items || []).length as number;
  }, residentId);
  expect(countAfterDelete).toBe(0);
});
