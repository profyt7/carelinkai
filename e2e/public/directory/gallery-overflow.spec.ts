/**
 * OL-227 — /homes/[id] must never be wider than the viewport (iOS Safari zoomed out on listings with
 * real photos: the gallery + thumbnail strip ran past the right edge). Fixtures match production:
 *   - EIGHT: 8 photos, mixed portrait / landscape / very wide / square sources, one 150+ char caption;
 *   - ONE: a single (portrait) photo;
 *   - ZERO: no photos (placeholder).
 * At 390×844 and 375×667, guest and FAMILY: documentElement.scrollWidth <= innerWidth, the hero has the
 * same height on every fixture (4:3 below md), and the thumbnail strip's right edge is inside the
 * viewport. The same no-overflow check runs on /search and /cleveland/assisted-living/beachwood.
 *
 *   npx playwright test --config=playwright.e2e.config.ts e2e/public/directory/gallery-overflow.spec.ts
 */
import { test, expect, type Browser, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ts = Date.now();
const OP_EMAIL = `gallery-op-${ts}@test.carelinkai.com`;
const FAMILY_EMAIL = `gallery-family-${ts}@test.carelinkai.com`;
const NAMES = { eight: `E2E Gallery Eight ${ts}`, one: `E2E Gallery One ${ts}`, zero: `E2E Gallery Zero ${ts}` };
const ids: Record<keyof typeof NAMES, string> = { eight: '', one: '', zero: '' };

const LONG_CAPTION =
  'The sunlit dining room at St. Mary of the Woods, with restaurant-style seating for residents and visiting families, chef-prepared meals three times a day, and garden views';
const EIGHT_PHOTOS = [
  { url: '/images/homes/1.jpg', caption: LONG_CAPTION }, // landscape 3:2
  { url: '/images/e2e/portrait-fixture.jpg', caption: 'Courtyard entrance' }, // portrait 3:5
  { url: '/images/og-image.jpg', caption: 'Panorama of the grounds from the north lawn at sunset' }, // very wide 4.3:1
  { url: '/images/e2e/square-fixture.jpg', caption: 'Square detail' }, // square
  { url: '/images/homes/2.jpg', caption: 'Private suite' },
  { url: '/images/hero-bg.jpg', caption: 'Activity room' },
  { url: '/images/logo.png', caption: 'Very wide banner image' },
  { url: '/images/homes/3.jpg', caption: 'Chapel' },
];

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 375, height: 667 },
];

const CONSENT_INIT = () => {
  try {
    localStorage.setItem('carelinkai_cookie_consent', JSON.stringify({ necessary: true, analytics: false, marketing: false }));
    localStorage.setItem('carelinkai_onboarding_completed_FAMILY', 'true');
  } catch {
    /* storage blocked */
  }
};

async function newPage(browser: Browser, viewport: { width: number; height: number }, family: boolean): Promise<Page> {
  const ctx = await browser.newContext({ viewport, hasTouch: true, isMobile: true });
  await ctx.addInitScript(CONSENT_INIT);
  const page = await ctx.newPage();
  if (family) {
    await page.goto('/');
    const status = await page.evaluate(
      async (e) => (await fetch('/api/dev/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: e }), credentials: 'include' })).status,
      FAMILY_EMAIL,
    );
    expect(status, 'dev-login family').toBe(200);
  }
  return page;
}

/** Widest offender, for a useful failure message. */
const overflow = (page: Page) =>
  page.evaluate(() => {
    const vw = window.innerWidth;
    let worst: { el: string; right: number } | null = null;
    document.querySelectorAll('body *').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width && r.right > vw + 0.5 && (!worst || r.right > worst.right)) {
        // Elements clipped by a scrolling ancestor don't widen the page.
        let p = el.parentElement;
        while (p && p !== document.body) {
          const o = getComputedStyle(p).overflowX;
          if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') return;
          p = p.parentElement;
        }
        worst = { el: `${el.tagName.toLowerCase()}.${(el as HTMLElement).className?.toString().slice(0, 60)}`, right: Math.round(r.right) };
      }
    });
    return { scrollWidth: document.documentElement.scrollWidth, innerWidth: vw, worst };
  });

/**
 * With mobile emulation (as on iOS Safari) an overflowing page widens the layout viewport, so innerWidth grows
 * with it; compare against the device width as well.
 */
async function expectNoOverflow(page: Page, label: string, deviceWidth: number) {
  const o = await overflow(page);
  const msg = `${label}: page wider than the viewport (widest: ${JSON.stringify(o.worst)})`;
  expect(o.innerWidth, msg).toBe(deviceWidth);
  expect(o.scrollWidth, msg).toBeLessThanOrEqual(o.innerWidth);
}

