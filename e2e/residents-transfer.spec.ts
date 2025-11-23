import { test, expect } from '@playwright/test';
import { upsertOperator, loginAs, getOperatorHomes, getFamilyId, createResident } from './_helpers';

// Assumptions:
// - Dev endpoints are enabled in CI via npm run dev server with ALLOW_DEV_ENDPOINTS=1
// - Operator can transfer residents only within their homes (API enforces)
// - Residents list shows actions; home name is not displayed, so we verify via API

test('operator can transfer an ACTIVE resident between homes', async ({ page, request }) => {
  // Ensure page has an origin for relative fetch() calls inside page.evaluate
  await page.goto('/');
  const ts = Date.now();
  const HOME_A = `Transfer Home A ${ts}`;
  const HOME_B = `Transfer Home B ${ts}`;
  // 1) Ensure operator with two homes exists
  await upsertOperator(request, 'op-transfer@example.com', { companyName: 'Transfer Ops', homes: [
    { name: HOME_A, capacity: 10 },
    { name: HOME_B, capacity: 10 },
  ]});

  // 2) Log in as operator (browser context so auth cookie is set correctly)
  await loginAs(page, 'op-transfer@example.com');

  // Get authoritative homes list from authenticated operator context
  const operatorHomes = await getOperatorHomes(page);
  const namesToIds = new Map<string, string>(operatorHomes.map(h => [h.name, h.id]));
  const homeA = { id: namesToIds.get(HOME_A)!, name: HOME_A };
  const homeB = { id: namesToIds.get(HOME_B)!, name: HOME_B };

  // 3) Create family and resident directly via API, admitted to Home A
  // Create family for current user
  const familyId = await getFamilyId(page);
  const residentId = await createResident(page, { familyId, homeId: homeA.id, firstName: 'Trans', lastName: 'Fer' });

  // 4) Navigate to operator residents page
  await page.goto('/operator/residents');
  await expect(page.getByRole('heading', { name: 'Residents' })).toBeVisible();

  // 5) Find the exact row for this resident by Details link containing the residentId
  const row = page.locator('tr', { has: page.locator(`a[href="/operator/residents/${residentId}"]`) }).first();
  await row.getByRole('button', { name: 'Transfer' }).click();
  const select = row.locator('select');
  await select.waitFor({ state: 'visible' });
  await select.selectOption(homeB.id);
  await expect(select).toHaveValue(homeB.id);
  // Clicking Go triggers a location.reload() in the UI. Avoid networkidle due to SSE; wait for domcontentloaded
  await Promise.all([
    page.waitForLoadState('domcontentloaded'),
    row.getByRole('button', { name: 'Go' }).click(),
  ]);
  // Best-effort settle to avoid "execution context destroyed" during follow-up page.evaluate
  // Some environments trigger an additional reload; guard by waiting for 'load' with a short timeout.
  try {
    await page.waitForLoadState('load', { timeout: 5000 });
  } catch {}

  // 6) Verify via API the resident homeId is now Home B
  // Perform verification with retry in case a navigation happens mid-evaluate.
  async function readHomeId(): Promise<string> {
    return await page.evaluate(async (rid) => {
      const abs = `${location.origin}/api/residents/${rid}`;
      const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
      for (let i = 0; i < 100; i++) { // up to ~10s
        try {
          const r = await fetch(abs, { credentials: 'include' });
          if (r.ok) {
            const j = await r.json();
            const hid = j?.resident?.homeId ?? j?.homeId;
            if (hid) return hid as string;
          }
        } catch {}
        await sleep(100);
      }
      throw new Error('get resident failed (poll timeout)');
    }, residentId);
  }

  let newHomeId: string | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      newHomeId = await readHomeId();
      break;
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (msg.includes('Execution context was destroyed')) {
        // Wait for page to fully settle and retry
        try { await page.waitForLoadState('load', { timeout: 5000 }); } catch {}
        continue;
      }
      throw e;
    }
  }
  if (!newHomeId) throw new Error('failed to read new home id');
  expect(newHomeId).toBe(homeB.id);
});
