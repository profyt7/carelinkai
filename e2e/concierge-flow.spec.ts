import { test, expect, type APIRequestContext, type Browser, type Page } from '@playwright/test';

/**
 * Discharge-planner CONCIERGE flow regression guard (PR #671).
 *
 * Proves a DP can complete the in-app concierge flow AND that it is safely
 * routed: the request goes to the CareLinkAI admin queue (never auto-emailed to
 * an operator), patient data is persisted in-app, and the request is access-
 * controlled.
 *
 * Self-seeds via dev endpoints (ALLOW_DEV_ENDPOINTS=1). Each role runs in its own
 * browser context (isolated cookie jar) so role switches don't race on the
 * shared session cookie — the failure mode that parked operator-claim-flow.
 *
 * Harness limits (asserted at other layers, see report):
 *  - No ANTHROPIC key in CI → the AI search is seeded via /api/dev/placement-search
 *    instead of /api/discharge-planner/search; the DP submit itself uses the REAL
 *    POST /api/discharge-planner/concierge (the exact payload the modal sends).
 *  - No email capture in CI → "no operator email" is proven structurally here
 *    (zero PlacementRequest rows created) and the PHI-free admin notification is
 *    proven in __tests__/concierge.routing.test.ts + concierge.email.test.ts.
 */

const ts = Date.now();
const uniq = (p: string) => `${p}-${ts}-${Math.floor(Math.random() * 1e4)}@test.carelinkai.com`;
const QUERY_MARKER = `E2ECONCIERGE${ts}`; // distinctive token to locate the request in the admin UI

async function login(page: Page, email: string) {
  await page.goto('/');
  const status = await page.evaluate(async (e) => {
    const r = await fetch('/api/dev/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: e }), credentials: 'include',
    });
    return r.status;
  }, email);
  expect(status, `dev-login for ${email}`).toBe(200);
}

async function api(page: Page, method: string, path: string, body?: unknown) {
  return page.evaluate(async ({ method, path, body }) => {
    const r = await fetch(path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });
    let json: any = null;
    try { json = await r.json(); } catch { /* no body */ }
    return { status: r.status, json };
  }, { method, path, body });
}

async function newRolePage(browser: Browser, email: string): Promise<Page> {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await login(page, email);
  return page;
}

