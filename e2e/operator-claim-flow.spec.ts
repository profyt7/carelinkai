import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { loginAs } from './_helpers';

/**
 * Cleveland founder CLAIM FLOW regression guard.
 *
 * Mirrors the manual production smoke test run before founder outreach:
 *   - Founder card + "Free for 6 months · No credit card required" display
 *   - Completing onboarding lands on the BAA/DPA gate (NOT a Stripe checkout)
 *   - Claiming the admin-seeded home transfers ownership and activates it
 *
 * Complements e2e/operator-onboarding-wizard.spec.ts (which covers token
 * issuance / signup application / email-locking) — this file covers the parts
 * downstream of redemption: the seeded-home claim, the free-plan Step 4 card,
 * and the post-onboarding gate. Self-seeds via dev endpoints (ALLOW_DEV_ENDPOINTS=1).
 */

const ADMIN_EMAIL = 'admin@carelinkai.com';

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e4)}@test.carelinkai.com`;
}

/**
 * Set up a Cleveland founder who has redeemed a claim token for an admin-seeded
 * home, leaving the founder logged in with clevelandFounder + freeAccessUntil +
 * seededHomeId established. Returns the founder's email and the seeded home id.
 *
 * Uses the deterministic redemption path (POST /api/operator/claim) rather than
 * register-time `?claimToken=` application — the latter proved unreliable under
 * the CI dev server. Register-time application is covered separately by
 * operator-onboarding-wizard.spec.ts.
 */
async function seedFounderWithSeededHome(
  page: Page,
  request: APIRequestContext,
  opts?: { homeName?: string }
): Promise<{ founderEmail: string; homeId: string }> {
  const founderEmail = uniqueEmail('claim-founder');

  // Admin (issues the claim link).
  await request.post('/api/dev/upsert-admin', { data: { email: ADMIN_EMAIL } });

  // A home owned by a throwaway operator — stands in for an admin-seeded,
  // auto-populated directory listing the founder will claim.
  const seedRes = await request.post('/api/dev/upsert-operator', {
    data: {
      email: uniqueEmail('claim-seed'),
      companyName: 'Seed Directory Co',
      homes: [{ name: opts?.homeName ?? 'Maple Grove Assisted Living', capacity: 12 }],
    },
  });
  expect(seedRes.ok()).toBeTruthy();
  const seedData = await seedRes.json();
  const homeId: string = seedData.homes?.[0]?.id ?? seedData.homeId;
  expect(homeId).toBeTruthy();

  // The founder's own operator account (exists + ACTIVE).
  const founderRes = await request.post('/api/dev/upsert-operator', {
    data: { email: founderEmail, companyName: 'Founder Co' },
  });
  expect(founderRes.ok()).toBeTruthy();

  // Admin generates the founder claim link for this specific home + email.
  await loginAs(page, ADMIN_EMAIL);
  const claim = await page.evaluate(
    async ({ hid, email }: { hid: string; email: string }) => {
      const r = await fetch(`/api/admin/homes/${hid}/claim-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ operatorEmail: email, clevelandFounder: true }),
      });
      return { status: r.status, body: await r.json() };
    },
    { hid: homeId, email: founderEmail }
  );
  expect(claim.status).toBe(200);
  expect(claim.body.token).toBeTruthy();

  // Founder redeems the token. First make sure the founder session is actually
  // active — defend against a stale admin cookie left from the claim-link step.
  let who: any = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    await loginAs(page, founderEmail);
    who = await page.evaluate(async () => {
      const r = await fetch('/api/dev/whoami', { credentials: 'include' });
      return r.ok ? await r.json() : { status: r.status };
    });
    if (who?.session?.user?.email === founderEmail) break;
    await page.waitForTimeout(1000);
  }

  const redeem = await page.evaluate(async (t: string) => {
    const r = await fetch('/api/operator/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ token: t }),
    });
    return { status: r.status, body: await r.json() };
  }, claim.body.token as string);
  expect(
    redeem.status,
    `operator/claim ${redeem.status}: ${JSON.stringify(redeem.body)} | whoami=${JSON.stringify(who?.session?.user ?? who)}`
  ).toBe(200);

  const status = await page.evaluate(async () => {
    const r = await fetch('/api/operator/onboarding/status', { credentials: 'include' });
    return r.json();
  });
  expect(status.clevelandFounder).toBe(true);
  expect(status.freeAccessUntil).toBeTruthy();
  expect(status.seededHomeId).toBe(homeId);

  return { founderEmail, homeId };
}

