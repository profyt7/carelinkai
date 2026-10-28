/**
 * Facility accept / decline inside the DP concierge flow (sprint W4-2).
 *
 *  shortlist (2 homes) → one FacilityResponse per home with a tokenized link
 *  → home A: Decline (acuity: wandering) → DP sees "Declined" + reason, admin
 *    sees the reason, the home's observed acceptance criteria gains the flag
 *  → home B: Accept → admin confirms → status Admitted, DP sees "Admitted"
 *  → links are single-use per home per request; stored summary has no PHI;
 *    the existing "zero PlacementRequest rows" guarantee still holds.
 *
 * NOTHING is emailed in this job (no RESEND_API_KEY / postal address); the
 * link tokens are read via /api/dev/placement-search. The email body itself
 * is asserted PHI-free in __tests__/facility-response.unit.test.ts.
 *
 * Runs with the ./e2e config:
 *   npx playwright test --config=playwright.e2e.config.ts e2e/public/concierge/facility-response.spec.ts
 */
import { test, expect, type APIRequestContext, type Browser, type Page } from '@playwright/test';

const ts = Date.now();
const uniq = (p: string) => `${p}-${ts}@test.carelinkai.com`;
const MARKER = `E2EFACRESP${ts}`;
const ADMIN = 'admin@carelinkai.com';
const DP = uniq('dp-facresp');
const OP = uniq('op-facresp');
const HOME_A = `E2E FacResp Declines ${ts}`;
const HOME_B = `E2E FacResp Accepts ${ts}`;

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
async function api(page: Page, method: string, path: string, body?: unknown) {
  return page.evaluate(async ({ method, path, body }) => {
    const r = await fetch(path, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined, credentials: 'include' });
    let json: any = null;
    try { json = await r.json(); } catch { /* none */ }
    return { status: r.status, json };
  }, { method, path, body });
}

/**
 * The shared e2e-concierge dev server can restart on its memory watchdog
 * mid-run (OL-146) → a single ECONNRESET. Retry dev-endpoint reads a few times
 * so one restart does not fail the whole serial group.
 */
async function devState(request: APIRequestContext, id: string): Promise<any> {
  let lastErr: unknown;
  for (let i = 0; i < 6; i++) {
    try {
      const r = await request.get(`/api/dev/placement-search?id=${id}`, { timeout: 30000 });
      if (r.ok()) return await r.json();
      lastErr = new Error(`dev state ${r.status()}`);
    } catch (e) {
      lastErr = e;
    }
    await new Promise((res) => setTimeout(res, 3000));
  }
  throw lastErr;
}

/**
 * Drive the facility form to a terminal state waiting on REAL signals only —
 * the committed select state (data-selected mirrors React state), the actual
 * POST /api/facility/respond response, and the rendered result — never a
 * sleep (OL-154). The shared e2e dev server can restart on its memory
 * watchdog mid-step (OL-146): the whole step is then retried from navigation,
 * and a response that already landed shows up as the closed link, which is
 * accepted as the same outcome.
 */
