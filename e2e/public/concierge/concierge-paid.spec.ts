/**
 * Family Concierge — homepage section, family dashboard cards, terms (sprint W5-3, G1 e/f/g).
 *
 *  - homepage renders the concierge section logged-out (v2: the mistake headline,
 *    one line + the guarantee, CTA → /concierge, free-lane line — OL-165 b);
 *  - FAMILY user with no payer-lane answer → paid card "$399 flat" → dismiss hides
 *    it (30 days, per user, survives reload);
 *  - FAMILY user whose last payer-lane answer is Medicaid → "Free help for your
 *    situation" card, never the paid one;
 *  - a family with a REQUESTED_UNPAID order sees neither card;
 *  - /terms has the Family Concierge section.
 *
 * Self-seeds via /api/dev/*. No Stripe calls, nothing is emailed.
 */
import { test, expect, type Browser, type Page } from '@playwright/test';

const ts = Date.now();
const FAM_PRIVATE = `fam-private-${ts}@test.carelinkai.com`;
const FAM_UNSURE = `fam-unsure-${ts}@test.carelinkai.com`;
const FAM_MEDICAID = `fam-medicaid-${ts}@test.carelinkai.com`;
const FAM_ORDERED = `fam-ordered-${ts}@test.carelinkai.com`;

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