async function openListing(page: Page, key: keyof typeof NAMES) {
  await page.goto(`/homes/${ids[key]}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1, name: NAMES[key], exact: true })).toBeVisible({ timeout: 60_000 });
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
}

const heroHeight = (page: Page) =>
  page.getByTestId('photo-gallery-hero').evaluate((el) => Math.round(el.getBoundingClientRect().height));

test.describe('@critical OL-227 gallery never overflows the viewport', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180_000);

  test.beforeAll(async ({ request }) => {
    const res = await request.post('/api/dev/upsert-operator', {
      data: {
        email: OP_EMAIL,
        companyName: `Gallery Ops ${ts}`,
        homes: Object.values(NAMES).map((name) => ({ name, city: 'Beachwood', zipCode: '44122', careLevel: ['ASSISTED'] })),
      },
    });
    expect(res.status(), 'dev seed').toBe(200);
    const homes = (await res.json()).homes as Array<{ id: string; name: string }>;
    for (const key of Object.keys(NAMES) as Array<keyof typeof NAMES>) ids[key] = homes.find((h) => h.name === NAMES[key])!.id;
    await prisma.homePhoto.createMany({
      data: [
        ...EIGHT_PHOTOS.map((p, i) => ({ homeId: ids.eight, url: p.url, caption: p.caption, sortOrder: i, isPrimary: i === 0 })),
        { homeId: ids.one, url: '/images/e2e/portrait-fixture.jpg', caption: LONG_CAPTION, sortOrder: 0, isPrimary: true },
      ],
    });
    expect((await request.post('/api/dev/upsert-family', { data: { email: FAMILY_EMAIL } })).ok(), 'family seed').toBe(true);
  });

  test.afterAll(async ({ request }) => {
    await request.delete('/api/dev/upsert-operator', { data: { email: OP_EMAIL } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  for (const vp of VIEWPORTS) {
    for (const family of [false, true]) {
      test(`${vp.width}×${vp.height} ${family ? 'FAMILY' : 'guest'}: no horizontal overflow, uniform hero, strip inside`, async ({ browser }) => {
        const page = await newPage(browser, vp, family);
        const heights: Record<string, number> = {};
        for (const key of ['eight', 'one', 'zero'] as const) {
          await openListing(page, key);
          await expectNoOverflow(page, `${key} @ ${vp.width}`, vp.width);
          heights[key] = await heroHeight(page);
          if (key === 'eight') {
            const strip = page.getByTestId('photo-gallery-thumbs');
            await expect(strip).toBeVisible();
            const r = await strip.evaluate((el) => ({ right: el.getBoundingClientRect().right, scrolls: el.scrollWidth > el.clientWidth }));
            expect(r.right, 'thumbnail strip right edge inside the viewport').toBeLessThanOrEqual(vp.width);
            expect(r.scrolls, 'eight thumbnails scroll inside the strip').toBe(true);
            // Caption, counter and "View All" never overlap.
            const boxes = await page.getByTestId('photo-gallery-hero').evaluate((hero) => {
              const q = (s: string) => hero.querySelector(s)?.getBoundingClientRect() ?? null;
              return { caption: q('[data-testid="photo-gallery-caption"]'), counter: q('[data-testid="photo-gallery-counter"]'), viewAll: q('[data-testid="photo-gallery-view-all"]') };
            });
            const overlap = (a: DOMRect | null, b: DOMRect | null) => !!a && !!b && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
            expect(overlap(boxes.caption, boxes.counter), 'caption vs counter').toBe(false);
            expect(overlap(boxes.caption, boxes.viewAll), 'caption vs View All').toBe(false);
            expect(overlap(boxes.counter, boxes.viewAll), 'counter vs View All').toBe(false);
          }
        }
        // 4:3 below md, identical on every fixture whatever the source image.
        expect(Math.abs(heights.eight - heights.one), JSON.stringify(heights)).toBeLessThanOrEqual(1);
        expect(Math.abs(heights.eight - heights.zero), JSON.stringify(heights)).toBeLessThanOrEqual(1);
        const width = await page.getByTestId('photo-gallery-hero').evaluate((el) => el.getBoundingClientRect().width);
        expect(Math.abs(heights.zero - (width * 3) / 4)).toBeLessThanOrEqual(1.5);

        for (const path of ['/search', '/cleveland/assisted-living/beachwood']) {
          await page.goto(path, { waitUntil: 'domcontentloaded' });
          await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
          await expectNoOverflow(page, `${path} @ ${vp.width}`, vp.width);
        }
        await page.context().close();
      });
    }
  }
});