async function respondViaForm(
  page: Page,
  token: string,
  expected: 'ACCEPTED' | 'DECLINED',
  decline?: { reason: string; text: string },
): Promise<void> {
  await expect(async () => {
    await page.goto(`/facility/respond?token=${encodeURIComponent(token)}`, { waitUntil: 'domcontentloaded' });
    const closed = page.getByTestId('facility-closed');
    const form = page.getByTestId('facility-form');
    await expect(closed.or(form)).toBeVisible({ timeout: 30000 });
    if (await closed.isVisible()) {
      // A previous attempt's POST landed before the page could show it.
      await expect(closed).toHaveAttribute('data-status', expected);
      return;
    }
    await expect(form).toHaveAttribute('data-hydrated', 'true', { timeout: 30000 });
    if (decline) {
      await page.getByTestId('facility-decline').click();
      await expect(form).toHaveAttribute('data-mode', 'decline');
      const reason = page.getByTestId('facility-decline-reason');
      await reason.selectOption(decline.reason);
      await expect(reason).toHaveValue(decline.reason);
      await expect(reason).toHaveAttribute('data-selected', decline.reason);
      await page.getByTestId('facility-decline-text').fill(decline.text);
    }
    const responded = page.waitForResponse(
      (r) => r.url().includes('/api/facility/respond') && r.request().method() === 'POST',
      { timeout: 45000 },
    );
    await page.getByTestId(decline ? 'facility-decline-submit' : 'facility-accept').click();
    const res = await responded;
    expect([200, 409], `POST /api/facility/respond → ${res.status()}`).toContain(res.status());
    if (res.status() === 200) {
      await expect(page.getByTestId('facility-result')).toHaveAttribute('data-status', expected, { timeout: 30000 });
    } else {
      // 409 = already answered by an earlier attempt → the closed state is the proof.
      await page.goto(`/facility/respond?token=${encodeURIComponent(token)}`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('facility-closed')).toHaveAttribute('data-status', expected, { timeout: 30000 });
    }
  }).toPass({ timeout: 100_000, intervals: [1000, 3000, 5000] });
}

test.describe.configure({ mode: 'serial' });