test.describe('@critical DP concierge placement flow', () => {
  test('DP submits → routes to admin queue (no operator email) → admin curates → DP sees shortlist', async ({
    browser,
    request,
  }) => {
    const dpEmail = uniq('dp-concierge');
    const dp2Email = uniq('dp-other');
    const opEmail = uniq('op-seed');
    const adminEmail = 'admin@carelinkai.com';

    // ---- Seed (dev endpoints; no auth) ----
    const opRes = await request.post('/api/dev/upsert-operator', {
      data: {
        email: opEmail,
        companyName: 'Concierge Seed Homes',
        homes: [
          { name: 'Lakeview Memory Care', capacity: 12 },
          { name: 'Maple Assisted Living', capacity: 16 },
        ],
      },
    });
    expect(opRes.ok()).toBeTruthy();
    const homes = (await opRes.json()).homes as Array<{ id: string; name: string }>;
    expect(homes.length).toBe(2);

    await request.post('/api/dev/upsert-admin', { data: { email: adminEmail } });
    const dpRes = await request.post('/api/dev/upsert-discharge-planner', {
      data: { email: dpEmail, organization: 'County Hospital' },
    });
    expect(dpRes.ok()).toBeTruthy();
    await request.post('/api/dev/upsert-discharge-planner', { data: { email: dp2Email, organization: 'Other Clinic' } });

    // Seed an AI search (stands in for /api/discharge-planner/search; no ANTHROPIC in CI).
    const searchRes = await request.post('/api/dev/placement-search', {
      data: {
        email: dpEmail,
        queryText: `${QUERY_MARKER} memory care near 44114, Medicaid, urgent, secured unit`,
        matches: homes.map((h, i) => ({
          homeId: h.id, homeName: h.name, address: `${100 + i} Main St, Cleveland, OH 44114`,
          score: 95 - i * 5, reasoning: 'Strong fit on care level + location.',
          careTypes: ['ASSISTED'], availableBeds: 3 - i, startingPrice: 4500 + i * 500, amenities: ['wifi'],
        })),
      },
    });
    expect(searchRes.ok()).toBeTruthy();
    const searchId = (await searchRes.json()).searchId as string;
    expect(searchId).toBeTruthy();

    // ---------------------------------------------------------------
    // ITEM 1 — DP logs in and reaches /discharge-planner with no error
    // ---------------------------------------------------------------
    const dpPage = await newRolePage(browser, dpEmail);
    await dpPage.goto('/discharge-planner', { waitUntil: 'domcontentloaded' });
    await expect(dpPage.getByText('Discharge Planning Assistant')).toBeVisible({ timeout: 30000 });

    // ---------------------------------------------------------------
    // ITEM 2 — DP submits the concierge request (real endpoint, min-necessary fields)
    // ---------------------------------------------------------------
    const patientInfo = {
      patientName: 'J.D.', patientAge: '82',
      medicalNeeds: 'advanced dementia with wandering; needs secured memory care',
      timeline: 'urgent', paymentType: 'medicaid', additionalNotes: 'POA is daughter',
    };
    const submit = await api(dpPage, 'POST', '/api/discharge-planner/concierge', { searchId, patientInfo });
    expect(submit.status, JSON.stringify(submit.json)).toBe(200);
    expect(submit.json).toMatchObject({ ok: true, status: 'SUBMITTED' });

    // ---------------------------------------------------------------
    // ITEM 4/5/7 — routed to admin, patientInfo persisted in-app, NO operator-bound request
    // ---------------------------------------------------------------
    const afterSubmit = await request.get(`/api/dev/placement-search?id=${searchId}`);
    const st1 = await afterSubmit.json();
    expect(st1.isConcierge).toBe(true);
    expect(st1.conciergeStatus).toBe('SUBMITTED');
    expect(st1.patientInfo?.medicalNeeds).toContain('dementia'); // persisted in-app
    expect(st1.placementRequestCount).toBe(0);                   // nothing routed to an operator

    // ---------------------------------------------------------------
    // ITEM 3 (part 1) — DP dashboard shows the request as Submitted
    // ---------------------------------------------------------------
    await dpPage.goto('/discharge-planner/concierge', { waitUntil: 'domcontentloaded' });
    await expect(dpPage.getByText(QUERY_MARKER, { exact: false })).toBeVisible({ timeout: 30000 });
    await expect(dpPage.getByText(/our care team will start curating/i)).toBeVisible();

    // ---------------------------------------------------------------
    // ITEM 8 — access control
    // ---------------------------------------------------------------
    // Anonymous: no admin detail, no DP list.
    const anonCtx = await browser.newContext();
    const anonPage = await anonCtx.newPage();
    await anonPage.goto('/');
    const anonAdmin = await api(anonPage, 'GET', `/api/admin/concierge/${searchId}`);
    expect(anonAdmin.status).toBe(401);
    const anonDp = await api(anonPage, 'GET', '/api/discharge-planner/concierge');
    expect(anonDp.status).toBe(401);

    // An OPERATOR cannot read the admin concierge detail.
    const opPage = await newRolePage(browser, opEmail);
    const opAdmin = await api(opPage, 'GET', `/api/admin/concierge/${searchId}`);
    expect(opAdmin.status).toBe(403);

    // A DIFFERENT DP cannot see this DP's concierge request.
    const dp2Page = await newRolePage(browser, dp2Email);
    const dp2List = await api(dp2Page, 'GET', '/api/discharge-planner/concierge');
    expect(dp2List.status).toBe(200);
    const dp2Ids = (dp2List.json?.requests ?? []).map((r: any) => r.id);
    expect(dp2Ids).not.toContain(searchId);

    // ---------------------------------------------------------------
    // ITEM 9 + ITEM 4 (UI) — admin sees it in /admin/concierge, pre-populated with candidates, curates
    // ---------------------------------------------------------------
    const adminPage = await newRolePage(browser, adminEmail);
    await adminPage.goto('/admin/concierge', { waitUntil: 'domcontentloaded' });
    await expect(adminPage.getByText(QUERY_MARKER, { exact: false })).toBeVisible({ timeout: 30000 });

    // Detail is pre-populated with the AI candidate matches.
    const detail = await api(adminPage, 'GET', `/api/admin/concierge/${searchId}`);
    expect(detail.status).toBe(200);
    expect(detail.json?.request?.searchResults?.matches?.length).toBe(2);
    expect(detail.json?.request?.patientInfo?.medicalNeeds).toContain('dementia');

    // ITEM 3 (progression) — admin marks Matching; DP sees Matching.
    const matching = await api(adminPage, 'PATCH', `/api/admin/concierge/${searchId}`, { action: 'matching' });
    expect(matching.status).toBe(200);
    await dpPage.goto('/discharge-planner/concierge', { waitUntil: 'domcontentloaded' });
    await expect(dpPage.getByText(/care team is reviewing availability/i)).toBeVisible({ timeout: 30000 });

    // Admin curates a shortlist (1 home, with note + confirmed availability) and sends it.
    const respond = await api(adminPage, 'PATCH', `/api/admin/concierge/${searchId}`, {
      action: 'respond',
      curatedHomes: [{ homeId: homes[0].id, note: 'Secured dementia unit, strong staffing.', confirmedAvailability: '2 beds, ready this week' }],
      conciergeNote: 'Two great options — Lakeview can tour Thursday.',
    });
    expect(respond.status, JSON.stringify(respond.json)).toBe(200);
    expect(respond.json).toMatchObject({ ok: true, status: 'SHORTLIST_READY', curatedCount: 1 });

    // State: shortlist saved, STILL zero operator-bound requests.
    const afterRespond = await (await request.get(`/api/dev/placement-search?id=${searchId}`)).json();
    expect(afterRespond.conciergeStatus).toBe('SHORTLIST_READY');
    expect(Array.isArray(afterRespond.curatedHomes) && afterRespond.curatedHomes.length).toBe(1);
    expect(afterRespond.curatedHomes[0].name).toBe(homes[0].name);
    expect(afterRespond.placementRequestCount).toBe(0);

    // ---------------------------------------------------------------
    // ITEM 3 (part 2) — DP sees the curated shortlist + a "request a tour" action
    // ---------------------------------------------------------------
    await dpPage.goto('/discharge-planner/concierge', { waitUntil: 'domcontentloaded' });
    await expect(dpPage.getByText(/your curated shortlist/i)).toBeVisible({ timeout: 30000 });
    await expect(dpPage.getByText(homes[0].name)).toBeVisible();
    await expect(dpPage.getByText(/2 beds, ready this week/i)).toBeVisible();
    const tour = dpPage.getByRole('link', { name: /request a tour/i }).first();
    await expect(tour).toBeVisible();
    await expect(tour).toHaveAttribute('href', new RegExp(`/homes/${homes[0].id}`));

    // ---------------------------------------------------------------
    // NOTIFY — the DP learns a shortlist is ready: dashboard count + bell + banner
    // ---------------------------------------------------------------
    // (a) Main dashboard API reflects the ready shortlist (legacy counters stay 0).
    const dash = await api(dpPage, 'GET', '/api/discharge-planner/dashboard');
    expect(dash.status).toBe(200);
    expect(dash.json?.stats?.conciergeShortlistReady ?? 0).toBeGreaterThanOrEqual(1);

    // (b) An in-app (bell) notification was created, linking to the concierge page.
    const notifs = await api(dpPage, 'GET', '/api/notifications');
    expect(notifs.status).toBe(200);
    const bell = (notifs.json?.notifications ?? []).find((n: any) => n.link === '/discharge-planner/concierge');
    expect(bell, 'expected a concierge shortlist-ready bell notification').toBeTruthy();

    // (c) The LANDING dashboard surfaces it (not just the Concierge tab).
    await dpPage.goto('/discharge-planner', { waitUntil: 'domcontentloaded' });
    await expect(dpPage.getByText(/curated shortlist(s)? ready/i)).toBeVisible({ timeout: 30000 });
    await expect(dpPage.getByRole('link', { name: /view shortlists/i })).toBeVisible();
  });
});
