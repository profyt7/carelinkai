/**
 * Listing detail is server-rendered (LISTING-DETAIL-SSR): the HTML a logged-out, no-JS client gets for
 * /homes/<id> already carries the listing — name, address, care types, Medicaid waiver line, the ODH
 * license / inspection tile, "Last confirmed" dates — plus the schema.org JSON-LD. Before, the HTML held
 * only the title, meta description and "No data found." until the browser fetch ran.
 *
 * Seeds one real ACTIVE home and one DEMO home via /api/dev/upsert-operator and reads the raw HTML with a
 * plain request (no browser, no JS, no cookies). Runs in e2e-public-directory (production build).
 */
import { test, expect } from '@playwright/test';

const ts = Date.now();
const OP_EMAIL = `ssr-op-${ts}@test.carelinkai.test`;
const REAL = `E2E SSR Manor ${ts}`;
const DEMO = `E2E SSR Demo ${ts}`;
const LICENSE = `SR${ts % 100000}R`;
const COMPANY_EMAIL = 'chris@getcarelinkai.com';

let realId = '';
let demoId = '';

/** Visible text only: no <script>/<style>, tags stripped, entities that matter decoded. */
function visibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');
}

test.describe('@critical listing detail is server-rendered', () => {
  test.beforeAll(async ({ request }) => {
    const res = await request.post('/api/dev/upsert-operator', {
      data: {
        email: OP_EMAIL,
        companyName: `SSR Ops ${ts}`,
        homes: [
          {
            name: REAL,
            capacity: 20,
            city: 'Parma',
            zipCode: '44129',
            careLevel: ['ASSISTED', 'MEMORY_CARE'],
            availabilityVerifiedDaysAgo: 2,
            availabilityCount: 3,
            startingPriceMonthly: 5100,
            medicaidWaiverStatus: 'ACCEPTING_NEW',
            odhLicenseNumber: LICENSE,
            inspections: [{ surveyDate: '2026-04-10', surveyType: 'Standard', citationCount: 1 }],
          },
          { name: DEMO, capacity: 8, city: 'Parma', careLevel: ['ASSISTED'], isDemo: true },
        ],
      },
    });
    expect(res.status(), 'dev seed').toBe(200);
    const json = await res.json();
    realId = json.homes.find((h: { name: string }) => h.name === REAL).id;
    demoId = json.homes.find((h: { name: string }) => h.name === DEMO).id;
  });

  test.afterAll(async ({ request }) => {
    await request.delete('/api/dev/upsert-operator', { data: { email: OP_EMAIL } }).catch(() => undefined);
  });

  test('logged-out HTML (no JS) carries the listing facts and the JSON-LD', async ({ request }) => {
    const res = await request.get(`/homes/${realId}`, { maxRedirects: 0 });
    expect(res.status()).toBe(200);
    const html = await res.text();
    const text = visibleText(html);

    expect(text).toContain(REAL);
    expect(text).toContain('Parma');
    expect(text).toContain('Assisted Living');
    expect(text).toContain('Memory Care');
    expect(text).toContain('Accepting new waiver residents'); // Medicaid waiver flag
    expect(text).toContain(`ODH license ${LICENSE}`); // license + latest inspection tile
    expect(text).toMatch(/Last confirmed [A-Z][a-z]{2} \d{1,2}, \d{4}/); // availability "Last confirmed" date
    expect(text).not.toContain('No data found');
    expect(text).not.toContain('Could not load listing');

    // schema.org JSON-LD still in the server HTML.
    expect(html).toMatch(/<script type="application\/ld\+json">[^<]*"@type":"LocalBusiness"/);

    // No personal data: no email address other than the company's own contact.
    const emails = (text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []).filter((e) => e.toLowerCase() !== COMPANY_EMAIL);
    expect(emails).toEqual([]);
    expect(text).not.toContain(OP_EMAIL);
  });

  test('a demo listing is not rendered for a logged-out visitor', async ({ request }) => {
    const res = await request.get(`/homes/${demoId}`, { maxRedirects: 0 });
    const text = visibleText(await res.text());
    expect(text).not.toContain(DEMO);
  });
});
