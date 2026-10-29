/**
 * OL-226 conversion measurement, end to end.
 *  (a) analytics consent: search → card → profile → open inquiry → submit sends exactly the funnel
 *      events search_performed, listing_clicked, profile_viewed, inquiry_started, inquiry_submitted,
 *      each with allowlisted props only and no free text (query, location, name, email, phone, message).
 *  (b) a failed submit (POST /api/inquiries → 500) sends inquiry_started but never inquiry_submitted.
 *  (c) analytics declined: the full inquiry works and the page makes zero analytics requests.
 *  (d) /admin/analytics/funnel renders for ADMIN; FAMILY and OPERATOR are turned away.
 * Test data is fictional; RESEND_API_KEY is unset in CI, so nothing is emailed.
 *
 *   npx playwright test --config=playwright.e2e.config.ts e2e/public/directory/analytics-funnel.spec.ts
 */
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
const ANALYTICS_HOSTS = /\/api\/analytics\/track|google-analytics\.com|googletagmanager\.com|clarity\.ms|facebook\.(net|com)|doubleclick\.net/;

const consentInit = (analytics: boolean) => (a: boolean) => {
  try {
    localStorage.setItem('carelinkai_cookie_consent', JSON.stringify({ necessary: true, analytics: a, marketing: false }));
    for (const r of ['ADMIN', 'FAMILY', 'OPERATOR']) localStorage.setItem(`carelinkai_onboarding_completed_${r}`, 'true');
  } catch {
    /* storage blocked */
  }
};

type Captured = { name: string; props: Record<string, unknown>; sid: string; raw: string };

async function guest(browser: Browser, analytics: boolean) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(consentInit(analytics), analytics);
  const page = await ctx.newPage();
  const events: Captured[] = [];
  const analyticsRequests: string[] = [];
  page.on('request', (r: Request) => {
    if (!ANALYTICS_HOSTS.test(r.url())) return;
    analyticsRequests.push(`${r.method()} ${r.url()}`);
    if (r.url().includes('/api/analytics/track')) {
      const raw = r.postData() || '';
      try {
        const j = JSON.parse(raw);
        events.push({ name: j.name, props: j.props, sid: j.sid, raw });
      } catch {
        events.push({ name: '?', props: {}, sid: '', raw });
      }
    }
  });
  return { page, events, analyticsRequests };
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
    await request.post('/api/dev/upsert-admin', { data: { email: ADMIN } });
    const res = await request.post('/api/dev/upsert-operator', {
      data: { email: OP_EMAIL, companyName: `Funnel Ops ${ts}`, homes: [{ name: HOME, city: CITY, zipCode: '44122', careLevel: ['ASSISTED'], unclaimed: true }] },
    });
    expect(res.status(), 'dev seed').toBe(200);
    homeId = ((await res.json()).homes as Array<{ id: string; name: string }>).find((h) => h.name === HOME)!.id;
    expect((await request.post('/api/dev/upsert-family', { data: { email: FAMILY_EMAIL } })).ok(), 'family seed').toBe(true);
  });

  test.afterAll(async ({ request }) => {
    await request.delete('/api/dev/upsert-operator', { data: { email: OP_EMAIL, homeIds: [homeId] } }).catch(() => undefined);
  });

  test('(a) with consent: the five funnel events, allowlisted props, no free text', async ({ browser }) => {
    const { page, events } = await guest(browser, true);
    await searchAndOpenProfile(page);
    await openAndFill(page);
    await submit(page, 201);
    await expect(page.getByTestId('inquiry-confirmation-unclaimed')).toBeVisible({ timeout: 30_000 });
    await expect.poll(() => events.filter((e) => e.name === 'inquiry_submitted').length, { timeout: 10_000 }).toBe(1);

    // Exactly these events, in this order (search_performed may repeat as the page settles its filters).
    const sequence = events.map((e) => e.name).filter((n, i, a) => n !== a[i - 1]);
    expect(sequence).toEqual(['search_performed', 'listing_clicked', 'profile_viewed', 'inquiry_started', 'inquiry_submitted']);

    for (const e of events) {
      for (const key of Object.keys(e.props)) expect(ALLOWED[e.name], `${e.name}.${key}`).toContain(key);
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
    const { page, analyticsRequests } = await guest(browser, false);
    await searchAndOpenProfile(page);
    await openAndFill(page);
    await submit(page, 201);
    await expect(page.getByTestId('inquiry-confirmation-unclaimed')).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1500);
    expect(analyticsRequests, 'no analytics network calls without consent').toEqual([]);
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
});
