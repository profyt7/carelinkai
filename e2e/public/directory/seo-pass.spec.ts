/**
 * OL-172 — SEO pass, checked on the rendered HTML:
 *  - every public page: one " | CareLinkAI" suffix, title ≤ 60 chars, meta
 *    description 140–155, og:title / og:description / og:image, twitter:card;
 *  - Beachwood: BreadcrumbList + FAQPage (questions = the visible FAQ) +
 *    ItemList + Organization with the published phone number;
 *  - the sitemap lists all 20 suburb pages; the hubs show the suburb grid;
 *  - care-type hubs list real homes with a count (or a named fallback);
 *  - a listing links back to its suburb page and care-type hubs;
 *  - the branded OG image routes answer image/png.
 *
 * Self-seeds via /api/dev/upsert-operator (non-demo homes) and cleans up.
 */
import { test, expect, type APIRequestContext } from '@playwright/test';

const ts = Date.now();
const OP_EMAIL = `seo-pass-op-${ts}@test.carelinkai.com`;
const NEW_SUBURBS = ['mentor', 'cuyahoga-falls', 'rocky-river', 'medina', 'hudson', 'north-olmsted', 'avon', 'twinsburg', 'chardon', 'stow', 'lyndhurst', 'mayfield-heights', 'shaker-heights', 'euclid', 'solon'];
const ALL_SUBURBS = ['westlake', 'strongsville', 'parma', 'beachwood', 'lakewood', ...NEW_SUBURBS];

let beachwoodHomeId = '';

const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const meta = (html: string, attr: 'name' | 'property', key: string) =>
  decode(html.match(new RegExp(`<meta[^>]+${attr}="${key}"[^>]+content="([^"]*)"`))?.[1] ?? html.match(new RegExp(`<meta[^>]+content="([^"]*)"[^>]+${attr}="${key}"`))?.[1] ?? '');
const jsonLd = (html: string): any[] =>
  [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => {
    try {
      return JSON.parse(m[1] as string);
    } catch {
      return null;
    }
  }).filter(Boolean);

async function getHtml(request: APIRequestContext, path: string): Promise<string> {
  let last = 0;
  for (let i = 0; i < 3; i++) {
    const r = await request.get(path, { timeout: 90_000 });
    last = r.status();
    if (r.ok()) return r.text();
  }
  throw new Error(`${path} → ${last}`);
}

