/**
 * Suburb SEO pages /cleveland/assisted-living/{westlake,strongsville,parma}
 * (sprint W3 item 3 / sprint 2.3).
 *
 *  - each page: 200 logged-out, no redirect, no noindex, canonical, in the
 *    sitemap, unique <title> / H1 / meta description;
 *  - listings count > 0 with real (seeded, non-demo) homes for that suburb,
 *    ODH inspection facts and the Verified Availability badge where seeded;
 *  - a demo home in the suburb never appears; a home in another suburb does
 *    not leak in; an unknown suburb slug 404s.
 *
 * Runs with the ./e2e config:
 *   npx playwright test --config=playwright.e2e.config.ts e2e/public/suburb-pages.spec.ts
 */
import { test, expect } from '@playwright/test';

const SUBURBS = [
  { slug: 'westlake', name: 'Westlake', city: 'Westlake' },
  { slug: 'strongsville', name: 'Strongsville', city: 'Strongsville' },
  { slug: 'parma', name: 'Parma', city: 'Parma' },
] as const;

const ts = Date.now();
const homeName = (city: string, kind: string) => `E2E ${city} ${kind} ${ts}`;

test.describe('@critical suburb assisted-living pages', () => {
  test.beforeAll(async ({ request }) => {
    const homes = SUBURBS.flatMap((s) => [
      {
        name: homeName(s.city, 'Verified'),
        capacity: 12,
        city: s.city,
        careLevel: ['ASSISTED'],
        availabilityVerifiedDaysAgo: 2,
        availabilityCount: 1,
        odhLicenseNumber: `${s.slug.slice(0, 3).toUpperCase()}${ts % 10000}R`,
        inspections: [{ surveyDate: '2026-02-18', surveyType: 'Standard', citationCount: 1 }],
      },
      { name: homeName(s.city, 'Plain'), capacity: 8, city: s.city, careLevel: ['ASSISTED'] },
      { name: homeName(s.city, 'Demo'), capacity: 8, city: s.city, careLevel: ['ASSISTED'], isDemo: true },
    ]);
    const res = await request.post('/api/dev/upsert-operator', {
      data: { email: `suburb-op-${ts}@test.carelinkai.com`, companyName: `Suburb Ops ${ts}`, homes },
    });
    expect(res.status(), 'dev seed').toBe(200);
  });

  const seen = { titles: new Set<string>(), h1s: new Set<string>(), descs: new Set<string>() };

  for (const s of SUBURBS) {
    test(`GET /cleveland/assisted-living/${s.slug} → 200, indexable, unique title/H1/meta, listings > 0`, async ({ request }) => {
      const res = await request.get(`/cleveland/assisted-living/${s.slug}`, { maxRedirects: 0 });
      expect(res.status()).toBe(200);
      expect(res.headers()['location']).toBeUndefined();
      expect((res.headers()['x-robots-tag'] ?? '').toLowerCase()).not.toContain('noindex');
      const html = await res.text();
      expect(html).not.toMatch(/<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i);
      expect(html).toMatch(new RegExp(`<link[^>]+rel="canonical"[^>]+getcarelinkai\\.com/cleveland/assisted-living/${s.slug}`));

      const title = html.match(/<title>([^<]+)<\/title>/)?.[1] ?? '';
      const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]?.replace(/<[^>]+>/g, '').trim() ?? '';
      const desc = html.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/)?.[1] ?? '';
      expect(title).toContain(s.name);
      expect(h1).toBe(`Assisted Living in ${s.name}, OH`);
      expect(desc).toContain(s.name);
      expect(seen.titles.has(title), 'title unique').toBe(false);
      expect(seen.h1s.has(h1), 'H1 unique').toBe(false);
      expect(seen.descs.has(desc), 'meta description unique').toBe(false);
      seen.titles.add(title);
      seen.h1s.add(h1);
      seen.descs.add(desc);

      // Listings: real homes for this suburb only, demo excluded, facts present.
      const count = Number(html.match(/data-count="(\d+)"/)?.[1] ?? 0);
      expect(count, 'listings count > 0').toBeGreaterThan(0);
      expect(html).toContain(homeName(s.city, 'Verified'));
      expect(html).toContain(homeName(s.city, 'Plain'));
      expect(html).not.toContain(homeName(s.city, 'Demo'));
      for (const other of SUBURBS) {
        if (other.slug !== s.slug) expect(html).not.toContain(homeName(other.city, 'Verified'));
      }
      expect(html).toContain('Verified Availability');
      expect(html).toContain('ODH survey Feb 18, 2026 · 1 citation');
      expect(html).toContain(`ODH license ${s.slug.slice(0, 3).toUpperCase()}${ts % 10000}R`);
      expect(html).not.toContain('@test.carelinkai.com');
    });
  }

  test('all three are in sitemap.xml', async ({ request }) => {
    const xml = await (await request.get('/sitemap.xml')).text();
    for (const s of SUBURBS) expect(xml).toContain(`https://getcarelinkai.com/cleveland/assisted-living/${s.slug}`);
  });

  test('an unknown suburb slug → 404 (never login)', async ({ request }) => {
    const res = await request.get('/cleveland/assisted-living/nowhere-ville', { maxRedirects: 0 });
    expect(res.status()).toBe(404);
    expect(res.headers()['location']).toBeUndefined();
  });

  test('rendered: Parma page shows cards linking to listings', async ({ page }) => {
    await page.goto('/cleveland/assisted-living/parma', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Assisted Living in Parma, OH');
    const card = page.locator('[data-testid="listing-card"]', { hasText: homeName('Parma', 'Verified') }).first();
    await expect(card).toBeVisible();
    await expect(card.getByRole('link', { name: 'View listing →' })).toHaveAttribute('href', /\/homes\/[a-z0-9]+/);
  });
});
