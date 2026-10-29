/**
 * OL-226 conversion measurement, end to end.
 *  (a) analytics consent: search → card → profile → open inquiry → submit sends exactly the funnel
 *      events search_performed, listing_clicked, profile_viewed, inquiry_started, inquiry_submitted,
 *      each with allowlisted props only and no free text (query, location, name, email, phone, message).
 *  (b) a failed submit (POST /api/inquiries → 500) sends inquiry_started but never inquiry_submitted.
 *  (c) analytics declined: the full inquiry works and the page makes zero analytics requests.
 *  (d) /admin/analytics/funnel renders for ADMIN with counts and unique sessions only — none of
 *      the visitor's details — and FAMILY and OPERATOR are turned away.
 *  (e) OL-228/229: with every consent box ticked, /, /search?q=test, /homes/[id], /concierge and
 *      a /cleveland page make zero requests to Meta (facebook.net / connect.facebook.net),
 *      Microsoft Clarity or Google — no tracker script loads in the browser at all.
 *  GA4 (OL-229): the server forwards events to GA through the Measurement Protocol. This spec
 *  runs a capture server standing in for google-analytics.com (the app is started with
 *  GA_MEASUREMENT_ID, GA_MP_API_SECRET and GA_MP_ENDPOINT=http://127.0.0.1:4599/mp/collect,
 *  see the e2e-public job) and inspects the actual GA requests: allowlisted params only,
 *  page_location sanitized (no query string), no free text; none at all without consent.
 * Test data is fictional; RESEND_API_KEY is unset in CI, so nothing is emailed.
 *
 *   GA_MEASUREMENT_ID=G-E2ETEST00 GA_MP_API_SECRET=e2e GA_MP_ENDPOINT=http://127.0.0.1:4599/mp/collect \
 *   npx playwright test --config=playwright.e2e.config.ts e2e/public/directory/analytics-funnel.spec.ts
 */
import http from 'http';
import { test, expect, type Browser, type Page, type Request } from '@playwright/test';

const ts = Date.now();
const ADMIN = 'admin@carelinkai.com';
const OP_EMAIL = `funnel-op-${ts}@test.carelinkai.com`;
const FAMILY_EMAIL = `funnel-family-${ts}@test.carelinkai.com`;
const CITY = `Funneltown${ts}`;
const HOME = `E2E Funnel Home ${ts}`;
const SENTINEL = `zebra${ts}`;
const QUERY = `quiet place for grandma ${SENTINEL}`;
const PERSON = { name: `Fictional Person ${ts}`, email: `fictional-${ts}@test.carelinkai.com`, phone: '(216) 555-0142', message: `Fictional note ${SENTINEL} — please ignore.` };
let homeId = '';

/** The OL-226 allowlist, restated independently of the app code. */
const ALLOWED: Record<string, string[]> = {
  search_performed: ['care_levels', 'has_budget_filter', 'has_location_filter', 'verified_only', 'medicaid_waiver', 'view', 'result_count_bucket'],
  listing_clicked: ['listing_id', 'position', 'source', 'availability_state', 'has_photo', 'has_price', 'claimed'],
  profile_viewed: ['listing_id', 'availability_state', 'has_photo', 'has_price', 'claimed', 'has_inspection'],
  inquiry_started: ['listing_id', 'entry'],
  inquiry_submitted: ['listing_id', 'entry'],
  tour_requested: ['listing_id', 'entry'],
  concierge_clicked: ['source_page'],
};
/** GA request params the server adds to every event (besides the event's own allowlist). */
const GA_COMMON = ['page_location', 'page_path', 'session_id', 'engagement_time_msec'];
const ANALYTICS_HOSTS = /\/api\/analytics\/track|google-analytics\.com|googletagmanager\.com|clarity\.ms|facebook\.(net|com)|doubleclick\.net/;
/** Third-party trackers that must never be contacted (OL-228 / OL-229). */
const TRACKER_HOSTS = /(^|\.)(facebook\.net|facebook\.com|fbcdn\.net|clarity\.ms|googletagmanager\.com|google-analytics\.com|analytics\.google\.com|doubleclick\.net)$/;
const isFirstParty = (url: string) => /^(https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\/|data:|blob:)/.test(url);

