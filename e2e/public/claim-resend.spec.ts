/**
 * /admin/claim-resend + /api/admin/claim-resend (sprint W4 0b). LIST ONLY.
 *
 *  - admin → 200 (JSON + CSV), the seeded nudged-never-registered home is
 *    listed with a verifying fresh /claim?token= link; a nudged home whose
 *    address HAS an account is not listed; the clicked flag reflects
 *    ClaimLinkVisit;
 *  - operator / anonymous → 403 on the API; the page needs a session.
 *
 * Runs with the ./e2e config:
 *   npx playwright test --config=playwright.e2e.config.ts e2e/public/claim-resend.spec.ts
 */
import { test, expect, type Browser, type Page } from '@playwright/test';

const ts = Date.now();
const SENTINEL = 'directory-unclaimed@carelinkai.system';
const ADMIN = 'admin@carelinkai.com';
const NEVER = `never-registered-${ts}@test.carelinkai.com`;
const CLICKED = `clicked-${ts}@test.carelinkai.com`;
const REGISTERED = `op-registered-${ts}@test.carelinkai.com`;
const NUDGED = `E2E Nudged Never Registered ${ts}`;
const NUDGED_CLICKED = `E2E Nudged Clicked ${ts}`;
const NUDGED_REGISTERED = `E2E Nudged But Registered ${ts}`;

async function login(browser: Browser, email: string): Promise<Page> {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto('/');
  const status = await page.evaluate(async (e) => {
    const r = await fetch('/api/dev/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: e }), credentials: 'include' });
    return r.status;
  }, email);
  expect(status, `dev-login ${email}`).toBe(200);
  return page;
}

async function get(page: Page, path: string) {
  return page.evaluate(async (p) => {
    const r = await fetch(p, { credentials: 'include' });
    const text = await r.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch { /* csv */ }
    return { status: r.status, json, text, type: r.headers.get('content-type') || '' };
  }, path);
}

test.describe('@critical claim re-send list (list only, nothing sent)', () => {
  let ids: Record<string, string> = {};

  test.beforeAll(async ({ request }) => {
    // Three homes owned by the directory sentinel (= unclaimed), all nudged.
    const seed = await request.post('/api/dev/upsert-operator', {
      data: { email: SENTINEL, companyName: 'CareLinkAI Directory', homes: [{ name: NUDGED }, { name: NUDGED_CLICKED }, { name: NUDGED_REGISTERED }] },
    });
    expect(seed.status()).toBe(200);
    const homes = (await seed.json()).homes as Array<{ id: string; name: string }>;
    ids = Object.fromEntries(homes.map((h) => [h.name, h.id]));
    for (const [name, email, clicked] of [
      [NUDGED, NEVER, false],
      [NUDGED_CLICKED, CLICKED, true],
      [NUDGED_REGISTERED, REGISTERED, false],
    ] as const) {
      const r = await request.post('/api/dev/nudge-seed', { data: { homeId: ids[name], outreachEmail: email, nudgedDaysAgo: 4, clicked } });
      expect(r.status()).toBe(200);
    }
    // The "registered" address has an account → must NOT be listed.
    await request.post('/api/dev/upsert-operator', { data: { email: REGISTERED, companyName: 'Registered Op', homes: [{ name: `Registered Op Home ${ts}` }] } });
    await request.post('/api/dev/upsert-admin', { data: { email: ADMIN } });
  });

  // Remove what we seeded so later specs in the same job never lose their own
  // home off page 1 of /search (10 per page).
  test.afterAll(async ({ request }) => {
    await request
      .delete('/api/dev/nudge-seed', { data: { homeIds: Object.values(ids), emails: [REGISTERED] } })
      .catch(() => undefined);
  });

  test('admin: JSON list has the never-registered homes with fresh links, excludes registered', async ({ browser }) => {
    const admin = await login(browser, ADMIN);
    const res = await get(admin, '/api/admin/claim-resend');
    expect(res.status).toBe(200);
    const rows = res.json.rows as any[];
    const never = rows.find((r) => r.homeId === ids[NUDGED]);
    const clicked = rows.find((r) => r.homeId === ids[NUDGED_CLICKED]);
    expect(never, 'never-registered listed').toBeTruthy();
    expect(never).toMatchObject({ facility: NUDGED, contactEmail: NEVER, clicked: false });
    expect(never.claimLink).toMatch(/\/claim\?token=/);
    expect(clicked).toMatchObject({ contactEmail: CLICKED, clicked: true });
    expect(clicked.clickedAt).toBeTruthy();
    expect(rows.find((r) => r.homeId === ids[NUDGED_REGISTERED])).toBeUndefined();
    expect(res.json.counts.listed).toBe(rows.length);
    expect(res.json.counts.registered).toBeGreaterThanOrEqual(1);

    // The fresh link is a working claim link: logged-out GET → register redirect (homeId token).
    const hop = await admin.context().request.get(never.claimLink.replace(/^https?:\/\/[^/]+/, ''), { maxRedirects: 0, headers: { cookie: '' } });
    expect([302, 307, 200]).toContain(hop.status());

    // CSV download.
    const csv = await get(admin, '/api/admin/claim-resend?format=csv');
    expect(csv.status).toBe(200);
    expect(csv.type).toContain('text/csv');
    expect(csv.text.split('\n')[0]).toBe('facility,city,contact_email,nudge_sent_at,clicked,clicked_at,warm_lead,cohort,claim_link,link_expires_at');
    expect(csv.text).toContain(NEVER);
    expect(csv.text).not.toContain(REGISTERED);

    // Page renders the table.
    await admin.goto('/admin/claim-resend', { waitUntil: 'domcontentloaded' });
    await expect(admin.getByTestId('claim-resend-table')).toBeVisible({ timeout: 30000 });
    await expect(admin.getByText(NUDGED, { exact: false })).toBeVisible();
    await expect(admin.getByTestId('claim-resend-csv')).toHaveAttribute('href', '/api/admin/claim-resend?format=csv');
    await admin.context().close();
  });

  test('operator and anonymous → 403', async ({ browser, request }) => {
    const op = await login(browser, REGISTERED);
    expect((await get(op, '/api/admin/claim-resend')).status).toBe(403);
    expect((await get(op, '/api/admin/claim-resend?format=csv')).status).toBe(403);
    await op.context().close();
    const anon = await request.get('/api/admin/claim-resend', { maxRedirects: 0 });
    expect(anon.status()).toBe(403);
    const page = await request.get('/admin/claim-resend', { maxRedirects: 0 });
    expect([302, 307]).toContain(page.status());
    expect(page.headers()['location']).toMatch(/\/auth\/login/);
  });
});
