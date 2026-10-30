/**
 * SupportDock acceptance (pre-launch polish 2). At 390 and 1280, on the homepage, /search results, a
 * facility profile, /marketplace/providers and a provider profile:
 *   (a) the launcher is visible for most of a top-to-bottom scroll;
 *   (b) hide/show toggles during that scroll are few and never rapid (no flicker);
 *   (c) no primary action (link, button, field) is ever under a clickable launcher, or under the open menu;
 *   (d) keyboard: Tab reaches the launcher, Enter/Space opens the menu, Arrow keys / Tab move between
 *       "Ask a Care Advisor" and "Report a bug", Escape closes and returns focus to the launcher.
 * Each run prints one `DOCK_RESULT {...}` line with the measurements.
 */
import { test, expect, type Page } from '@playwright/test';

const ts = Date.now();
const CITY = `Dockville${ts}`;
const OP_EMAIL = `dock-acc-op-${ts}@test.carelinkai.com`;
const FAMILY_EMAIL = `dock-acc-family-${ts}@carelinkai.test`;
const TAG = `dockacc${ts}`;
let homeId = '';
let providerId = '';

const CONSENT_INIT = () => {
  try {
    localStorage.setItem('carelinkai_cookie_consent', JSON.stringify({ necessary: true, analytics: false, marketing: false }));
    for (const r of ['FAMILY', 'PROVIDER']) localStorage.setItem(`carelinkai_onboarding_completed_${r}`, 'true');
  } catch { /* ignore */ }
};

const PRIMARY = 'a[href],button,input,select,textarea,summary,[role="button"],[role="link"],[role="tab"]';

type Result = {
  page: string; width: number; mode: string; steps: number; visibleSteps: number; visibleFraction: number;
  toggles: number; minToggleGapMs: number | null; coveredSteps: string[]; menuChecks: number; menuCovered: string[]; keyboard: string;
};

/** Primary elements actually under `box` (independent of the dock's own probes: intersection + topmost hit). */
async function coveredUnder(page: Page, box: { x: number; y: number; width: number; height: number }): Promise<string[]> {
  return page.evaluate(({ b, sel }) => {
    const dock = document.querySelector('[data-testid="support-dock"]');
    const menu = document.querySelector('[data-testid="support-menu"]');
    const mine = (n: Element) => Boolean(dock?.contains(n) || menu?.contains(n));
    const out: string[] = [];
    for (const el of Array.from(document.querySelectorAll(sel))) {
      if (mine(el)) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const left = Math.max(r.left, b.x), right = Math.min(r.right, b.x + b.width);
      const top = Math.max(r.top, b.y), bottom = Math.min(r.bottom, b.y + b.height);
      if (right - left < 2 || bottom - top < 2) continue;
      const hit = document.elementsFromPoint((left + right) / 2, (top + bottom) / 2).find((n) => !mine(n));
      if (hit && (el === hit || el.contains(hit))) out.push(`${el.tagName.toLowerCase()}:${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 40)}`);
    }
    return out;
  }, { b: box, sel: PRIMARY });
}

async function scrollerInfo(page: Page) {
  return page.evaluate(() => {
    const main = document.querySelector('main');
    const inMain = Boolean(main && main.scrollHeight > main.clientHeight + 4 && getComputedStyle(main).overflowY !== 'visible');
    const s = inMain ? main! : document.scrollingElement!;
    return { inMain, max: s.scrollHeight - s.clientHeight, view: s.clientHeight };
  });
}

async function scrollTo(page: Page, y: number) {
  await page.evaluate((top) => {
    const main = document.querySelector('main');
    const inMain = Boolean(main && main.scrollHeight > main.clientHeight + 4 && getComputedStyle(main).overflowY !== 'visible');
    (inMain ? main! : document.scrollingElement!).scrollTo({ top, behavior: 'instant' as ScrollBehavior });
  }, y);
}

