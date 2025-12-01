import { test, expect } from '@playwright/test';

const FAMILY_EMAIL = process.env.E2E_FAMILY_EMAIL || 'family.demo1@carelinkai.com';
const FAMILY_PASS = process.env.E2E_FAMILY_PASS || 'Family123!';
const OP_EMAIL = process.env.E2E_OPERATOR_EMAIL || 'operator@carelinkai.com';
const OP_PASS = process.env.E2E_OPERATOR_PASS || 'Operator123!';

async function uiLogin(page, email: string, password: string) {
  await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });
  await page.getByLabel(/Email address/i).fill(email);
  await page.getByLabel(/Password/i).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  // Either dashboard or search depending on role
  await page.waitForURL('**/{dashboard,search,operator,marketplace,settings}**', { timeout: 30000 }).catch(() => {});
}

test('Family → inquiry → Operator lead management', async ({ browser, request }) => {
  const uniq = `E2E-${Date.now()}`;

  // 1) Login as operator to pick a home ID owned by this operator
  const opCtx1 = await browser.newContext();
  const opPage1 = await opCtx1.newPage();
  await uiLogin(opPage1, OP_EMAIL, OP_PASS);
  // Get operator homes via same-origin API
  let opHome = await opPage1.evaluate(async () => {
    const r = await fetch('/api/operator/homes', { credentials: 'include' });
    if (!r.ok) return null;
    const j: any = await r.json();
    const first = (j.homes || [])[0] || null;
    return first ? { id: first.id as string, name: first.name as string } : null;
  });
  if (!opHome) {
    // Create a minimal home for this operator so we can proceed
    const created = await opPage1.evaluate(async () => {
      const payload = {
        name: `E2E Home ${Date.now()}`,
        description: 'E2E seeded home',
        careLevel: ['ASSISTED_LIVING'],
        capacity: 4,
        priceMin: 3000,
        priceMax: 5000,
        address: { street: '1 Test Way', city: 'Testville', state: 'CA', zipCode: '90001' },
      };
      const r = await fetch('/api/operator/homes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!r.ok) return null;
      const j: any = await r.json();
      return j.home ? { id: j.home.id as string, name: j.home.name as string } : null;
    });
    opHome = created;
  }
  await opCtx1.close();

  expect(opHome, 'Operator must have at least one home for this test').toBeTruthy();
  const homeId: string = (opHome as any).id;
  const homeName: string = (opHome as any).name;

  // 2) Login as family and submit inquiry to that home via API
  const famCtx = await browser.newContext();
  const famPage = await famCtx.newPage();
  // Best-effort: ensure family exists (dev endpoint may be disabled on staging; ignore failures)
  try {
    const r = await request.post('/api/dev/upsert-family', { data: { email: FAMILY_EMAIL } });
    if (!r.ok()) {
      // ignore
    }
  } catch {}
  await uiLogin(famPage, FAMILY_EMAIL, FAMILY_PASS);

  const inquiryRes = await famPage.evaluate(async ({ homeId, uniq }) => {
    const payload = {
      homeId,
      name: `${uniq} Family`,
      email: `${uniq.toLowerCase()}@example.com`,
      careNeeded: ['Assisted Living'],
      message: `Inquiry ${uniq}`,
      source: 'e2e'
    };
    const r = await fetch('/api/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    let j: any = null;
    try { j = await r.json(); } catch {}
    return { ok: r.ok, status: r.status, id: j?.id as string | null };
  }, { homeId, uniq });

  expect(inquiryRes.ok, `POST /api/inquiries failed (${inquiryRes.status})`).toBeTruthy();
  await famCtx.close();

  // 3) Login as operator and verify new lead appears; open it and manage status/notes
  const opCtx2 = await browser.newContext();
  const opPage2 = await opCtx2.newPage();
  await uiLogin(opPage2, OP_EMAIL, OP_PASS);

  await opPage2.goto('/operator/inquiries', { waitUntil: 'domcontentloaded' });

  // Row should contain the home name and link to detail; assume newest first
  const rowLink = opPage2.locator('table a').filter({ hasText: homeName }).first();
  await expect(rowLink).toBeVisible({ timeout: 30000 });
  await rowLink.click();

  // On detail page, confirm the unique message is visible
  await expect(opPage2.getByRole('heading', { name: /Lead - /i })).toBeVisible({ timeout: 30000 });
  await expect(opPage2.locator('pre')).toContainText(uniq, { timeout: 30000 });

  // Update status (assumes a single select is present for status)
  const statusSelect = opPage2.locator('select').first();
  await statusSelect.selectOption('CONTACTED').catch(async () => {
    // Fallback: try by label text context
    await opPage2.locator('text=Lead Status').locator('xpath=following::select[1]').first().selectOption('CONTACTED');
  });

  // Save internal notes
  const notes = `Notes ${uniq}`;
  const notesBox = opPage2.getByRole('textbox');
  await notesBox.fill(notes);
  await opPage2.getByRole('button', { name: /Save Notes/i }).click();

  // Reload and verify notes persisted
  await opPage2.reload({ waitUntil: 'domcontentloaded' });
  await expect(opPage2.getByRole('textbox')).toHaveValue(notes);

  await opCtx2.close();
});
