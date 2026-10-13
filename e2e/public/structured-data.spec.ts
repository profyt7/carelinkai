/**
 * Agent-readable listings (sprint W3 item 6): schema.org JSON-LD on listing +
 * directory + home pages, /llms.txt, robots.txt.
 *
 * Seeds a real ACTIVE home (verified availability, ODH license + inspection,
 * price) and a DEMO home via /api/dev/upsert-operator, then reads the
 * server HTML cookie-less and parses every <script type="application/ld+json">.
 *
 * Runs with the ./e2e config:
 *   npx playwright test --config=playwright.e2e.config.ts e2e/public/structured-data.spec.ts
 */
import { test, expect, type APIRequestContext } from '@playwright/test';

const ts = Date.now();
const OP_EMAIL = `jsonld-op-${ts}@test.carelinkai.com`;
const REAL = `E2E JSONLD Manor ${ts}`;
const DEMO = `E2E JSONLD Demo ${ts}`;
const LICENSE = `JL${ts % 100000}R`;
const EMAIL_RE = /@[a-z0-9.-]+\.[a-z]{2,}/i;

let realId = '';
let demoId = '';

function jsonLdBlocks(html: string): any[] {
  const out: any[] = [];
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) out.push(JSON.parse(m[1]));
  return out;
}

async function fetchHtml(request: APIRequestContext, path: string) {
  const res = await request.get(path, { maxRedirects: 0 });
  return { res, html: await res.text() };
}

test.describe('@critical structured data for AI agents', () => {
  test.beforeAll(async ({ request }) => {
    const res = await request.post('/api/dev/upsert-operator', {
      data: {
        email: OP_EMAIL,
        companyName: `JSONLD Ops ${ts}`,
        homes: [
          {
            name: REAL,
            capacity: 16,
            city: 'Westlake',
            careLevel: ['ASSISTED', 'MEMORY_CARE'],
            availabilityVerifiedDaysAgo: 1,
            availabilityCount: 2,
            startingPriceMonthly: 4800,
            odhLicenseNumber: LICENSE,
            inspections: [{ surveyDate: '2026-03-04', surveyType: 'Standard', citationCount: 2 }],
          },
          { name: DEMO, capacity: 8, city: 'Westlake', careLevel: ['ASSISTED'], isDemo: true },
        ],
      },
    });
    expect(res.status(), 'dev seed').toBe(200);
    const json = await res.json();
    realId = json.homes.find((h: any) => h.name === REAL).id;
    demoId = json.homes.find((h: any) => h.name === DEMO).id;
  });

  test('listing page: LocalBusiness JSON-LD with verified facts, no email, no empty fields', async ({ request }) => {
    const { res, html } = await fetchHtml(request, `/homes/${realId}`);
    expect(res.status()).toBe(200);
    expect(html).not.toMatch(/<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i);
    const blocks = jsonLdBlocks(html);
    const lb = blocks.find((b) => b['@type'] === 'LocalBusiness');
    expect(lb, 'LocalBusiness block present').toBeTruthy();
    expect(lb).toMatchObject({
      '@context': 'https://schema.org',
      name: REAL,
      url: `https://getcarelinkai.com/homes/${realId}`,
      address: { '@type': 'PostalAddress', addressLocality: 'Westlake', addressRegion: 'OH' },
      identifier: { propertyID: 'Ohio Department of Health license number', value: LICENSE },
      priceRange: 'From $4,800/month',
    });
    const props = Object.fromEntries((lb.additionalProperty as any[]).map((p) => [p.name, p.value]));
    expect(props['Verified availability']).toBe('Verified');
    expect(props['Availability verified at']).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(props['Openings (verified)']).toBe(2);
    expect(props['ODH surveys on file']).toBe(1);
    expect(props['Most recent ODH survey date']).toBe('2026-03-04');
    expect(props['Citations on most recent ODH survey']).toBe(2);
    expect(String(props['Free Medicaid lane'])).toContain('Medicaid, Medicare or the VA');
    expect((lb.makesOffer as any[]).map((o) => o.itemOffered.name)).toEqual(['Assisted Living', 'Memory Care']);
    // claimed by the seeded operator → telephone allowed, but none was seeded → omitted, not ''
    expect('telephone' in lb).toBe(false);
    const s = JSON.stringify(blocks);
    expect(s).not.toMatch(EMAIL_RE);
    expect(s).not.toContain('""');
    expect(s).not.toContain('null');
  });

  test('demo listing page: noindex and NO JSON-LD', async ({ request }) => {
    const { html } = await fetchHtml(request, `/homes/${demoId}`);
    expect(html).toMatch(/<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i);
    const blocks = jsonLdBlocks(html);
    expect(blocks.some((b) => b['@type'] === 'LocalBusiness')).toBe(false);
    expect(html).not.toContain(DEMO);
  });

  test('directory pages: ItemList JSON-LD of the rendered listings (demo excluded)', async ({ request }) => {
    for (const path of ['/cleveland/assisted-living', '/cleveland/assisted-living/westlake']) {
      const { res, html } = await fetchHtml(request, path);
      expect(res.status()).toBe(200);
      const list = jsonLdBlocks(html).find((b) => b['@type'] === 'ItemList');
      expect(list, `${path} ItemList`).toBeTruthy();
      const cards = (html.match(/data-testid="listing-card"/g) ?? []).length;
      expect(list.numberOfItems).toBe(cards);
      expect(list.itemListElement.length).toBe(cards);
      const urls = list.itemListElement.map((i: any) => i.url);
      expect(urls).toContain(`https://getcarelinkai.com/homes/${realId}`);
      expect(urls).not.toContain(`https://getcarelinkai.com/homes/${demoId}`);
      expect(list.itemListElement[0].position).toBe(1);
      expect(JSON.stringify(list)).not.toMatch(EMAIL_RE);
    }
    const hub = jsonLdBlocks((await fetchHtml(request, '/cleveland')).html).find((b) => b['@type'] === 'ItemList');
    expect(hub).toBeTruthy();
    expect(hub.itemListElement.map((i: any) => i.url)).toContain('https://getcarelinkai.com/cleveland/assisted-living/westlake');
  });

  test('home page: Organization JSON-LD in the server HTML', async ({ request }) => {
    const { res, html } = await fetchHtml(request, '/');
    expect(res.status()).toBe(200);
    const org = jsonLdBlocks(html).find((b) => b['@type'] === 'Organization');
    expect(org).toMatchObject({ name: 'CareLinkAI', url: 'https://getcarelinkai.com' });
    expect(JSON.stringify(org)).not.toMatch(EMAIL_RE);
  });

  test('/llms.txt → 200 text/plain logged-out, no redirect, and listed in robots.txt', async ({ request }) => {
    const res = await request.get('/llms.txt', { maxRedirects: 0 });
    expect(res.status()).toBe(200);
    expect(res.headers()['location']).toBeUndefined();
    expect(res.headers()['content-type']).toContain('text/plain');
    const txt = await res.text();
    expect(txt).toMatch(/^# CareLinkAI/);
    expect(txt).toContain('## Fee model');
    expect(txt).toContain('https://getcarelinkai.com/sitemap.xml');
    expect(txt).not.toMatch(EMAIL_RE);

    const robots = await (await request.get('/robots.txt')).text();
    expect(robots).toMatch(/Allow:\s*\/llms\.txt/);
    expect(robots).toContain('Sitemap: https://getcarelinkai.com/sitemap.xml');
  });
});
