import { test, expect, type Page, type Browser } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { signClaimToken } from '../src/lib/claim-token';

/**
 * Self-serve listing claim (fix/self-serve-claim), end to end on a real build + database:
 *  - logged in: one click on an unclaimed listing files a PENDING_REVIEW claim; nothing changes hands;
 *  - one pending claim per home (API 409, and the database's partial unique index refuses a second row);
 *  - an already-claimed listing is blocked and says "managed by its community";
 *  - logged out: the listing's claim button → /homes/[id]/claim → signup carries the home through
 *    (claim intent) and files the claim; login carries it back (callbackUrl);
 *  - the operator dashboard shows "Claim submitted — we'll verify and email you";
 *  - admin queue: approve transfers ownership only (the live listing keeps ACTIVE and stays in public search); reject doesn't;
 *  - the signed outreach claim link still routes to the register/redeem path unchanged.
 * Emails are stubbed by guardedResendSend in e2e; nothing is sent.
 */

const prisma = new PrismaClient();
const ts = Date.now();
const DIRECTORY = 'directory-unclaimed@carelinkai.system';
const OP_X = `claim-x-${ts}@test.carelinkai.com`;
const OP_Y = `claim-y-${ts}@test.carelinkai.com`;
const OWNER = `claim-owner-${ts}@test.carelinkai.com`;
const ADMIN = `claim-admin-${ts}@test.carelinkai.com`;
const NEW_OP = `claim-new-${ts}@test.carelinkai.com`;
const SHOTS = process.env['CLAIM_SHOTS_DIR'];
const home: Record<'a' | 'b' | 'c' | 'd' | 'e', string> = { a: '', b: '', c: '', d: '', e: '' };

// CI runs this against a dev server that cold-compiles each route (and can restart on memory), so waits are long.
const SLOW = { timeout: 120_000 };

/** Log in through the page's request context (shares the browser's cookie jar; no homepage compile needed). */
async function devLogin(page: Page, email: string) {
  const res = await page.request.post('/api/dev/login', { data: { email }, timeout: 120_000 });
  expect(res.status(), `dev-login ${email}`).toBe(200);
}

/** Navigate, retrying when the CI dev server drops the connection while it restarts on memory. */
async function go(page: Page, url: string) {
  await expect(async () => {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180_000 });
  }).toPass({ timeout: 300_000, intervals: [5_000, 10_000, 20_000] });
}

/** POST a claim from the signed-in page's cookie jar. */
async function postClaim(page: Page, homeId: string) {
  return (await page.request.post(`/api/homes/${homeId}/claim-request`, { timeout: 120_000 })).status();
}

async function ctxPage(browser: Browser, width: number) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('carelinkai_cookie_consent', JSON.stringify({ necessary: true, analytics: false, marketing: false }));
      for (const r of ['OPERATOR', 'ADMIN']) localStorage.setItem(`carelinkai_onboarding_completed_${r}`, 'true');
      localStorage.setItem('carelinkai_onboarding_completed', 'true');
    } catch {}
  });
  return ctx.newPage();
}

const shot = async (page: Page, name: string, testId?: string) => {
  if (!SHOTS) return;
  if (testId) await page.getByTestId(testId).first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
};