test.describe('@critical Cleveland founder claim flow (post-redemption)', () => {
  test('founder claims the seeded home → ownership transfers, status ACTIVE, seededHomeId cleared', async ({
    page,
    request,
  }) => {
    const { founderEmail, homeId } = await seedFounderWithSeededHome(page, request);

    await loginAs(page, founderEmail);

    // Sanity: founder flags applied at signup, seeded home assigned.
    const before = await page.evaluate(async () => {
      const r = await fetch('/api/operator/onboarding/status', { credentials: 'include' });
      return r.json();
    });
    expect(before.clevelandFounder).toBe(true);
    expect(before.freeAccessUntil).toBeTruthy();
    expect(before.seededHomeId).toBe(homeId);

    // Claim the seeded home (Step 2 "Claim this home" calls this endpoint).
    const claimRes = await page.evaluate(
      async (hid: string) => {
        const r = await fetch(`/api/operator/homes/${hid}/claim`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ imageRightsAcknowledged: true }),
        });
        return { status: r.status, body: await r.json() };
      },
      homeId
    );
    expect(claimRes.status).toBe(200);
    expect(claimRes.body.home?.status).toBe('ACTIVE');

    // After claiming: seededHomeId is cleared and the home shows up as the
    // founder's own listing.
    const after = await page.evaluate(async () => {
      const status = await (
        await fetch('/api/operator/onboarding/status', { credentials: 'include' })
      ).json();
      const homes = await (
        await fetch('/api/operator/homes', { credentials: 'include' })
      ).json();
      return { status, homes };
    });
    expect(after.status.seededHomeId).toBeFalsy();
    const owned = (after.homes.homes || []) as Array<{ id: string }>;
    expect(owned.some((h) => h.id === homeId)).toBeTruthy();

    // Completing onboarding is free + idempotent (no Stripe involved).
    const complete = await page.evaluate(async () => {
      const r = await fetch('/api/operator/onboarding/complete', {
        method: 'POST',
        credentials: 'include',
      });
      return { status: r.status, body: await r.json() };
    });
    expect(complete.status).toBe(200);
    expect(complete.body.ok).toBe(true);
  });

  test('Step 4 shows the free founder card (no paid/Stripe path) and completing it lands on the BAA/DPA gate', async ({
    page,
    request,
  }) => {
    const { founderEmail } = await seedFounderWithSeededHome(page, request);

    await loginAs(page, founderEmail);
    await page.goto('/operator/onboarding/4', { waitUntil: 'domcontentloaded' });

    // Free founder card and its hallmark copy.
    await expect(page.getByText(/Cleveland Founder Program/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Free for 6 months/i)).toBeVisible();
    await expect(page.getByText(/No credit card required/i)).toBeVisible();
    await expect(page.getByText(/Your founder access is active/i)).toBeVisible();

    // The paid-plan / Stripe path must NOT be offered to founders.
    await expect(page.getByRole('button', { name: /start with/i })).toHaveCount(0);

    // Complete setup → no Stripe redirect → lands on the BAA/DPA acceptance gate.
    await page.getByRole('button', { name: /Complete setup/i }).click();
    await page.waitForURL(/\/operator\/acceptance/, { timeout: 20000 });
    await expect(page.getByRole('heading', { name: /Legal Agreements Required/i })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText(/Business Associate Agreement/i).first()).toBeVisible();
    await expect(page.getByText(/Data Processing Agreement/i).first()).toBeVisible();
  });

  test('Step 2 presents the seeded home as a CLAIM (not create) with the image-rights acknowledgment', async ({
    page,
    request,
  }) => {
    const { founderEmail } = await seedFounderWithSeededHome(page, request, {
      homeName: 'Canterbury Commons',
    });

    await loginAs(page, founderEmail);
    await page.goto('/operator/onboarding/2', { waitUntil: 'domcontentloaded' });

    // Founder variant: "Confirm your home" + pre-filled name + "Claim this home".
    await expect(page.getByText(/Confirm your home/i)).toBeVisible({ timeout: 15000 });
    await expect(page.locator('input[placeholder="Sunrise East Wing"]')).toHaveValue(
      'Canterbury Commons',
      { timeout: 10000 }
    );
    await expect(
      page.getByText(/I confirm I have rights to use the photos/i)
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /Claim this home/i })).toBeVisible();
  });
});
