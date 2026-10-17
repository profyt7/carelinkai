/**
 * Medicaid Assisted Living Waiver (sprint W5-2, G3 + G4).
 *
 *  1. /concierge → Medicaid answer → CTA lands on the directory with the
 *     "Accepts Medicaid waiver" filter preset → only ACCEPTING_NEW homes render,
 *     each with the waiver line + WRAAA source note; the search API honours the
 *     same filter.
 *  2. Admin sets "accepts while Medicaid is pending" (source VA_CALL) in the
 *     Acceptance panel → /api/homes/:id and the public listing show the line →
 *     History has acceptance.updated / medicaidPendingAccepted / source VA_CALL.
 *
 * Self-seeds via /api/dev/*; cleans its homes up afterwards. Nothing is emailed.
 */
import { test, expect, type Browser, type Page } from '@playwright/test';

const ts = Date.now();
const OP = `op-waiver-${ts}@test.carelinkai.com`;
const ADMIN = 'admin@carelinkai.com';
const ACCEPT = `E2E Waiver Accepting ${ts}`;
const CURRENT = `E2E Waiver Current Only ${ts}`;
const NONE = `E2E Waiver Unknown ${ts}`;

const CONSENT_INIT = () => {
  try {
    localStorage.setItem('carelinkai_cookie_consent', JSON.stringify({ necessary: true, analytics: false, marketing: false }));
    for (const role of ['ADMIN', 'OPERATOR', 'FAMILY', 'DISCHARGE_PLANNER']) {
      localStorage.setItem(`carelinkai_onboarding_completed_${role}`, 'true');
    }
  } catch {
    /* ignore */
  }
};