// Stand-in for google-analytics.com/mp/collect: records every request the app server sends to GA.
const GA_PORT = 4599;
type GaHit = { url: string; body: { client_id: string; non_personalized_ads?: boolean; events: Array<{ name: string; params: Record<string, unknown> }> }; raw: string };
const gaHits: GaHit[] = [];
let gaServer: http.Server;

const consentInit = (analytics: boolean) => (a: boolean) => {
  try {
    localStorage.setItem('carelinkai_cookie_consent', JSON.stringify({ necessary: true, analytics: a, marketing: a }));
    for (const r of ['ADMIN', 'FAMILY', 'OPERATOR']) localStorage.setItem(`carelinkai_onboarding_completed_${r}`, 'true');
  } catch {
    /* storage blocked */
  }
};

type Captured = { name: string; props: Record<string, unknown>; sid: string; path?: string; raw: string };

async function guest(browser: Browser, analytics: boolean) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(consentInit(analytics), analytics);
  const page = await ctx.newPage();
  const events: Captured[] = [];
  const analyticsRequests: string[] = [];
  const thirdParty: string[] = [];
  page.on('request', (r: Request) => {
    if (!isFirstParty(r.url())) thirdParty.push(r.url());
    if (!ANALYTICS_HOSTS.test(r.url())) return;
    analyticsRequests.push(`${r.method()} ${r.url()}`);
    if (r.url().includes('/api/analytics/track')) {
      const raw = r.postData() || '';
      try {
        const j = JSON.parse(raw);
        events.push({ name: j.name, props: j.props, sid: j.sid, path: j.path, raw });
      } catch {
        events.push({ name: '?', props: {}, sid: '', raw });
      }
    }
  });
  return { page, events, analyticsRequests, thirdParty };
}

async function signedIn(browser: Browser, email: string): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(consentInit(false), false);
  const page = await ctx.newPage();
  await page.goto('/');
  const status = await page.evaluate(
    async (e) => (await fetch('/api/dev/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: e }), credentials: 'include' })).status,
    email,
  );
  expect(status, `dev-login ${email}`).toBe(200);
  return page;
}

async function searchAndOpenProfile(page: Page) {
  await page.goto(`/search?location=${CITY}&q=${encodeURIComponent(QUERY)}`, { waitUntil: 'domcontentloaded' });
  const card = page.locator(`[data-testid="search-result-card"][data-home-id="${homeId}"]`);
  await expect(card).toBeVisible({ timeout: 60_000 });
  await card.getByRole('link', { name: HOME, exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: HOME, exact: true })).toBeVisible({ timeout: 60_000 });
}

async function openAndFill(page: Page) {
  await page.getByTestId('listing-inquiry-panel').getByRole('button', { name: 'Send Inquiry' }).click();
  await page.locator('#name').fill(PERSON.name);
  await page.locator('#email').fill(PERSON.email);
  await page.locator('#phone').fill(PERSON.phone);
  await page.locator('#moveInTimeframe').selectOption('1-3 months');
  await page.getByRole('checkbox', { name: 'Assisted Living' }).check();
  await page.locator('#message').fill(PERSON.message);
  await page.getByRole('button', { name: 'Continue →' }).click();
}

async function submit(page: Page, expectStatus: number) {
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith('/api/inquiries') && r.request().method() === 'POST', { timeout: 60_000 }),
    page.getByRole('button', { name: 'Submit Request' }).click(),
  ]);
  expect(resp.status()).toBe(expectStatus);
}

function expectNoFreeText(raw: string) {
  for (const bad of [SENTINEL, CITY, 'grandma', PERSON.name, PERSON.email, '555-0142', '5550142', 'Fictional note']) {
    expect(raw, `analytics payload must not contain "${bad}"`).not.toContain(bad);
  }
}

