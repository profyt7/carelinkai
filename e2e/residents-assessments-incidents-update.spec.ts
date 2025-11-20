import { test, expect } from '@playwright/test';

test('edit assessment and incident inline', async ({ page, request }) => {
  page.on('console', (msg) => console.log('[browser]', msg.type(), msg.text()));
  page.on('response', async (res) => {
    const url = res.url();
    const method = res.request().method();
    if (url.includes('/api/residents/') && (url.includes('/assessments') || url.includes('/incidents')) && ['POST','PATCH','DELETE'].includes(method)) {
      console.log('[api]', method, url, res.status());
    }
  });
  await page.goto('/');

  // Seed operator and login
  await request.post('/api/dev/upsert-operator', { data: { email: 'op-ai2@example.com', companyName: 'AI Ops 2', homes: [{ name: 'AI Home 2', capacity: 4 }] } });
  await page.evaluate(async () => {
    await fetch(`${location.origin}/api/dev/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'op-ai2@example.com' }) });
  });

  // Resolve operator home id for RBAC-conformant access
  const homeId = await page.evaluate(async () => {
    const r = await fetch(`${location.origin}/api/operator/homes`, { credentials: 'include' });
    if (!r.ok) return null;
    const j = await r.json();
    return (j.homes && j.homes.length > 0) ? (j.homes[0].id as string) : null;
  });

  // Create family + resident
  const family = await page.evaluate(async () => {
    const r = await fetch(`${location.origin}/api/user/family`, { credentials: 'include' });
    return r.json();
  });
  const residentId = await page.evaluate(async (args) => {
    const r = await fetch(`${location.origin}/api/residents`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ familyId: args.familyId, homeId: args.homeId, firstName: 'Edit', lastName: 'Flow', dateOfBirth: '1940-02-02', gender: 'OTHER', status: 'ACTIVE' }) });
    const j = await r.json();
    return j.id as string;
  }, { familyId: (family.familyId as string), homeId });

  // Pre-seed initial assessment BEFORE navigation to remove race
  {
    const createA = await request.post(`/api/residents/${residentId}/assessments`, {
      data: { type: 'BPRS', score: 18 },
    });
    expect(createA.ok()).toBeTruthy();
    for (let i = 0; i < 50; i++) {
      const g = await request.get(`/api/residents/${residentId}/assessments?limit=10`);
      if (g.ok()) { const j = await g.json(); if ((j.items || []).some((it: any) => it.type === 'BPRS' && Number(it.score) === 18)) break; }
      await new Promise(r => setTimeout(r, 200));
    }
  }

  await page.goto(`/operator/residents/${residentId}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/BPRS \(score: 18\)/).first()).toBeVisible({ timeout: 30000 });

  // Edit assessment (scope to first list item in Assessments)
  const assessItem = page.getByRole('heading', { name: 'Assessments' }).locator('..').locator('li').first();
  await assessItem.getByRole('button', { name: 'Edit' }).click();
  await assessItem.getByPlaceholder('Type').fill('BPRS-Updated');
  await assessItem.getByPlaceholder('Score').fill('20');
  await Promise.all([
    page.waitForResponse((r) => r.url().includes(`/api/residents/${residentId}/assessments/`) && r.request().method() === 'PATCH' && r.status() >= 200 && r.status() < 400),
    assessItem.getByRole('button', { name: 'Save' }).click(),
  ]);
  await expect(page.getByText(/BPRS-Updated \(score: 20\)/).first()).toBeVisible({ timeout: 30000 });

  // Pre-seed incident BEFORE navigation as well, already done for assessment; verify visible item (Medication LOW)
  {
    const createI = await request.post(`/api/residents/${residentId}/incidents`, {
      data: { type: 'Medication', severity: 'LOW', occurredAt: new Date().toISOString() },
    });
    expect(createI.ok()).toBeTruthy();
    for (let i = 0; i < 50; i++) {
      const g = await request.get(`/api/residents/${residentId}/incidents?limit=10`);
      if (g.ok()) { const j = await g.json(); if ((j.items || []).some((it: any) => it.type === 'Medication' && String(it.severity).toUpperCase() === 'LOW')) break; }
      await new Promise(r => setTimeout(r, 200));
    }
  }
  await expect(page.getByText(/Medication \(severity: LOW\)/).first()).toBeVisible({ timeout: 30000 });

  // Edit incident
  const iItem = page.getByRole('heading', { name: 'Incidents' }).locator('..').locator('li').first();
  await iItem.scrollIntoViewIfNeeded();
  await iItem.getByRole('button', { name: 'Edit' }).click();
  // Wait for inline edit inputs to render after toggling edit mode
  await iItem.getByPlaceholder('Type').waitFor({ state: 'visible', timeout: 15000 });
  await iItem.getByPlaceholder('Severity').waitFor({ state: 'visible', timeout: 15000 });
  await iItem.getByPlaceholder('Type').fill('Medication Error');
  await iItem.getByPlaceholder('Severity').fill('HIGH');
  // Ensure the Save button is fully actionable (no overlays intercepting)
  const saveBtn = iItem.getByRole('button', { name: 'Save' });
  await saveBtn.scrollIntoViewIfNeeded();
  await saveBtn.waitFor({ state: 'visible' });
  await Promise.all([
    page.waitForResponse((r) => r.url().includes(`/api/residents/${residentId}/incidents/`) && r.request().method() === 'PATCH' && r.status() >= 200 && r.status() < 400),
    saveBtn.click({ force: true }),
  ]);
  await expect(page.getByText(/Medication Error \(severity: HIGH\)/).first()).toBeVisible({ timeout: 30000 });
});