test.describe('@critical self-serve listing claim', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(480_000);

  test.beforeAll(async ({ request }) => {
    await expect(async () => {
      const dir = await request.post('/api/dev/upsert-operator', { data: { email: DIRECTORY, companyName: 'Directory (unclaimed)', homes: [{ name: `Claim Test A ${ts}`, city: 'Cleveland' }, { name: `Claim Test B ${ts}`, city: 'Cleveland' }, { name: `Claim Test C ${ts}`, city: 'Cleveland' }, { name: `Claim Test E ${ts}`, city: 'Cleveland' }] } });
      expect(dir.status()).toBe(200);
      const hs = (await dir.json()).homes as { id: string; name: string }[];
      home.a = hs.find((h) => h.name.startsWith('Claim Test A'))!.id;
      home.b = hs.find((h) => h.name.startsWith('Claim Test B'))!.id;
      home.c = hs.find((h) => h.name.startsWith('Claim Test C'))!.id;
      home.e = hs.find((h) => h.name.startsWith('Claim Test E'))!.id;
      const owner = await request.post('/api/dev/upsert-operator', { data: { email: OWNER, companyName: `Owner ${ts}`, onboarded: true, homes: [{ name: `Claim Test D ${ts}`, city: 'Cleveland' }] } });
      home.d = (await owner.json()).homes[0].id;
      for (const e of [OP_X, OP_Y]) expect((await request.post('/api/dev/upsert-operator', { data: { email: e, companyName: `Ops ${e.slice(0, 7)}`, onboarded: true } })).status()).toBe(200);
      expect((await request.post('/api/dev/upsert-admin', { data: { email: ADMIN } })).ok()).toBe(true);
    }).toPass({ timeout: 90_000, intervals: [2000, 5000, 10000] });
  });

  test.afterAll(async () => {
    await prisma.homeClaim.deleteMany({ where: { homeId: { in: Object.values(home).filter(Boolean) } } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  test('logged in: one click files a PENDING_REVIEW claim; nothing changes hands', async ({ browser }) => {
    // Screenshot-only page loads run only when screenshots are requested (keeps the CI dev server's memory down).
    for (const w of SHOTS ? [390, 1280] : []) {
      const page = await ctxPage(browser, w);
      await devLogin(page, OP_X);
      await go(page, `/homes/${home.a}`);
      await expect(page.getByTestId('listing-claim-button').first()).toBeVisible(SLOW);
      await shot(page, `listing-claim-button-operator-${w}`, 'listing-claim-button');
      await page.close();
    }
    const page = await ctxPage(browser, 1280);
    await devLogin(page, OP_X);
    await go(page, `/homes/${home.a}`);
    await page.getByTestId('listing-claim-button').first().click();
    await expect(page.getByTestId('listing-claim-submitted')).toContainText("Claim submitted — we'll verify and email you.", SLOW);
    await shot(page, 'listing-claim-submitted-1280', 'listing-claim-submitted');
    const claims = await prisma.homeClaim.findMany({ where: { homeId: home.a } });
    expect(claims.map((c) => [c.status, c.source])).toEqual([['PENDING_REVIEW', 'listing_button']]);
    const a = await prisma.assistedLivingHome.findUniqueOrThrow({ where: { id: home.a }, select: { operator: { select: { user: { select: { email: true } } } } } });
    expect(a.operator?.user?.email).toBe(DIRECTORY);
    // The same at 390, on another listing (screenshots only).
    if (SHOTS) {
    const phone = await ctxPage(browser, 390);
    await devLogin(phone, OP_X);
    await go(phone, `/homes/${home.e}`);
    await phone.getByTestId('listing-claim-button').first().click();
    await expect(phone.getByTestId('listing-claim-submitted')).toBeVisible(SLOW);
    await shot(phone, 'listing-claim-submitted-390', 'listing-claim-submitted');
    await phone.close();
    }
    // Reload: the listing now says a claim is under review.
    await go(page, `/homes/${home.a}`);
    await expect(page.getByTestId('listing-claim-pending-staff')).toBeVisible(SLOW);
  });

  test('one pending claim per home: a second operator is refused, and the database refuses a second row', async ({ browser }) => {
    const page = await ctxPage(browser, 1280);
    await devLogin(page, OP_Y);
    const status = await postClaim(page, home.a);
    expect(status).toBe(409);
    const opY = await prisma.operator.findFirstOrThrow({ where: { user: { email: OP_Y } }, select: { id: true } });
    await expect(prisma.homeClaim.create({ data: { homeId: home.a, operatorId: opY.id, source: 'listing_button' } })).rejects.toMatchObject({ code: 'P2002' });
  });

  test('an already-claimed listing is blocked and says who manages it', async ({ browser }) => {
    const op = await ctxPage(browser, 1280);
    await devLogin(op, OP_Y);
    expect(await postClaim(op, home.d)).toBe(409);
    const guest = await ctxPage(browser, 1280);
    await go(guest, `/homes/${home.d}`);
    await expect(guest.getByTestId('listing-claim-managed')).toContainText('This listing is managed by its community.', SLOW);
    await expect(guest.getByTestId('listing-claim-managed').getByRole('link')).toHaveAttribute('href', '/contact');
    await go(guest, `/homes/${home.d}/claim`);
    await expect(guest.getByTestId('claim-page-managed')).toBeVisible(SLOW);
    expect(await prisma.homeClaim.count({ where: { homeId: home.d } })).toBe(0);
  });

  test('logged out: listing button → claim page → signup carries the home through and files the claim', async ({ browser }) => {
    for (const w of SHOTS ? [390, 1280] : []) {
      const page = await ctxPage(browser, w);
      await go(page, `/homes/${home.b}`);
      await expect(page.getByTestId('listing-claim-open')).toBeVisible(SLOW);
      await shot(page, `listing-claim-button-guest-${w}`, 'listing-claim-open');
      await page.close();
    }
    const page = await ctxPage(browser, 1280);
    await go(page, `/homes/${home.b}`);
    await page.getByTestId('listing-claim-button').click();
    await expect(page).toHaveURL(new RegExp(`/homes/${home.b}/claim$`), SLOW);
    await expect(page.getByTestId('claim-page-login')).toHaveAttribute('href', `/auth/login?callbackUrl=${encodeURIComponent(`/homes/${home.b}/claim`)}`);
    const href = await page.getByTestId('claim-page-register').getAttribute('href');
    const intent = new URL(href!, 'http://x').searchParams.get('claimIntent');
    expect(new URL(href!, 'http://x').searchParams.get('role')).toBe('OPERATOR');
    expect(intent).toBeTruthy();
    await page.getByTestId('claim-page-register').click();
    await expect(page).toHaveURL(/\/auth\/register\?role=OPERATOR&claimIntent=/, SLOW);
    // The register form posts the intent with the account; post the same body the form sends.
    const res = await page.request.post('/api/auth/register', { timeout: 120_000, data: { email: NEW_OP, password: 'Str0ng!Pass', firstName: 'Casey', lastName: 'Claim', phone: '(216) 555-0199', role: 'OPERATOR', agreeToTerms: true, claimIntent: intent } });
    expect(res.status(), await res.text()).toBe(201);
    expect((await res.json()).claim).toEqual({ submitted: true });
    const claim = await prisma.homeClaim.findFirstOrThrow({ where: { homeId: home.b }, include: { operator: { select: { user: { select: { email: true } } } } } });
    expect([claim.status, claim.source, claim.operator.user?.email]).toEqual(['PENDING_REVIEW', 'signup', NEW_OP]);
  });

  test('operator dashboard shows the submitted claim', async ({ browser }) => {
    const api = await ctxPage(browser, 1280);
    await devLogin(api, OP_Y);
    expect(await postClaim(api, home.c)).toBe(201);
    for (const w of SHOTS ? [390, 1280] : [1280]) {
      const page = await ctxPage(browser, w);
      await devLogin(page, OP_Y);
      // Reload until the banner shows: a dev-server restart mid-load leaves the page without it.
      await expect(async () => {
        await go(page, '/operator');
        await expect(page.getByTestId('operator-pending-claims')).toContainText('Claim submitted', { timeout: 60_000 });
      }).toPass({ timeout: 360_000, intervals: [5_000, 15_000] });
      await expect(page.getByTestId('operator-pending-claims')).toContainText(`Claim Test C ${ts}`, SLOW);
      await shot(page, `operator-claim-submitted-${w}`, 'operator-pending-claims');
      await page.close();
    }
  });

  test('admin queue: approve transfers ownership and the live listing stays in public search; reject does not', async ({ browser }) => {
    for (const w of SHOTS ? [390, 1280] : []) {
      const page = await ctxPage(browser, w);
      await devLogin(page, ADMIN);
      await go(page, '/admin/home-claims');
      await expect(page.getByTestId('admin-home-claim-row').filter({ hasText: `Claim Test A ${ts}` })).toContainText(`by ${OP_X}`, SLOW);
      await shot(page, `admin-claim-queue-${w}`);
      await page.close();
    }
    const page = await ctxPage(browser, 1280);
    await devLogin(page, ADMIN);
    await go(page, '/admin/home-claims');
    // Click in the queue; the database is the source of truth. If a dev-server restart swallows the click,
    // reload and click again (approve / reject are conditional on PENDING_REVIEW, so a repeat can't double-apply).
    const decide = async (name: string, action: 'approve' | 'reject', homeId: string, want: 'APPROVED' | 'REJECTED') => {
      await expect(async () => {
        const row = page.getByTestId('admin-home-claim-row').filter({ hasText: name });
        if ((await row.count()) === 0) await go(page, '/admin/home-claims');
        if ((await row.count()) > 0) await row.getByTestId(`admin-home-claim-${action}`).click({ timeout: 30_000 });
        await expect.poll(async () => (await prisma.homeClaim.findFirstOrThrow({ where: { homeId } })).status, { timeout: 30_000 }).toBe(want);
      }).toPass({ timeout: 360_000, intervals: [5_000, 15_000] });
      await expect(page.getByTestId('admin-home-claim-row').filter({ hasText: name })).toHaveCount(0, SLOW);
    };
    await expect(page.getByTestId('admin-home-claim-row').filter({ hasText: `Claim Test A ${ts}` })).toContainText(`by ${OP_X}`, SLOW);
    await decide(`Claim Test A ${ts}`, 'approve', home.a, 'APPROVED');
    await decide(`Claim Test B ${ts}`, 'reject', home.b, 'REJECTED');

    // Approval transfers ownership only: the live listing keeps its status and stays in public search.
    const a = await prisma.assistedLivingHome.findUniqueOrThrow({ where: { id: home.a }, select: { status: true, operator: { select: { user: { select: { email: true } } } } } });
    expect([a.operator?.user?.email, a.status]).toEqual([OP_X, 'ACTIVE']);
    const pub = await browser.newContext();
    expect((await pub.request.get(`/api/homes/${home.a}`, { timeout: 120_000 })).status()).toBe(200);
    const markers = await (await pub.request.get('/api/search?markers=1', { timeout: 120_000 })).json();
    expect((markers.markers as { id: string }[]).map((m) => m.id)).toContain(home.a);
    await pub.close();
    const b = await prisma.assistedLivingHome.findUniqueOrThrow({ where: { id: home.b }, select: { operator: { select: { user: { select: { email: true } } } } } });
    expect(b.operator?.user?.email).toBe(DIRECTORY);
    expect((await prisma.homeClaim.findFirstOrThrow({ where: { homeId: home.a } })).status).toBe('APPROVED');
    expect((await prisma.homeClaim.findFirstOrThrow({ where: { homeId: home.b } })).status).toBe('REJECTED');
    // B is open to claim again after a rejection.
    const guest = await ctxPage(browser, 1280);
    await go(guest, `/homes/${home.b}/claim`);
    await expect(guest.getByTestId('claim-page-signed-out')).toBeVisible(SLOW);
  });

  test('the signed outreach claim link still goes to the register/redeem path', async ({ browser }) => {
    const secret = process.env['NEXTAUTH_SECRET'];
    expect(secret, 'NEXTAUTH_SECRET must match the server').toBeTruthy();
    const now = Math.floor(Date.now() / 1000);
    const token = signClaimToken({ operatorEmail: `outreach-${ts}@test.carelinkai.com`, homeId: home.c, clevelandFounder: true, iat: now, exp: now + 3600 }, secret!);
    const page = await ctxPage(browser, 1280);
    await go(page, `/claim?token=${encodeURIComponent(token)}`);
    await expect(page).toHaveURL(/\/auth\/register\?role=OPERATOR&claimToken=/, SLOW);
  });
});