async function keyboardCheck(page: Page): Promise<string> {
  const launcher = page.getByTestId('support-launcher');
  await scrollTo(page, 0);
  // Tab from the last tabbable element before the launcher (DOM order) must land on it.
  const prepared = await page.evaluate(() => {
    const tabbables = Array.from(document.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])'))
      .filter((el) => el.tabIndex >= 0 && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden' && !el.closest('[inert]'));
    const i = tabbables.findIndex((el) => el.getAttribute('data-testid') === 'support-launcher');
    if (i <= 0) return false;
    tabbables[i - 1].focus();
    return document.activeElement === tabbables[i - 1];
  });
  if (!prepared) return 'FAIL: launcher not in tab order';
  await page.waitForTimeout(800); // focusing that element may scroll the page (smooth); let it settle
  await page.keyboard.press('Tab');
  if (!(await launcher.evaluate((el) => el === document.activeElement))) return 'FAIL: Tab did not reach the launcher';
  await expect(launcher).toBeVisible(); // focus always shows it
  const ask = page.getByRole('menuitem', { name: 'Ask a Care Advisor' });
  const bug = page.getByRole('menuitem', { name: 'Report a bug' });
  const focused = (l: typeof ask) => l.evaluate((el) => el === document.activeElement);
  await page.keyboard.press('Enter');
  if (!(await focused(ask))) return 'FAIL: Enter did not open the menu on "Ask a Care Advisor"';
  await page.keyboard.press('ArrowDown');
  if (!(await focused(bug))) return 'FAIL: ArrowDown';
  await page.keyboard.press('ArrowUp');
  if (!(await focused(ask))) return 'FAIL: ArrowUp';
  await page.keyboard.press('Tab');
  if (!(await focused(bug))) return 'FAIL: Tab inside the menu';
  await page.keyboard.press('Escape');
  if ((await page.getByTestId('support-menu').count()) !== 0) return 'FAIL: Escape did not close';
  if (!(await launcher.evaluate((el) => el === document.activeElement))) return 'FAIL: Escape did not return focus';
  await page.keyboard.press('Space');
  if (!(await focused(ask))) return 'FAIL: Space did not open the menu';
  await page.keyboard.press('Escape');
  if (!(await launcher.evaluate((el) => el === document.activeElement))) return 'FAIL: second Escape';
  return 'pass';
}

async function measure(page: Page, name: string, width: number): Promise<Result> {
  const dock = page.getByTestId('support-dock');
  await expect(dock).toBeAttached({ timeout: 60_000 });
  await page.waitForTimeout(1200);
  // Record every settled hide/show with a timestamp.
  await page.evaluate(() => {
    const d = document.querySelector('[data-testid="support-dock"]')!;
    (window as any).__dockToggles = [];
    new MutationObserver(() => (window as any).__dockToggles.push([performance.now(), d.getAttribute('data-yielded')]))
      .observe(d, { attributes: true, attributeFilter: ['data-yielded'] });
  });
  const { max, view } = await scrollerInfo(page);
  const step = Math.max(120, Math.round(view * 0.3));
  const positions: number[] = [];
  for (let y = 0; y < max; y += step) positions.push(y);
  positions.push(max);
  let visibleSteps = 0;
  const coveredSteps: string[] = [];
  const menuCovered: string[] = [];
  let menuChecks = 0;
  const visiblePositions: number[] = [];
  for (const y of positions) {
    await scrollTo(page, y);
    await page.waitForTimeout(500); // > show delay, so the settled state is read
    const [yielded, blocked] = await Promise.all([dock.getAttribute('data-yielded'), dock.getAttribute('data-blocked')]);
    if (yielded === 'false') { visibleSteps++; visiblePositions.push(y); }
    if (blocked === 'false') {
      const box = (await page.getByTestId('support-launcher').boundingBox())!;
      const c = await coveredUnder(page, box);
      if (c.length) coveredSteps.push(`y=${y}: ${c.join(', ')}`);
    }
  }
  // Menu open at the top, middle and bottom of the visible stretch.
  const picks = visiblePositions.length ? [visiblePositions[0], visiblePositions[Math.floor(visiblePositions.length / 2)], visiblePositions[visiblePositions.length - 1]] : [];
  for (const y of Array.from(new Set(picks))) {
    await scrollTo(page, y);
    await page.waitForTimeout(500);
    if ((await dock.getAttribute('data-blocked')) !== 'false') continue;
    await page.getByTestId('support-launcher').click();
    const menu = page.getByTestId('support-menu');
    await expect(menu).toBeVisible();
    menuChecks++;
    const c = await coveredUnder(page, (await menu.boundingBox())!);
    if (c.length) menuCovered.push(`y=${y} (${await menu.getAttribute('data-placement')}): ${c.join(', ')}`);
    await page.getByTestId('support-launcher').click();
    await expect(menu).toHaveCount(0);
  }
  const toggles: Array<[number, string]> = await page.evaluate(() => (window as any).__dockToggles);
  const scrollToggles = toggles.length;
  let minGap: number | null = null;
  for (let i = 1; i < toggles.length; i++) {
    const g = toggles[i][0] - toggles[i - 1][0];
    minGap = minGap === null ? g : Math.min(minGap, g);
  }
  const keyboard = await keyboardCheck(page);
  return {
    page: name, width, mode: (await dock.getAttribute('data-mode')) ?? '?', steps: positions.length, visibleSteps, visibleFraction: +(visibleSteps / positions.length).toFixed(2),
    toggles: scrollToggles, minToggleGapMs: minGap === null ? null : Math.round(minGap), coveredSteps, menuChecks, menuCovered, keyboard,
  };
}

