/**
 * One-tap availability ping (sprint W4-1) — ping → reply → listing shows
 * Verified with today's date. Email transport only; NOTHING is sent in this
 * job (no RESEND_API_KEY) — the ping row + token are read via /api/dev.
 *
 *  - cron: 401 without the CRON_SECRET bearer; with it, pings ONLY the opted-in
 *    contact of a CLAIMED, non-demo home (demo, unclaimed, not-opted-in → never);
 *  - one-tap link with reply=2 → listing Verified today, 2 open, source PING;
 *    the same link again → "already recorded";
 *  - a second run does not re-ping a freshly verified home;
 *  - STOP link → contact opted out; garbage reply → admin review queue, admin
 *    resolves with a count; no reply + 10 days → EXPIRED, on the call-list CSV;
 *  - admin API 403 for operator/anonymous; inbound hook 401 without its secret.
 *
 * Runs with the ./e2e config (needs CRON_SECRET + PING_ENABLED=1 in the server env):
 *   npx playwright test --config=playwright.e2e.config.ts e2e/public/availability-ping.spec.ts
 */
import { test, expect, type Browser, type Page } from '@playwright/test';

const ts = Date.now();
const CRON = 'e2e-cron-secret';
const SENTINEL = 'directory-unclaimed@carelinkai.system';
const ADMIN = 'admin@carelinkai.com';
const OP = `ping-op-${ts}@test.carelinkai.com`;
const H = {
  claimed: `E2E Ping Claimed ${ts}`,
  stop: `E2E Ping Stop ${ts}`,
  garbage: `E2E Ping Garbage ${ts}`,
  expire: `E2E Ping Expire ${ts}`,
  noConsent: `E2E Ping NoConsent ${ts}`,
  demo: `E2E Ping Demo ${ts}`,
  unclaimed: `E2E Ping Unclaimed ${ts}`,
};
const ids: Record<string, string> = {};
const tokens: Record<string, string> = {};

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
async function getJson(page: Page, path: string, init?: { method?: string; body?: unknown }) {
  return page.evaluate(async ({ p, init }) => {
    const r = await fetch(p, {
      method: init?.method ?? 'GET',
      credentials: 'include',
      headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
      body: init?.body ? JSON.stringify(init.body) : undefined,
    });
    const text = await r.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch { /* csv */ }
    return { status: r.status, json, text, type: r.headers.get('content-type') || '' };
  }, { p: path, init });
}

test.describe.configure({ mode: 'serial' });

