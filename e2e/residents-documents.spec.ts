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

  // Resolve operator home id to ensure resident is within accessible scope
  const homeId = await page.evaluate(async () => {
    const r = await fetch(`${location.origin}/api/operator/homes`, { credentials: 'include' });
    if (!r.ok) return null;
    const j = await r.json();
    return (j.homes && j.homes.length > 0) ? (j.homes[0].id as string) : null;
  });

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
        homeId: args.homeId,
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
  }, { familyId: (family.familyId as string), homeId });

  // 3) Navigate to resident page and open Documents panel
  await page.goto(`/operator/residents/${residentId}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Documents' })).toBeVisible();

  // 4) Fill document form and add
  await page.getByPlaceholder('Title').fill('E2E Policy PDF');
  await page.getByPlaceholder('File URL (https://...)').fill('https://example.com/policy.pdf');
  await page.getByPlaceholder('MIME Type (e.g. application/pdf)').fill('application/pdf');
  await page.getByPlaceholder('Size (bytes)').fill('12345');
  await page
    .locator('form')
    .filter({ has: page.getByPlaceholder('File URL (https://...)') })
    .getByRole('button', { name: 'Add' })
    .click();

  // Wait for API to reflect the new document (robust against UI rendering delays)
  const countAfterAdd = await page.evaluate(async (rid) => {
    const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
    for (let i = 0; i < 30; i++) {
      try {
        const r = await fetch(`${location.origin}/api/residents/${rid}/documents?limit=10`, { credentials: 'include' });
        if (r.ok) {
          const j = await r.json();
          const n = (j.items || []).length as number;
          if (n > 0) return n;
        }
      } catch {}
      await sleep(200);
    }
    return 0;
  }, residentId);
  expect(countAfterAdd).toBeGreaterThan(0);

  // Ensure UI reflects the new document (reload to avoid any client-side stale state)
  await page.reload();
  await expect(page.getByText('E2E Policy PDF').first()).toBeVisible({ timeout: 10000 });
  // 5) Delete the document (handle confirm dialog) and wait for DELETE request
  page.once('dialog', (d) => d.accept());
  await Promise.all([
    page.waitForResponse((r) => r.url().includes(`/api/residents/${residentId}/documents/`) && r.request().method() === 'DELETE' && r.status() === 200),
    page.getByRole('row', { name: /E2E Policy PDF/ }).getByRole('button', { name: 'Delete' }).click(),
  ]);

  // Verify deletion via API
  // Verify deletion via API with retries
  const countAfterDelete = await page.evaluate(async (rid) => {
    const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
    for (let i = 0; i < 20; i++) {
      try {
        const r = await fetch(`${location.origin}/api/residents/${rid}/documents?limit=10`, { credentials: 'include' });
        if (r.ok) {
          const j = await r.json();
          const n = (j.items || []).length as number;
          if (n === 0) return 0;
        }
      } catch {}
      await sleep(200);
    }
    return 1;
  }, residentId);
  expect(countAfterDelete).toBe(0);
});