test.describe('@critical OL-226 conversion measurement', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180_000);

  test.beforeAll(async ({ request }) => {
    gaServer = http.createServer((req, res) => {
      let raw = '';
      req.on('data', (c) => (raw += c));
      req.on('end', () => {
        try {
          gaHits.push({ url: req.url || '', body: JSON.parse(raw), raw });
        } catch {
          gaHits.push({ url: req.url || '', body: { client_id: '', events: [] }, raw });
        }
        res.writeHead(204).end();
      });
    });
    await new Promise<void>((resolve) => gaServer.listen(GA_PORT, '127.0.0.1', resolve));
    await request.post('/api/dev/upsert-admin', { data: { email: ADMIN } });
    const res = await request.post('/api/dev/upsert-operator', {
      data: { email: OP_EMAIL, companyName: `Funnel Ops ${ts}`, homes: [{ name: HOME, city: CITY, zipCode: '44122', careLevel: ['ASSISTED'], unclaimed: true }] },
    });
    expect(res.status(), 'dev seed').toBe(200);
    homeId = ((await res.json()).homes as Array<{ id: string; name: string }>).find((h) => h.name === HOME)!.id;
    expect((await request.post('/api/dev/upsert-family', { data: { email: FAMILY_EMAIL } })).ok(), 'family seed').toBe(true);
  });

  test.afterAll(async ({ request }) => {
    await new Promise((resolve) => gaServer?.close(resolve));
    await request.delete('/api/dev/upsert-operator', { data: { email: OP_EMAIL, homeIds: [homeId] } }).catch(() => undefined);
  });

  test('(a) with consent: the five funnel events, allowlisted props, no free text — in the browser and in the GA requests', async ({ browser }) => {
    gaHits.length = 0;
    const { page, events, thirdParty } = await guest(browser, true);
    await searchAndOpenProfile(page);
    await openAndFill(page);
    await submit(page, 201);
    await expect(page.getByTestId('inquiry-confirmation-unclaimed')).toBeVisible({ timeout: 30_000 });
    await expect.poll(() => events.filter((e) => e.name === 'inquiry_submitted').length, { timeout: 10_000 }).toBe(1);

    // Exactly these events, in this order (search_performed may repeat as the page settles its filters).
    const sequence = events.map((e) => e.name).filter((n) => n !== 'page_view').filter((n, i, a) => n !== a[i - 1]);
    expect(sequence).toEqual(['search_performed', 'listing_clicked', 'profile_viewed', 'inquiry_started', 'inquiry_submitted']);

    // Page views: one per route, carrying only a sanitized path (no ?q=, no ?location=).
    const views = events.filter((e) => e.name === 'page_view');
    expect(views.map((v) => v.path)).toEqual(expect.arrayContaining(['/search', `/homes/${homeId}`]));
    for (const v of views) {
      expect(v.props).toEqual({});
      expect(v.path).not.toContain('?');
    }

    for (const e of events) {
      for (const key of Object.keys(e.props)) expect(ALLOWED[e.name] ?? [], `${e.name}.${key}`).toContain(key);
      expect(e.sid).toMatch(/^[0-9a-f-]{36}$/);
      expectNoFreeText(e.raw);
    }
    const byName = (n: string) => events.find((e) => e.name === n)!.props;
    expect(byName('search_performed')).toMatchObject({ has_location_filter: true, view: 'grid' });
    expect(byName('listing_clicked')).toMatchObject({ listing_id: homeId, position: 1, source: 'search', claimed: false });
    expect(byName('profile_viewed')).toMatchObject({ listing_id: homeId, claimed: false, has_inspection: false });
    expect(byName('inquiry_started')).toEqual({ listing_id: homeId, entry: 'rail' });
    expect(byName('inquiry_submitted')).toEqual({ listing_id: homeId, entry: 'rail' });
    // One anonymous session across the flow.
    expect(new Set(events.map((e) => e.sid)).size).toBe(1);

    // The actual GA requests (server → Measurement Protocol), as GA would receive them.
    await expect
      .poll(() => gaHits.flatMap((h) => h.body.events.map((e) => e.name)).filter((n) => n === 'inquiry_submitted').length, {
        timeout: 15_000,
        message: 'GA received inquiry_submitted — is the server started with GA_MEASUREMENT_ID, GA_MP_API_SECRET and GA_MP_ENDPOINT?',
      })
      .toBe(1);
    const gaEvents = gaHits.flatMap((h) => h.body.events);
    expect(new Set(gaEvents.map((e) => e.name))).toEqual(new Set(['page_view', 'search_performed', 'listing_clicked', 'profile_viewed', 'inquiry_started', 'inquiry_submitted']));
    for (const h of gaHits) {
      // Only the stream id and API secret in the URL; nothing about the visitor.
      expect(h.url).toMatch(/^\/mp\/collect\?measurement_id=G-[A-Z0-9]+&api_secret=[^&]+$/);
      expect(h.body.client_id).toBe(events[0].sid);
      expect(h.body.non_personalized_ads).toBe(true);
      expectNoFreeText(h.raw);
      expect(h.raw).not.toMatch(/[?&](q|location)=/);
    }
    for (const e of gaEvents) {
      const allowed = [...(ALLOWED[e.name] ?? []), ...GA_COMMON];
      for (const key of Object.keys(e.params)) expect(allowed, `GA ${e.name}.${key}`).toContain(key);
      expect(String(e.params.page_location), `GA ${e.name} page_location`).toMatch(/^https:\/\/getcarelinkai\.com\/[^?#]*$/);
    }
    const gaViews = gaEvents.filter((e) => e.name === 'page_view').map((e) => e.params.page_location);
    expect(gaViews).toEqual(expect.arrayContaining(['https://getcarelinkai.com/search', `https://getcarelinkai.com/homes/${homeId}`]));

    // And no tracker host was contacted from the browser during the whole flow.
    expect(thirdParty.filter((u) => TRACKER_HOSTS.test(new URL(u).hostname))).toEqual([]);
    await page.context().close();
  });

  test('(b) a failed submit sends inquiry_started but not inquiry_submitted', async ({ browser }) => {
    const { page, events } = await guest(browser, true);
    await page.route('**/api/inquiries', (route) =>
      route.request().method() === 'POST' ? route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"boom"}' }) : route.continue(),
    );
    await page.goto(`/homes/${homeId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1, name: HOME, exact: true })).toBeVisible({ timeout: 60_000 });
    await openAndFill(page);
    await submit(page, 500);
    await expect(page.getByText('Something went wrong. Please try again later.')).toBeVisible();
    await expect(page.getByTestId('inquiry-confirmation-unclaimed')).toHaveCount(0);
    await expect.poll(() => events.some((e) => e.name === 'inquiry_started'), { timeout: 10_000 }).toBe(true);
    await page.waitForTimeout(1500);
    expect(events.map((e) => e.name)).not.toContain('inquiry_submitted');
    await page.context().close();
  });

  test('(c) analytics declined: the inquiry works and nothing analytics leaves the page', async ({ browser }) => {
    await new Promise((r) => setTimeout(r, 1500)); // let (b)'s last forwards land first
    gaHits.length = 0;
    const { page, analyticsRequests, thirdParty } = await guest(browser, false);
    await searchAndOpenProfile(page);
    await openAndFill(page);
    await submit(page, 201);
    await expect(page.getByTestId('inquiry-confirmation-unclaimed')).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1500);
    expect(analyticsRequests, 'no analytics network calls without consent').toEqual([]);
    expect(thirdParty.filter((u) => TRACKER_HOSTS.test(new URL(u).hostname)), 'no tracker host').toEqual([]);
    expect(gaHits, 'the server sent nothing to GA').toEqual([]);
    expect(await page.evaluate(() => sessionStorage.getItem('carelinkai_anon_sid'))).toBeNull();
    await page.context().close();
  });

  test('(d) /admin/analytics/funnel: ADMIN only', async ({ browser }) => {
    const admin = await signedIn(browser, ADMIN);
    await admin.goto('/admin/analytics/funnel?days=30', { waitUntil: 'domcontentloaded' });
    await expect(admin.getByRole('heading', { level: 1, name: 'Conversion funnel' })).toBeVisible({ timeout: 60_000 });
    await expect(admin.getByTestId('funnel-event-row')).toHaveCount(7);
    await expect(admin.getByTestId('funnel-rate')).toHaveCount(5);
    await expect(admin.getByTestId('funnel-operational')).toContainText('Inquiries recorded (operational)');
    // Counts and unique sessions, nothing about the visitor: after (a), the page holds none of
    // the fictional person's details, the typed query or the session id.
    await expect(admin.getByRole('columnheader', { name: 'Unique sessions' })).toBeVisible();
    const submitted = admin.locator('[data-testid="funnel-event-row"][data-event="inquiry_submitted"]');
    expect(Number(await submitted.getByTestId('funnel-total').textContent())).toBeGreaterThanOrEqual(1);
    expect(Number(await submitted.getByTestId('funnel-sessions').textContent())).toBeGreaterThanOrEqual(1);
    const html = await admin.content();
    for (const bad of [SENTINEL, CITY, 'grandma', PERSON.name, PERSON.email, '555-0142', 'Fictional note', 'carelinkai_anon_sid']) {
      expect(html, `admin funnel must not contain "${bad}"`).not.toContain(bad);
    }
    expect(html).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/);
    await admin.context().close();

    const opRes = await (await browser.newContext()).request.post('/api/dev/upsert-operator', { data: { email: `funnel-op2-${ts}@test.carelinkai.com`, companyName: `Funnel Ops2 ${ts}` } });
    expect(opRes.status()).toBe(200);
    for (const email of [FAMILY_EMAIL, `funnel-op2-${ts}@test.carelinkai.com`]) {
      const page = await signedIn(browser, email);
      await page.goto('/admin/analytics/funnel', { waitUntil: 'domcontentloaded' });
      await expect(page).not.toHaveURL(/\/admin\/analytics\/funnel/, { timeout: 30_000 });
      await expect(page.getByRole('heading', { name: 'Conversion funnel' })).toHaveCount(0);
      await page.context().close();
    }
  });

  test('(e) every consent box ticked: no Meta Pixel, Clarity or Google request on public, search, listing, concierge and /cleveland pages', async ({ browser }) => {
    const { page, thirdParty } = await guest(browser, true);
    for (const path of ['/', '/search?q=test', `/homes/${homeId}`, '/concierge', '/cleveland/assisted-living']) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('load');
      await page.waitForTimeout(2000);
    }
    const trackers = thirdParty.filter((u) => TRACKER_HOSTS.test(new URL(u).hostname));
    expect(trackers, 'requests to Meta / Clarity / Google').toEqual([]);
    expect(thirdParty.filter((u) => /facebook\.net|connect\.facebook\.net/.test(u))).toEqual([]);
    // Nor any tracker global or script tag.
    const globals = await page.evaluate(() => ({
      fbq: typeof (window as unknown as { fbq?: unknown }).fbq,
      clarity: typeof (window as unknown as { clarity?: unknown }).clarity,
      gtag: typeof (window as unknown as { gtag?: unknown }).gtag,
      scripts: Array.from(document.scripts).map((s) => s.src).filter((src) => /facebook|clarity|googletagmanager|google-analytics/.test(src)),
    }));
    expect(globals).toEqual({ fbq: 'undefined', clarity: 'undefined', gtag: 'undefined', scripts: [] });
    await page.context().close();
  });
});