test.describe('@critical OL-172 SEO pass', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(240_000);

  test.beforeAll(async ({ request }) => {
    const res = await request.post('/api/dev/upsert-operator', {
      data: {
        email: OP_EMAIL,
        companyName: `SEO Pass Ops ${ts}`,
        homes: [
          { name: `E2E SEO Beachwood ${ts}`, city: 'Beachwood', careLevel: ['ASSISTED', 'MEMORY_CARE'], medicaidWaiverStatus: 'ACCEPTING_NEW' },
          { name: `E2E SEO Mentor A ${ts}`, city: 'Mentor', careLevel: ['ASSISTED'] },
          { name: `E2E SEO Mentor B ${ts}`, city: 'Mentor', careLevel: ['ASSISTED'] },
        ],
      },
    });
    expect(res.status(), 'dev seed').toBe(200);
    beachwoodHomeId = (await res.json()).homes[0].id;
  });

  test.afterAll(async ({ request }) => {
    await request.delete('/api/dev/upsert-operator', { data: { email: OP_EMAIL } }).catch(() => undefined);
  });

  test('every public page: suffix once, ≤ 60-char title, 140–155 description, og + twitter tags', async ({ request }) => {
    const pages = [
      '/',
      '/cleveland',
      '/cleveland/assisted-living',
      '/cleveland/memory-care',
      '/cleveland/independent-living',
      '/cleveland/nursing-homes',
      '/cleveland/home-care-agencies',
      '/cleveland/assisted-living/beachwood',
      '/cleveland/assisted-living/mentor',
      '/concierge',
      '/search',
      '/contact',
      `/homes/${beachwoodHomeId}`,
    ];
    for (const p of pages) {
      const html = await getHtml(request, p);
      const title = decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '');
      const desc = meta(html, 'name', 'description');
      expect({ p, title, suffixes: title.split('| CareLinkAI').length - 1, fits: title.length <= 60 }).toEqual({ p, title, suffixes: 1, fits: true });
      expect({ p, desc, ok: desc.length >= 140 && desc.length <= 155 }).toEqual({ p, desc, ok: true });
      expect({ p, ogTitle: !!meta(html, 'property', 'og:title'), ogDesc: !!meta(html, 'property', 'og:description'), ogImage: !!meta(html, 'property', 'og:image'), card: meta(html, 'name', 'twitter:card') }).toEqual({
        p, ogTitle: true, ogDesc: true, ogImage: true, card: 'summary_large_image',
      });
      expect(html, `${p} must not double the suffix`).not.toContain('| CareLinkAI | CareLinkAI');
    }
  });

  test('Beachwood: BreadcrumbList + FAQPage (matching the visible FAQ) + ItemList + Organization telephone; 4 nearby suburbs', async ({ request }) => {
    const html = await getHtml(request, '/cleveland/assisted-living/beachwood');
    const blocks = jsonLd(html);
    const crumb = blocks.find((b) => b['@type'] === 'BreadcrumbList');
    expect(crumb.itemListElement.map((i: any) => i.item)).toEqual([
      'https://getcarelinkai.com/cleveland',
      'https://getcarelinkai.com/cleveland/assisted-living',
      'https://getcarelinkai.com/cleveland/assisted-living/beachwood',
    ]);
    const faq = blocks.find((b) => b['@type'] === 'FAQPage');
    expect(faq.mainEntity.length).toBeGreaterThanOrEqual(3);
    expect(faq.mainEntity.length).toBeLessThanOrEqual(5);
    const visibleQs = [...html.matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>/g)].map((m) => decode((m[1] as string).replace(/<[^>]+>/g, '').trim()));
    for (const q of faq.mainEntity) expect(visibleQs).toContain(q.name);
    expect(blocks.some((b) => b['@type'] === 'ItemList')).toBe(true);
    expect(blocks.find((b) => b['@type'] === 'Organization')?.telephone).toBe('+12162459482');
    expect((html.match(/data-testid="nearby-suburb"/g) ?? []).length).toBe(4);
  });

  test('sitemap lists all 20 suburb pages; both hubs show the suburb grid', async ({ request }) => {
    const xml = await getHtml(request, '/sitemap.xml');
    for (const s of ALL_SUBURBS) expect(xml, s).toContain(`https://getcarelinkai.com/cleveland/assisted-living/${s}`);
    for (const hub of ['/cleveland', '/cleveland/assisted-living']) {
      const html = await getHtml(request, hub);
      expect(html).toContain('data-testid="suburb-grid"');
      for (const s of NEW_SUBURBS) expect(html, `${hub} → ${s}`).toContain(`/cleveland/assisted-living/${s}"`);
    }
  });

  test('care-type hubs render real homes with a count, or name the fallback they show', async ({ request }) => {
    const mc = (await getHtml(request, '/cleveland/memory-care')).replace(/<!-- -->/g, '');
    expect(mc).toContain(`E2E SEO Beachwood ${ts}`);
    expect(mc).toMatch(/data-testid="listings-count"[^>]*>\d+ licensed home/);
    for (const p of ['/cleveland/independent-living', '/cleveland/nursing-homes', '/cleveland/home-care-agencies']) {
      const html = await getHtml(request, p);
      const fallback = html.match(/data-testid="care-type-listings"[^>]*data-fallback="([^"]*)"/)?.[1] ?? html.match(/data-fallback="([^"]*)"/)?.[1] ?? '';
      if (fallback) expect(html, p).toContain('data-testid="care-type-fallback-note"');
      expect(html, p).toMatch(/data-testid="listing-card"|data-testid="listings-empty"/);
    }
  });

  test('a listing links back to its suburb page and care-type hubs', async ({ page }) => {
    await page.goto(`/homes/${beachwoodHomeId}`, { waitUntil: 'domcontentloaded' });
    const box = page.getByTestId('listing-related-links');
    await expect(box).toBeVisible({ timeout: 60_000 });
    await expect(box.getByTestId('listing-suburb-link')).toHaveAttribute('href', '/cleveland/assisted-living/beachwood');
    const hubs = await box.getByTestId('listing-hub-link').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    expect(hubs).toEqual(['/cleveland/assisted-living', '/cleveland/memory-care']);
  });

  test('branded OG images answer image/png for each page type', async ({ request }) => {
    for (const p of ['/cleveland/opengraph-image', '/cleveland/memory-care/opengraph-image', '/cleveland/assisted-living/beachwood/opengraph-image', '/concierge/opengraph-image']) {
      const r = await request.get(p, { timeout: 90_000 });
      expect({ p, status: r.status(), type: r.headers()['content-type'] }).toEqual({ p, status: 200, type: 'image/png' });
    }
  });
});
