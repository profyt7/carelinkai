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
 *  - admin queue: approve transfers ownership (existing transfer → PENDING_REVIEW); reject doesn't;
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

async function devLogin(page: Page, email: string) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const status = await page.evaluate(async (e) => (await fetch('/api/dev/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: e }), credentials: 'include' })).status, email);
  expect(status, `dev-login ${email}`).toBe(200);
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
    for (const w of [390, 1280]) {
      const page = await ctxPage(browser, w);
      await devLogin(page, OP_X);
      await page.goto(`/homes/${home.a}`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('listing-claim-button').first()).toBeVisible({ timeout: 60_000 });
      await shot(page, `listing-claim-button-operator-${w}`, 'listing-claim-button');
      await page.close();
    }
    const page = await ctxPage(browser, 1280);
    await devLogin(page, OP_X);
    await page.goto(`/homes/${home.a}`, { waitUntil: 'domcontentloaded' });
    await page.getByTestId('listing-claim-button').first().click();
    await expect(page.getByTestId('listing-claim-submitted')).toContainText("Claim submitted — we'll verify and email you.");
    await shot(page, 'listing-claim-submitted-1280', 'listing-claim-submitted');
    const claims = await prisma.homeClaim.findMany({ where: { homeId: home.a } });
    expect(claims.map((c) => [c.status, c.source])).toEqual([['PENDING_REVIEW', 'listing_button']]);
    const a = await prisma.assistedLivingHome.findUniqueOrThrow({ where: { id: home.a }, select: { operator: { select: { user: { select: { email: true } } } } } });
    expect(a.operator?.user?.email).toBe(DIRECTORY);
    // The same at 390, on another listing.
    const phone = await ctxPage(browser, 390);
    await devLogin(phone, OP_X);
    await phone.goto(`/homes/${home.e}`, { waitUntil: 'domcontentloaded' });
    await phone.getByTestId('listing-claim-button').first().click();
    await expect(phone.getByTestId('listing-claim-submitted')).toBeVisible();
    await shot(phone, 'listing-claim-submitted-390', 'listing-claim-submitted');
    // Reload: the listing now says a claim is under review.
    await page.goto(`/homes/${home.a}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('listing-claim-pending-staff')).toBeVisible({ timeout: 60_000 });
  });

  test('one pending claim per home: a second operator is refused, and the database refuses a second row', async ({ browser }) => {
    const page = await ctxPage(browser, 1280);
    await devLogin(page, OP_Y);
    const status = await page.evaluate(async (id) => (await fetch(`/api/homes/${id}/claim-request`, { method: 'POST', credentials: 'include' })).status, home.a);
    expect(status).toBe(409);
    const opY = await prisma.operator.findFirstOrThrow({ where: { user: { email: OP_Y } }, select: { id: true } });
    await expect(prisma.homeClaim.create({ data: { homeId: home.a, operatorId: opY.id, source: 'listing_button' } })).rejects.toMatchObject({ code: 'P2002' });
  });

  test('an already-claimed listing is blocked and says who manages it', async ({ browser }) => {
    const op = await ctxPage(browser, 1280);
    await devLogin(op, OP_Y);
    expect(await op.evaluate(async (id) => (await fetch(`/api/homes/${id}/claim-request`, { method: 'POST', credentials: 'include' })).status, home.d)).toBe(409);
    const guest = await ctxPage(browser, 1280);
    await guest.goto(`/homes/${home.d}`, { waitUntil: 'domcontentloaded' });
    await expect(guest.getByTestId('listing-claim-managed')).toContainText('This listing is managed by its community.');
    await expect(guest.getByTestId('listing-claim-managed').getByRole('link')).toHaveAttribute('href', '/contact');
    await guest.goto(`/homes/${home.d}/claim`, { waitUntil: 'domcontentloaded' });
    await expect(guest.getByTestId('claim-page-managed')).toBeVisible();
    expect(await prisma.homeClaim.count({ where: { homeId: home.d } })).toBe(0);
  });

  test('logged out: listing button → claim page → signup carries the home through and files the claim', async ({ browser }) => {
    for (const w of [390, 1280]) {
      const page = await ctxPage(browser, w);
      await page.goto(`/homes/${home.b}`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('listing-claim-open')).toBeVisible({ timeout: 60_000 });
      await shot(page, `listing-claim-button-guest-${w}`, 'listing-claim-open');
      await page.close();
    }
    const page = await ctxPage(browser, 1280);
    await page.goto(`/homes/${home.b}`, { waitUntil: 'domcontentloaded' });
    await page.getByTestId('listing-claim-button').click();
    await expect(page).toHaveURL(new RegExp(`/homes/${home.b}/claim$`));
    await expect(page.getByTestId('claim-page-login')).toHaveAttribute('href', `/auth/login?callbackUrl=${encodeURIComponent(`/homes/${home.b}/claim`)}`);
    const href = await page.getByTestId('claim-page-register').getAttribute('href');
    const intent = new URL(href!, 'http://x').searchParams.get('claimIntent');
    expect(new URL(href!, 'http://x').searchParams.get('role')).toBe('OPERATOR');
    expect(intent).toBeTruthy();
    await page.getByTestId('claim-page-register').click();
    await expect(page).toHaveURL(/\/auth\/register\?role=OPERATOR&claimIntent=/);
    // The register form posts the intent with the account; post the same body the form sends.
    const res = await page.request.post('/api/auth/register', { data: { email: NEW_OP, password: 'Str0ng!Pass', firstName: 'Casey', lastName: 'Claim', phone: '(216) 555-0199', role: 'OPERATOR', agreeToTerms: true, claimIntent: intent } });
    expect(res.status(), await res.text()).toBe(201);
    expect((await res.json()).claim).toEqual({ submitted: true });
    const claim = await prisma.homeClaim.findFirstOrThrow({ where: { homeId: home.b }, include: { operator: { select: { user: { select: { email: true } } } } } });
    expect([claim.status, claim.source, claim.operator.user?.email]).toEqual(['PENDING_REVIEW', 'signup', NEW_OP]);
  });

  test('operator dashboard shows the submitted claim', async ({ browser }) => {
    const api = await ctxPage(browser, 1280);
    await devLogin(api, OP_Y);
    expect(await api.evaluate(async (id) => (await fetch(`/api/homes/${id}/claim-request`, { method: 'POST', credentials: 'include' })).status, home.c)).toBe(201);
    for (const w of [390, 1280]) {
      const page = await ctxPage(browser, w);
      await devLogin(page, OP_Y);
      await page.goto('/operator', { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('operator-pending-claims')).toContainText('Claim submitted');
      await expect(page.getByTestId('operator-pending-claims')).toContainText(`Claim Test C ${ts}`);
      await shot(page, `operator-claim-submitted-${w}`, 'operator-pending-claims');
      await page.close();
    }
  });

  test('admin queue: approve transfers ownership, reject does not', async ({ browser }) => {
    for (const w of [390, 1280]) {
      const page = await ctxPage(browser, w);
      await devLogin(page, ADMIN);
      await page.goto('/admin/home-claims', { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('admin-home-claim-row').filter({ hasText: `Claim Test A ${ts}` })).toContainText(`by ${OP_X}`, { timeout: 60_000 });
      await shot(page, `admin-claim-queue-${w}`);
      await page.close();
    }
    const page = await ctxPage(browser, 1280);
    await devLogin(page, ADMIN);
    await page.goto('/admin/home-claims', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('admin-home-claim-row').filter({ hasText: `Claim Test A ${ts}` }).getByTestId('admin-home-claim-approve').click();
    await expect(page.getByTestId('admin-home-claim-row').filter({ hasText: `Claim Test A ${ts}` })).toHaveCount(0, { timeout: 30_000 });
    await page.getByTestId('admin-home-claim-row').filter({ hasText: `Claim Test B ${ts}` }).getByTestId('admin-home-claim-reject').click();
    await expect(page.getByTestId('admin-home-claim-row').filter({ hasText: `Claim Test B ${ts}` })).toHaveCount(0, { timeout: 30_000 });

    const a = await prisma.assistedLivingHome.findUniqueOrThrow({ where: { id: home.a }, select: { status: true, operator: { select: { user: { select: { email: true } } } } } });
    expect([a.operator?.user?.email, a.status]).toEqual([OP_X, 'PENDING_REVIEW']);
    const b = await prisma.assistedLivingHome.findUniqueOrThrow({ where: { id: home.b }, select: { operator: { select: { user: { select: { email: true } } } } } });
    expect(b.operator?.user?.email).toBe(DIRECTORY);
    expect((await prisma.homeClaim.findFirstOrThrow({ where: { homeId: home.a } })).status).toBe('APPROVED');
    expect((await prisma.homeClaim.findFirstOrThrow({ where: { homeId: home.b } })).status).toBe('REJECTED');
    // B is open to claim again after a rejection.
    const guest = await ctxPage(browser, 1280);
    await guest.goto(`/homes/${home.b}/claim`, { waitUntil: 'domcontentloaded' });
    await expect(guest.getByTestId('claim-page-signed-out')).toBeVisible();
  });

  test('the signed outreach claim link still goes to the register/redeem path', async ({ browser }) => {
    const secret = process.env['NEXTAUTH_SECRET'];
    expect(secret, 'NEXTAUTH_SECRET must match the server').toBeTruthy();
    const now = Math.floor(Date.now() / 1000);
    const token = signClaimToken({ operatorEmail: `outreach-${ts}@test.carelinkai.com`, homeId: home.c, clevelandFounder: true, iat: now, exp: now + 3600 }, secret!);
    const page = await ctxPage(browser, 1280);
    await page.goto(`/claim?token=${encodeURIComponent(token)}`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/auth\/register\?role=OPERATOR&claimToken=/);
  });
});