test.describe('@critical Family Concierge — homepage, dashboard cards, terms', () => {
  test.beforeAll(async ({ request }) => {
    expect((await request.post('/api/dev/upsert-family', { data: { email: FAM_PRIVATE, payerSource: 'PRIVATE_FUNDS' } })).ok()).toBe(true);
    expect((await request.post('/api/dev/upsert-family', { data: { email: FAM_UNSURE } })).ok()).toBe(true);
    expect((await request.post('/api/dev/upsert-family', { data: { email: FAM_MEDICAID, payerSource: 'MEDICAID_WAIVER' } })).ok()).toBe(true);
    expect((await request.post('/api/dev/upsert-family', { data: { email: FAM_ORDERED, payerSource: 'PRIVATE_FUNDS' } })).ok()).toBe(true);
    // An unpaid request from the ordered family (flag unset in CI → REQUESTED_UNPAID).
    const r = await request.post('/api/concierge/request', {
      headers: { 'x-forwarded-for': `203.0.113.${(ts % 200) + 10}` },
      data: { payerSource: 'PRIVATE_FUNDS', contactName: 'Ordered Family', contactEmail: FAM_ORDERED, careNeeds: `E2EORDERED${ts} assisted living near Parma` },
    });
    expect(r.status()).toBe(201);
    expect((await r.json()).orderStatus).toBe('REQUESTED_UNPAID');
  });

  test('homepage section renders logged-out: the mistake headline, one line + the guarantee, CTA and free-lane line', async ({ request }) => {
    const res = await request.get('/');
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html).toContain('data-testid="home-concierge-section"');
    // React separates adjacent text expressions with <!-- --> — strip them before text assertions.
    const section = html.slice(html.indexOf('data-testid="home-concierge-section"'), html.indexOf('Why CareLinkAI?')).replace(/<!--\s*-->/g, '');
    expect(section).toContain('We keep you from making the $5,000 mistake under pressure.');
    expect(section).toContain('A verified shortlist in 2 business days — or you pay nothing.');
    expect(section).toContain('No verified shortlist within 2 business days → full refund.');
    expect(section).toContain('$399 flat, one time');
    expect(section).toContain('Paying with Medicaid, Medicare or the VA? Our help is always free.');
    expect(section).not.toMatch(/legwork/i);
    expect(section).toMatch(/data-testid="home-concierge-cta"[^>]*href="\/concierge"|href="\/concierge"[^>]*data-testid="home-concierge-cta"/);
  });

  test('/terms has the v2 Family Concierge section: scope, verbatim not-included list, not-advice + no-outcome sentences', async ({ request }) => {
    const html = await (await request.get('/terms')).text();
    expect(html).toContain('data-testid="terms-family-concierge"');
    expect(html).toContain('flat $399');
    expect(html).toContain('refund the full fee');
    const visible = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<!--\s*-->/g, '').replace(/<[^>]+>/g, ' ');
    expect(visible).toContain('Medicaid runway estimate');
    expect(visible).toContain('Discharge coordination');
    expect(visible).toContain('medical, legal or financial advice; Medicaid application filing (we point to the Western Reserve AAA); attending tours in person; negotiating on the family’s behalf (we prepare them; they ask).');
    expect(visible).toContain('The Family Concierge is not medical, legal or financial advice.');
    expect(visible).toContain('We do not promise savings, a particular outcome, or that any home will agree to a request.');
    // OL-166a: the disclosure sentence lives in the Terms only.
    expect(visible).toContain('If a home ever pays CareLinkAI a fee when a resident moves in, we tell you before you tour; it never changes your price or which homes we show you.');
    expect(visible).not.toMatch(/legwork/i);
  });

  test('unknown lane (no payer answer yet) → free-help card first with the concierge as a secondary line; dismissible', async ({ browser }) => {
    const page = await login(browser, FAM_UNSURE);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    const card = page.getByTestId('concierge-free-card');
    await expect(card).toBeVisible({ timeout: 30000 });
    await expect(card).toHaveAttribute('data-variant', 'both');
    await expect(card).toContainText('If Medicaid may be involved, our help is free.');
    await expect(card.getByRole('link', { name: /Browse the free directory/ })).toHaveAttribute('href', '/cleveland');
    await expect(card.getByRole('link', { name: /Medicaid waiver/ })).toHaveAttribute('href', '/cleveland/assisted-living?waiver=1');
    await expect(card.getByTestId('concierge-both-cta')).toHaveAttribute('href', '/concierge');
    await expect(page.getByTestId('concierge-paid-card')).toHaveCount(0);
    // The price appears once, in the secondary line — never in the heading.
    await expect(card.getByRole('heading')).not.toContainText('$');
    const [res] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/family/concierge-upsell') && r.request().method() === 'POST'),
      card.getByTestId('concierge-both-dismiss').click(),
    ]);
    expect(res.status()).toBe(200);
    await expect(card).toHaveCount(0);
    const api = await page.evaluate(async () => (await fetch('/api/family/concierge-upsell', { credentials: 'include' })).json());
    expect(api).toMatchObject({ card: null, reason: 'dismissed' });
    await page.context().close();
  });

  test('private lane → paid card; dismiss hides it for 30 days (survives reload)', async ({ browser }) => {
    const page = await login(browser, FAM_PRIVATE);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    const card = page.getByTestId('concierge-paid-card');
    await expect(card).toBeVisible({ timeout: 30000 });
    // OL-165 c: one line + the guarantee.
    await expect(card).toContainText('Family Concierge — $399 flat, one time');
    await expect(card).toContainText('checks fit, prices and the contract with you before you sign');
    await expect(card).toContainText('No verified shortlist within 2 business days → full refund.');
    await expect(card).not.toContainText('legwork');
    await expect(card.getByTestId('concierge-paid-card-cta')).toHaveAttribute('href', '/concierge');
    await expect(page.getByTestId('concierge-free-card')).toHaveCount(0);
    const [res] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/family/concierge-upsell') && r.request().method() === 'POST'),
      card.getByTestId('concierge-paid-card-dismiss').click(),
    ]);
    expect(res.status()).toBe(200);
    await expect(card).toHaveCount(0);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /My Dashboard|Welcome back/ })).toBeVisible({ timeout: 30000 });
    await expect(page.getByTestId('concierge-paid-card')).toHaveCount(0);
    const api = await page.evaluate(async () => (await fetch('/api/family/concierge-upsell', { credentials: 'include' })).json());
    expect(api).toMatchObject({ card: null, reason: 'dismissed' });
    await page.context().close();
  });

  test('Medicaid lane → "Free help for your situation" card, never the paid one', async ({ browser }) => {
    const page = await login(browser, FAM_MEDICAID);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    const card = page.getByTestId('concierge-free-card');
    await expect(card).toBeVisible({ timeout: 30000 });
    await expect(card).toContainText('Free help for your situation');
    await expect(card.getByRole('link', { name: /Medicaid waiver/ })).toHaveAttribute('href', '/cleveland/assisted-living?waiver=1');
    await expect(page.getByTestId('concierge-paid-card')).toHaveCount(0);
    expect(await page.getByTestId('concierge-free-card').innerText()).not.toMatch(/\$\s?\d/);
    await page.context().close();
  });

  test('a family with an active (REQUESTED_UNPAID) order sees no card', async ({ browser }) => {
    const page = await login(browser, FAM_ORDERED);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /My Dashboard|Welcome back/ })).toBeVisible({ timeout: 30000 });
    const api = await page.evaluate(async () => (await fetch('/api/family/concierge-upsell', { credentials: 'include' })).json());
    expect(api).toMatchObject({ card: null, reason: 'active_order', lane: 'PRIVATE_FUNDS' });
    await expect(page.getByTestId('concierge-paid-card')).toHaveCount(0);
    await expect(page.getByTestId('concierge-free-card')).toHaveCount(0);
    await page.context().close();
  });
});