test.describe('@critical facility accept / decline in the concierge flow', () => {
  let homes: Array<{ id: string; name: string }> = [];
  let searchId = '';
  const tokens: Record<string, string> = {};

  // The cookie-consent banner is a fixed bottom overlay that slides in ~1 s
  // after load; in a fresh context it lands exactly over the form's buttons
  // and intercepts the click (the ROOT CAUSE of the "Decline click timing"
  // flake, OL-154). Pre-seed consent so it never renders — same approach as
  // auth-signup-verify.spec.ts.
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('carelinkai_cookie_consent', JSON.stringify({ necessary: true, analytics: false, marketing: false }));
      } catch {
        /* ignore */
      }
    });
  });

  test.beforeAll(async ({ request }) => {
    const op = await request.post('/api/dev/upsert-operator', { data: { email: OP, companyName: `FacResp Ops ${ts}`, homes: [{ name: HOME_A }, { name: HOME_B }] } });
    expect(op.status()).toBe(200);
    homes = (await op.json()).homes;
    await request.post('/api/dev/upsert-admin', { data: { email: ADMIN } });
    expect((await request.post('/api/dev/upsert-discharge-planner', { data: { email: DP, organization: 'E2E County Hospital' } })).ok()).toBeTruthy();
    const search = await request.post('/api/dev/placement-search', {
      data: {
        email: DP,
        queryText: `${MARKER} memory care near 44114, private pay, within 2 weeks`,
        matches: homes.map((h, i) => ({ homeId: h.id, homeName: h.name, address: `${100 + i} Main St, Cleveland, OH 44114`, score: 90 - i, reasoning: 'fit', careTypes: ['ASSISTED'], availableBeds: 2, startingPrice: 5000, amenities: [] })),
      },
    });
    searchId = (await search.json()).searchId;
    expect(searchId).toBeTruthy();
  });

  test.afterAll(async ({ request }) => {
    // Keep page 1 of /search clean for later specs (10 per page).
    await request.delete('/api/dev/placement-search', { data: { email: OP } }).catch(() => undefined);
  });

  test('DP submits → admin sends shortlist → one FacilityResponse per home, PHI-minimal summary, no PlacementRequest rows', async ({ browser, request }) => {
    const dp = await login(browser, DP);
    const submit = await api(dp, 'POST', '/api/discharge-planner/concierge', {
      searchId,
      payerSource: 'PRIVATE_FUNDS',
      patientInfo: { patientName: 'Jane Doe', patientAge: '82', medicalNeeds: 'advanced dementia with wandering; insulin', timeline: 'within 2 weeks', paymentType: 'private pay', additionalNotes: 'POA daughter Mary' },
    });
    expect(submit.status, JSON.stringify(submit.json)).toBe(200);
    await dp.context().close();

    const admin = await login(browser, ADMIN);
    const respond = await api(admin, 'PATCH', `/api/admin/concierge/${searchId}`, {
      action: 'respond',
      curatedHomes: homes.map((h) => ({ homeId: h.id, note: 'fit', confirmedAvailability: '1 bed' })),
      conciergeNote: 'Two options.',
    });
    expect(respond.status, JSON.stringify(respond.json)).toBe(200);
    expect(respond.json.facilityResponses).toHaveLength(2);
    await admin.context().close();

    const st = await devState(request, searchId);
    expect(st.placementRequestCount, 'concierge still creates no operator-bound PlacementRequest rows').toBe(0);
    expect(st.facilityResponses).toHaveLength(2);
    for (const fr of st.facilityResponses as any[]) {
      expect(['SENT', 'PENDING']).toContain(fr.status);
      expect(fr.token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
      expect(fr.contactEmail, 'claimed home → operator login is the contact').toBe(OP);
      expect(fr.summary).toMatchObject({ careLevel: 'Memory care', payerLane: expect.stringMatching(/private/i), timeline: 'within 2 weeks' });
      const json = JSON.stringify(fr.summary);
      for (const phi of ['Jane', 'Doe', 'Mary', 'insulin', 'dementia', '82']) expect(json, `summary must not carry ${phi}`).not.toContain(phi);
      tokens[fr.homeId] = fr.token;
    }
  });

  test('home A: facility link → Decline (acuity: wandering) → DP sees Declined + admin sees the reason + observed flag on the home', async ({ browser, page, request }) => {
    await page.goto(`/facility/respond?token=${encodeURIComponent(tokens[homes[0].id])}`, { waitUntil: 'domcontentloaded' });
    const form = page.getByTestId('facility-form');
    await expect(form).toBeVisible({ timeout: 30000 });
    await expect(form).toHaveAttribute('data-hydrated', 'true', { timeout: 30000 });
    // The page shows care level / payer / timeline only.
    await expect(page.getByTestId('summary-care-level')).toHaveText('Memory care');
    await expect(page.getByTestId('summary-timeline')).toHaveText('within 2 weeks');
    const html = await page.content();
    for (const phi of ['Jane', 'Doe', 'Mary', 'insulin', 'dementia']) expect(html, `page must not carry ${phi}`).not.toContain(phi);

    await respondViaForm(page, tokens[homes[0].id], 'DECLINED', { reason: 'ACUITY_WANDERING', text: 'Our memory care unit is not secured.' });

    // Opened + responded + declined timestamps, reason + text stored; link now closed.
    const st = await devState(request, searchId);
    const a = (st.facilityResponses as any[]).find((f) => f.homeId === homes[0].id);
    expect(a).toMatchObject({ status: 'DECLINED', declineReason: 'ACUITY_WANDERING', declineText: 'Our memory care unit is not secured.' });
    expect(a.openedAt && a.respondedAt && a.declinedAt).toBeTruthy();
    expect(a.home.observedAcceptanceCriteria.declines.ACUITY_WANDERING.count).toBe(1);
    expect(a.home.observedAcceptanceCriteria.totalDeclines).toBe(1);
    await page.goto(`/facility/respond?token=${encodeURIComponent(tokens[homes[0].id])}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('facility-closed')).toHaveAttribute('data-status', 'DECLINED');
    const again = await request.post('/api/facility/respond', { data: { token: tokens[homes[0].id], action: 'accept' } });
    expect(again.status(), 'single-use per home per request').toBe(409);

    // DP dashboard shows Declined + the reason.
    const dp = await login(browser, DP);
    const list = await api(dp, 'GET', '/api/discharge-planner/concierge');
    const req = (list.json.requests as any[]).find((r) => r.id === searchId);
    const frA = req.facilityResponses.find((f: any) => f.homeId === homes[0].id);
    expect(frA).toMatchObject({ status: 'DECLINED', declineReason: 'ACUITY_WANDERING' });
    expect(frA.contactEmail, 'DP never sees the facility contact email').toBeUndefined();
    await dp.goto('/discharge-planner/concierge', { waitUntil: 'domcontentloaded' });
    const cardA = dp.locator(`[data-testid="shortlist-home"][data-home-id="${homes[0].id}"]`);
    await expect(cardA).toBeVisible({ timeout: 30000 });
    await expect(cardA.getByTestId('facility-response-state')).toHaveText('Declined');
    await expect(cardA.getByTestId('facility-decline-reason')).toContainText('wandering');
    await dp.context().close();

    // Admin sees the same + the reason.
    const admin = await login(browser, ADMIN);
    const detail = await api(admin, 'GET', `/api/admin/concierge/${searchId}`);
    const adminA = (detail.json.request.facilityResponses as any[]).find((f) => f.homeId === homes[0].id);
    expect(adminA).toMatchObject({ status: 'DECLINED', declineReason: 'ACUITY_WANDERING', contactEmail: OP });
    await admin.goto(`/admin/concierge/${searchId}`, { waitUntil: 'domcontentloaded' });
    const rowA = admin.locator(`[data-testid="facility-response-row"][data-home-id="${homes[0].id}"]`);
    await expect(rowA).toBeVisible({ timeout: 30000 });
    await expect(rowA.getByTestId('admin-decline-reason')).toContainText('wandering');
    await admin.context().close();
  });

  test('home B: Accept → admin confirms → Admitted; DP sees Admitted; admitted needs an accept first', async ({ browser, page, request }) => {
    // Admitting before the facility accepted is refused.
    const admin = await login(browser, ADMIN);
    const early = await api(admin, 'PATCH', `/api/admin/concierge/${searchId}`, { action: 'admitted', homeId: homes[1].id });
    expect(early.status).toBe(409);

    await respondViaForm(page, tokens[homes[1].id], 'ACCEPTED');

    let st = await devState(request, searchId);
    let b = (st.facilityResponses as any[]).find((f) => f.homeId === homes[1].id);
    expect(b.status).toBe('ACCEPTED');
    expect(b.acceptedAt && b.respondedAt).toBeTruthy();
    expect(b.home.observedAcceptanceCriteria.totalAccepts).toBe(1);

    await admin.goto(`/admin/concierge/${searchId}`, { waitUntil: 'domcontentloaded' });
    const rowB = admin.locator(`[data-testid="facility-response-row"][data-home-id="${homes[1].id}"]`);
    await expect(rowB).toHaveAttribute('data-status', 'ACCEPTED', { timeout: 30000 });
    await rowB.getByTestId('mark-admitted').dispatchEvent('click');
    await expect.poll(async () => {
      const s = await devState(request, searchId);
      return (s.facilityResponses as any[]).find((f) => f.homeId === homes[1].id)?.status;
    }, { timeout: 20000 }).toBe('ADMITTED');
    st = await devState(request, searchId);
    b = (st.facilityResponses as any[]).find((f) => f.homeId === homes[1].id);
    expect(b.admittedAt).toBeTruthy();
    await admin.context().close();

    const dp = await login(browser, DP);
    await dp.goto('/discharge-planner/concierge', { waitUntil: 'domcontentloaded' });
    const cardB = dp.locator(`[data-testid="shortlist-home"][data-home-id="${homes[1].id}"]`);
    await expect(cardB.getByTestId('facility-response-state')).toHaveText('Admitted', { timeout: 30000 });
    await dp.context().close();

    // Bad / foreign tokens never work; anonymous cannot read the admin or DP state.
    const bad = await request.post('/api/facility/respond', { data: { token: 'nope.nope', action: 'accept' } });
    expect(bad.status()).toBe(404);
    const invalidPage = await request.get('/facility/respond?token=nope', { maxRedirects: 0 });
    expect(invalidPage.status()).toBe(200);
    expect(await invalidPage.text()).toContain('This link is invalid');
    expect((await request.get(`/api/admin/concierge/${searchId}`)).status()).toBe(401);
  });
});