test.describe('SupportDock acceptance: 5 pages × 390 / 1280', () => {
  test.describe.configure({ timeout: 180_000 });

  test.beforeAll(async ({ request }) => {
    const res = await request.post('/api/dev/upsert-operator', {
      data: {
        email: OP_EMAIL,
        companyName: `Dock Acceptance Ops ${ts}`,
        homes: Array.from({ length: 6 }, (_, i) => ({
          name: `Dock Acceptance Home ${i + 1} ${ts}`, city: CITY, zipCode: '44122', careLevel: ['ASSISTED', 'MEMORY_CARE'], capacity: 20,
          ...(i === 0 ? { startingPriceMonthly: 5200, availabilityVerifiedDaysAgo: 2, availabilityCount: 3 } : {}),
        })),
      },
    });
    expect(res.status(), 'homes seed').toBe(200);
    homeId = (await res.json()).homes[0].id;
    for (let i = 0; i < 6; i++) {
      const r = await request.post('/api/dev/upsert-provider', {
        data: { email: `dock-acc-p${i}-${ts}@carelinkai.test`, businessName: `${TAG} Provider ${i + 1}`, serviceTypes: ['home-health', 'transportation'], coverageArea: { cities: ['Cleveland'], states: ['OH'] } },
      });
      expect(r.ok(), 'provider seed').toBe(true);
      if (i === 0) providerId = (await r.json()).id;
    }
    expect((await request.post('/api/dev/upsert-family', { data: { email: FAMILY_EMAIL } })).ok(), 'family seed').toBe(true);
  });

  test.afterAll(async ({ request }) => {
    await request.delete('/api/dev/upsert-operator', { data: { email: OP_EMAIL } }).catch(() => undefined);
  });

  const PAGES: Array<{ name: string; path: () => string; signedIn: boolean; ready: (p: Page) => Promise<void> }> = [
    { name: 'homepage', path: () => '/', signedIn: false, ready: async (p) => { await expect(p.getByTestId('home-hero-headline')).toBeVisible({ timeout: 60_000 }); } },
    { name: '/search results', path: () => `/search?location=${CITY}`, signedIn: false, ready: async (p) => { await expect(p.getByTestId('search-result-card').first()).toBeVisible({ timeout: 60_000 }); } },
    { name: 'facility profile', path: () => `/homes/${homeId}`, signedIn: false, ready: async (p) => { await expect(p.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 60_000 }); } },
    { name: '/marketplace/providers', path: () => `/marketplace/providers?q=${TAG}`, signedIn: true, ready: async (p) => { await expect(p.getByRole('heading', { level: 3 }).filter({ hasText: TAG }).first()).toBeVisible({ timeout: 60_000 }); } },
    { name: 'provider profile', path: () => `/marketplace/providers/${providerId}`, signedIn: true, ready: async (p) => { await expect(p.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 60_000 }); } },
  ];

  for (const width of [390, 1280]) {
    for (const pg of PAGES) {
      test(`${pg.name} @ ${width}`, async ({ browser }) => {
        const ctx = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, hasTouch: width === 390 });
        await ctx.addInitScript(CONSENT_INIT);
        const page = await ctx.newPage();
        if (pg.signedIn) {
          await page.goto('/');
          expect(await page.evaluate(async (e) => (await fetch('/api/dev/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: e }), credentials: 'include' })).status, FAMILY_EMAIL)).toBe(200);
        }
        await page.goto(pg.path(), { waitUntil: 'domcontentloaded' });
        await pg.ready(page);
        const r = await measure(page, pg.name, width);
        console.log(`DOCK_RESULT ${JSON.stringify(r)}`);
        expect(r.coveredSteps, '(c) launcher over a primary action').toEqual([]);
        expect(r.menuCovered, '(c) open menu over a primary action').toEqual([]);
        expect(r.keyboard, '(d) keyboard').toBe('pass');
        expect(r.visibleFraction, '(a) visible for most of the scroll').toBeGreaterThanOrEqual(0.5);
        if (r.minToggleGapMs !== null) expect(r.minToggleGapMs, '(b) no rapid hide/show').toBeGreaterThanOrEqual(250);
        await ctx.close();
      });
    }
  }
});