test.describe('@critical one-tap availability ping', () => {
  test.beforeAll(async ({ request }) => {
    const op = await request.post('/api/dev/upsert-operator', {
      data: {
        email: OP, companyName: `Ping Ops ${ts}`,
        homes: [{ name: H.claimed }, { name: H.stop }, { name: H.garbage }, { name: H.expire }, { name: H.noConsent }, { name: H.demo, isDemo: true }],
      },
    });
    expect(op.status()).toBe(200);
    for (const h of (await op.json()).homes as Array<{ id: string; name: string }>) ids[h.name] = h.id;
    const un = await request.post('/api/dev/upsert-operator', { data: { email: SENTINEL, companyName: 'CareLinkAI Directory', homes: [{ name: H.unclaimed }] } });
    expect(un.status()).toBe(200);
    ids[H.unclaimed] = (await un.json()).homes[0].id;
    await request.post('/api/dev/upsert-admin', { data: { email: ADMIN } });

    // Contacts: opted-in everywhere except NoConsent. Unclaimed opt-in came via the portal (NOT admin_call) → must never be pinged.
    for (const [name, optedIn] of [[H.claimed, true], [H.stop, true], [H.garbage, true], [H.expire, true], [H.noConsent, false], [H.demo, true], [H.unclaimed, true]] as const) {
      const r = await request.post('/api/dev/availability-ping', {
        data: { action: 'contact', homeId: ids[name], name: 'Pat Admissions', email: `contact-${ids[name]}@test.carelinkai.com`, optedIn, source: 'operator_portal' },
      });
      expect(r.status(), `contact ${name}`).toBe(200);
    }
  });

  // Remove what we seeded so later specs in the same job (search-demo-filter
  // expects its own home on page 1 of /search) are never crowded out.
  test.afterAll(async ({ request }) => {
    await request
      .post('/api/dev/availability-ping', { data: { action: 'cleanup', homeIds: Object.values(ids), emails: [OP] } })
      .catch(() => undefined);
  });

  test('cron: 401 without the secret; with it pings only opted-in contacts of claimed non-demo homes', async ({ request }) => {
    expect((await request.get('/api/cron/availability-ping')).status()).toBe(401);
    expect((await request.get('/api/cron/availability-ping', { headers: { authorization: 'Bearer wrong' } })).status()).toBe(401);

    const run = await request.get('/api/cron/availability-ping', { headers: { authorization: `Bearer ${CRON}` } });
    expect(run.status()).toBe(200);
    const body = await run.json();
    expect(body.ok).toBe(true);
    expect(body.disabled).toBe(false);
    expect(body.sent, 'nothing is ever sent in e2e').toBe(0);
    const pingedHomes = (body.pings as Array<{ homeId: string }>).map((p) => p.homeId);
    for (const name of [H.claimed, H.stop, H.garbage, H.expire]) expect(pingedHomes, name).toContain(ids[name]);
    for (const name of [H.noConsent, H.demo, H.unclaimed]) expect(pingedHomes, `${name} must not be pinged`).not.toContain(ids[name]);
    expect(body.skipped.unclaimed).toBeGreaterThanOrEqual(1);

    for (const name of [H.claimed, H.stop, H.garbage, H.expire]) {
      const j = await (await request.get(`/api/dev/availability-ping?homeId=${ids[name]}`)).json();
      expect(j.latestPing, name).toBeTruthy();
      expect(j.latestPing.outcome).toBeNull();
      expect(j.latestPing.channel).toBe('EMAIL');
      tokens[name] = j.latestPing.token;
    }
    for (const name of [H.noConsent, H.demo, H.unclaimed]) {
      const j = await (await request.get(`/api/dev/availability-ping?homeId=${ids[name]}`)).json();
      expect(j.latestPing, name).toBeNull();
    }
  });

  test('one-tap reply=2 → listing shows Verified with today\'s date, source PING; same link again → already recorded', async ({ page, request }) => {
    await page.goto(`/availability/ping?token=${encodeURIComponent(tokens[H.claimed])}&reply=2`, { waitUntil: 'domcontentloaded' });
    const result = page.getByTestId('ping-result');
    await expect(result).toBeVisible({ timeout: 30000 });
    await expect(result).toHaveAttribute('data-kind', 'count');
    await expect(result).toHaveAttribute('data-count', '2');
    await expect(page.getByText('Verified Availability')).toBeVisible();

    const home = await (await request.get(`/api/homes/${ids[H.claimed]}`)).json();
    const fresh = home.data.availabilityFreshness;
    expect(fresh.fresh).toBe(true);
    expect(fresh.count).toBe(2);
    expect(fresh.badge).toBe(true);
    expect(fresh.verifiedAt.slice(0, 10)).toBe(new Date().toISOString().slice(0, 10));
    expect(fresh.label).toContain('verified today');
    const dev = await (await request.get(`/api/dev/availability-ping?homeId=${ids[H.claimed]}`)).json();
    expect(dev.home.availabilitySource).toBe('PING');
    expect(dev.latestPing).toMatchObject({ outcome: 'UPDATED', parsedCount: 2, replyRaw: '2', replyVia: 'link' });

    // Single-use: the same link now shows the recorded answer and cannot change it.
    await page.goto(`/availability/ping?token=${encodeURIComponent(tokens[H.claimed])}&reply=5`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('ping-closed')).toContainText('Already recorded: 2 open');
    const again = await request.post('/api/availability/ping', { data: { token: tokens[H.claimed], reply: '5' } });
    expect(again.status()).toBe(409);
    expect((await request.get(`/api/dev/availability-ping?homeId=${ids[H.claimed]}`).then((r) => r.json())).home.availabilityCount).toBe(2);
  });

  test('a second run does not re-ping a home verified this week or one with an open ping', async ({ request }) => {
    const before = await (await request.get(`/api/dev/availability-ping?homeId=${ids[H.claimed]}`)).json();
    const run = await (await request.get('/api/cron/availability-ping', { headers: { authorization: `Bearer ${CRON}` } })).json();
    expect(run.ok).toBe(true);
    expect((run.pings as Array<{ homeId: string }>).map((p) => p.homeId)).not.toContain(ids[H.claimed]);
    expect((run.pings as Array<{ homeId: string }>).map((p) => p.homeId)).not.toContain(ids[H.stop]);
    const after = await (await request.get(`/api/dev/availability-ping?homeId=${ids[H.claimed]}`)).json();
    expect(after.latestPing.id).toBe(before.latestPing.id);
  });

  test('STOP link → contact opted out; the home is never pinged again', async ({ page, request }) => {
    await page.goto(`/availability/ping?token=${encodeURIComponent(tokens[H.stop])}&reply=STOP`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('ping-result')).toHaveAttribute('data-kind', 'stop', { timeout: 30000 });
    const dev = await (await request.get(`/api/dev/availability-ping?homeId=${ids[H.stop]}`)).json();
    expect(dev.contact.optedIn).toBe(false);
    expect(dev.contact.optedOutAt).toBeTruthy();
    expect(dev.latestPing.outcome).toBe('STOP');
    // The one-click (RFC 8058) unsubscribe endpoint keeps working on a closed ping.
    const unsub = await request.post(`/api/availability/ping/unsubscribe?token=${encodeURIComponent(tokens[H.stop])}`);
    expect(unsub.status()).toBe(200);
  });

  test('garbage reply → admin review queue with the raw text; admin resolves with a count', async ({ browser, request }) => {
    const r = await request.post('/api/availability/ping', { data: { token: tokens[H.garbage], reply: 'call me Tuesday about the 2nd floor' } });
    expect(r.status()).toBe(200);
    expect((await r.json()).kind).toBe('admin_review');
    const dev = await (await request.get(`/api/dev/availability-ping?homeId=${ids[H.garbage]}`)).json();
    expect(dev.latestPing.outcome).toBe('ADMIN_REVIEW');
    expect(dev.home.availabilityVerifiedAt).toBeNull();

    const admin = await login(browser, ADMIN);
    const list = await getJson(admin, '/api/admin/availability-pings');
    expect(list.status).toBe(200);
    const row = (list.json.rows as any[]).find((x) => x.homeId === ids[H.garbage]);
    expect(row.lastPing).toMatchObject({ state: 'admin_review', replyRaw: 'call me Tuesday about the 2nd floor' });
    expect(list.json.counts.adminReview).toBeGreaterThanOrEqual(1);
    // Per-facility sent / replied states are visible too.
    expect((list.json.rows as any[]).find((x) => x.homeId === ids[H.claimed]).lastPing.state).toBe('replied');
    expect((list.json.rows as any[]).find((x) => x.homeId === ids[H.expire]).lastPing.state).toBe('sent');
    expect((list.json.rows as any[]).find((x) => x.homeId === ids[H.stop]).lastPing.state).toBe('stop');
    expect((list.json.rows as any[]).find((x) => x.homeId === ids[H.demo]), 'demo excluded from admin view').toBeUndefined();

    await admin.goto('/admin/availability-pings', { waitUntil: 'domcontentloaded' });
    await expect(admin.getByTestId('ping-table')).toBeVisible({ timeout: 30000 });
    await expect(admin.getByTestId('ping-review-queue')).toContainText('call me Tuesday');

    const resolved = await getJson(admin, '/api/admin/availability-pings', { method: 'PATCH', body: { pingId: row.lastPing.id, count: 1 } });
    expect(resolved.status).toBe(200);
    const home = await (await request.get(`/api/homes/${ids[H.garbage]}`)).json();
    expect(home.data.availabilityFreshness).toMatchObject({ fresh: true, count: 1 });
    await admin.context().close();
  });

  test('no reply in 10 days → EXPIRED, Verified badge absent, home on the call-list CSV', async ({ browser, request }) => {
    const dev = await (await request.get(`/api/dev/availability-ping?homeId=${ids[H.expire]}`)).json();
    expect((await request.post('/api/dev/availability-ping', { data: { action: 'backdate-ping', pingId: dev.latestPing.id, daysAgo: 11 } })).status()).toBe(200);
    const run = await (await request.get('/api/cron/availability-ping', { headers: { authorization: `Bearer ${CRON}` } })).json();
    expect(run.expired).toBeGreaterThanOrEqual(1);
    const after = await (await request.get(`/api/dev/availability-ping?homeId=${ids[H.expire]}`)).json();
    expect(after.latestPing.outcome === 'EXPIRED' || after.latestPing.id !== dev.latestPing.id).toBe(true);
    const home = await (await request.get(`/api/homes/${ids[H.expire]}`)).json();
    expect(home.data.availabilityFreshness.fresh).toBe(false);
    // The expired link is closed.
    const closed = await request.post('/api/availability/ping', { data: { token: tokens[H.expire], reply: '1' } });
    expect([409, 410]).toContain(closed.status());

    const admin = await login(browser, ADMIN);
    const list = await getJson(admin, '/api/admin/availability-pings');
    const row = (list.json.rows as any[]).find((x) => x.homeId === ids[H.expire]);
    expect(row.lastPing.state === 'expired' || row.lastPing.state === 'sent').toBe(true);
    const csv = await getJson(admin, '/api/admin/availability-pings?format=call-list');
    expect(csv.status).toBe(200);
    expect(csv.type).toContain('text/csv');
    expect(csv.text.split('\n')[0]).toBe('facility,city,contact_name,mobile,email,preferred_channel,ping_sent_at,ping_expired_at,last_verified_at,last_count');
    if (row.lastPing.state === 'expired') expect(csv.text).toContain(H.expire);
    expect(csv.text).not.toContain(H.claimed);
    await admin.context().close();
  });

  test('admin API 403 for operator and anonymous; inbound hook 401 without its secret; bad token 404', async ({ browser, request }) => {
    const op = await login(browser, OP);
    expect((await getJson(op, '/api/admin/availability-pings')).status).toBe(403);
    await op.context().close();
    expect((await request.get('/api/admin/availability-pings')).status()).toBe(403);
    expect((await request.post('/api/availability/ping/inbound', { data: { from: OP, text: '2' } })).status()).toBe(401);
    expect((await request.post('/api/availability/ping', { data: { token: 'nope', reply: '2' } })).status()).toBe(404);
    const page = await request.get('/availability/ping?token=nope', { maxRedirects: 0 });
    expect(page.status()).toBe(200);
    expect(await page.text()).toContain('This link is invalid');
  });
});