async function login(browser: Browser, email: string): Promise<Page> {
  const ctx = await browser.newContext();
  await ctx.addInitScript(CONSENT_INIT);
  const page = await ctx.newPage();
  await page.goto('/');
  const status = await page.evaluate(async (e) => {
    const r = await fetch('/api/dev/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: e }), credentials: 'include' });
    return r.status;
  }, email);
  expect(status, `dev-login ${email}`).toBe(200);
  return page;
}

test.describe.configure({ mode: 'serial' });

test.describe('@critical Medicaid waiver filter + acceptance facts', () => {
  const ids: Record<string, string> = {};

  test.beforeAll(async ({ request }) => {
    const res = await request.post('/api/dev/upsert-operator', {
      data: {
        email: OP,
        companyName: `Waiver Ops ${ts}`,
        homes: [
          { name: ACCEPT, city: 'Cleveland', careLevel: ['ASSISTED'], availabilityVerifiedDaysAgo: 0, availabilityCount: 2, medicaidWaiverStatus: 'ACCEPTING_NEW' },
          { name: CURRENT, city: 'Cleveland', careLevel: ['ASSISTED'], availabilityVerifiedDaysAgo: 0, availabilityCount: 1, medicaidWaiverStatus: 'CURRENT_RESIDENTS_ONLY' },
          { name: NONE, city: 'Cleveland', careLevel: ['ASSISTED'], availabilityVerifiedDaysAgo: 0, availabilityCount: 1, medicaidWaiverStatus: 'UNKNOWN' },
        ],
      },
    });
    expect(res.status()).toBe(200);
    for (const h of (await res.json()).homes as Array<{ id: string; name: string }>) ids[h.name] = h.id;
    await request.post('/api/dev/upsert-admin', { data: { email: ADMIN } });
  });

  test.afterAll(async ({ request }) => {
    await request.delete('/api/dev/upsert-operator', { data: { email: OP } }).catch(() => undefined);
  });

  test('Medicaid screener answer → waiver-filtered directory shows only ACCEPTING_NEW homes with the waiver line', async ({ page, request }) => {
    await page.addInitScript(CONSENT_INIT);
    await page.goto('/concierge', { waitUntil: 'domcontentloaded' });
    const screener = page.getByTestId('concierge-screener');
    await expect(screener).toHaveAttribute('data-hydrated', 'true');
    await screener.getByLabel(/Medicaid/).check();
    await screener.getByRole('button', { name: 'Continue' }).click();
    const lane = page.getByTestId('concierge-free-lane');
    await expect(lane).toBeVisible();
    // Free lane: no price anywhere, and the CTA is the waiver-filtered directory.
    expect(await lane.innerText()).not.toMatch(/\$\s?\d/);
    const cta = page.getByTestId('concierge-free-cta');
    await expect(cta).toHaveAttribute('href', '/cleveland/assisted-living?waiver=1');
    await cta.click();
    await page.waitForURL(/\/cleveland\/assisted-living\?waiver=1/);

    const section = page.getByTestId('listings-section');
    await expect(section).toHaveAttribute('data-waiver-filter', '1');
    await expect(page.getByTestId('waiver-filter-banner')).toBeVisible();
    const cards = page.getByTestId('listing-card');
    await expect(cards.first()).toBeVisible();
    await expect(page.locator(`[data-testid="listing-card"][data-home-id="${ids[ACCEPT]}"]`)).toHaveCount(1);
    await expect(page.locator(`[data-testid="listing-card"][data-home-id="${ids[CURRENT]}"]`)).toHaveCount(0);
    await expect(page.locator(`[data-testid="listing-card"][data-home-id="${ids[NONE]}"]`)).toHaveCount(0);
    // Every card on the filtered page is ACCEPTING_NEW and carries the line + source note.
    const n = await cards.count();
    const lines = page.getByTestId('listing-waiver-line');
    await expect(lines).toHaveCount(n);
    for (let i = 0; i < n; i++) {
      await expect(lines.nth(i)).toHaveAttribute('data-waiver-status', 'ACCEPTING_NEW');
      await expect(lines.nth(i)).toContainText('Accepting new waiver residents');
      await expect(lines.nth(i)).toContainText('Source: Western Reserve Area Agency on Aging, Oct 2026. Confirm with the home.');
    }

    // The unfiltered page still shows the current-residents-only home (with its own line) and the UNKNOWN one (no line).
    const plain = await request.get('/cleveland/assisted-living');
    const html = await plain.text();
    expect(html).toContain(`data-home-id="${ids[CURRENT]}"`);
    expect(html).toContain('Waiver — current residents only');

    // /api/search honours the same filter (ACCEPTING_NEW only).
    const api = await request.get(`/api/search?medicaidWaiver=true&location=Cleveland&limit=50`);
    expect(api.status()).toBe(200);
    const names = ((await api.json()).data?.results ?? (await api.json()).results ?? []).map((h: any) => h.name) as string[];
    expect(names).toContain(ACCEPT);
    expect(names).not.toContain(CURRENT);
    expect(names).not.toContain(NONE);
  });

  test('admin sets medicaidPendingAccepted (VA_CALL) → listing + JSON show it → History has the event', async ({ browser, request }) => {
    const homeId = ids[NONE];
    const admin = await login(browser, ADMIN);
    await admin.goto(`/admin/homes/${homeId}`, { waitUntil: 'domcontentloaded' });
    const panel = admin.getByTestId('acceptance-panel');
    await expect(panel).toBeVisible({ timeout: 30000 });
    await panel.getByTestId('acceptance-source').selectOption('VA_CALL');
    await panel.getByTestId('acceptance-pending').selectOption('yes');
    await panel.getByTestId('acceptance-crm').selectOption('PointClickCare');
    const [res] = await Promise.all([
      admin.waitForResponse((r) => r.url().includes(`/api/admin/homes/${homeId}/acceptance`) && r.request().method() === 'POST'),
      panel.getByTestId('acceptance-save').click(),
    ]);
    expect(res.status()).toBe(200);
    const saved = await res.json();
    expect(saved).toMatchObject({ ok: true, changed: 2 });
    expect(saved.acceptance).toMatchObject({ medicaidPendingAccepted: true, medicaidPendingAcceptedSource: 'VA_CALL', admissionsCrm: 'PointClickCare', admissionsCrmSource: 'VA_CALL' });
    await expect(panel.getByTestId('acceptance-msg')).toContainText('Saved 2 changes');

    // History (W5-1) carries both changes, source VA_CALL, PHI-free values.
    const events = await admin.evaluate(async (id) => {
      const r = await fetch(`/api/admin/homes/${id}/events`, { credentials: 'include' });
      return { status: r.status, json: await r.json() };
    }, homeId);
    expect(events.status).toBe(200);
    const pendingEvt = (events.json.events as any[]).find((e) => e.eventType === 'acceptance.updated' && e.field === 'medicaidPendingAccepted');
    expect(pendingEvt).toMatchObject({ entityType: 'HOME', entityId: homeId, source: 'VA_CALL', actorRole: 'ADMIN', oldValue: { medicaidPendingAccepted: null }, newValue: { medicaidPendingAccepted: true, source: 'VA_CALL' } });
    expect((events.json.events as any[]).some((e) => e.field === 'admissionsCrm' && e.newValue?.admissionsCrm === 'PointClickCare')).toBe(true);
    await admin.context().close();

    // Public JSON + listing page.
    const json = await request.get(`/api/homes/${homeId}`);
    expect(json.status()).toBe(200);
    const view = (await json.json()).data.medicaidWaiver;
    expect(view.pendingAccepted).toBe(true);
    expect(view.pendingLine).toMatch(/^Accepts residents while the Medicaid application is pending: yes — verified /);
    expect(view.line).toBeNull(); // UNKNOWN → no waiver line

    const ctx = await browser.newContext();
    await ctx.addInitScript(CONSENT_INIT);
    const pub = await ctx.newPage();
    await pub.goto(`/homes/${homeId}`, { waitUntil: 'domcontentloaded' });
    const line = pub.getByTestId('medicaid-pending-line');
    await expect(line).toBeVisible({ timeout: 30000 });
    await expect(line).toContainText('Accepts residents while the Medicaid application is pending: yes');
    await expect(line).toContainText('verified');
    await expect(pub.getByTestId('medicaid-waiver-line')).toHaveCount(0);
    await ctx.close();
  });
});
