/**
 * Server-rendered listings on /cleveland/assisted-living (sprint W3 item 4).
 *
 * Seeds (via /api/dev/upsert-operator, ALLOW_DEV_ENDPOINTS=1):
 *   - a real ACTIVE assisted-living home with fresh verified availability, an
 *     ODH license and an inspection record;
 *   - a second real home with no verification / no inspections;
 *   - a DEMO home (must never appear — OL-112).
 * Then fetches the page with a cookie-less request (no browser, no JS) and
 * asserts the listing cards are in the HTML itself.
 *
 * Runs with the ./e2e config:
 *   npx playwright test --config=playwright.e2e.config.ts e2e/public/cleveland-listings.spec.ts
 */
import { test, expect } from '@playwright/test';

const ts = Date.now();
const OP_EMAIL = `listings-op-${ts}@test.carelinkai.com`;
const VERIFIED = `E2E Verified Manor ${ts}`;
const PLAIN = `E2E Plain Home ${ts}`;
const DEMO = `E2E Demo Tutorial Home ${ts}`;

test.describe('@critical /cleveland/assisted-living server-rendered listings', () => {
  test.beforeAll(async ({ request }) => {
    const res = await request.post('/api/dev/upsert-operator', {
      data: {
        email: OP_EMAIL,
        companyName: `Listings Ops ${ts}`,
        homes: [
          {
            name: VERIFIED,
            capacity: 16,
            city: 'Cleveland',
            careLevel: ['ASSISTED', 'MEMORY_CARE'],
            availabilityVerifiedDaysAgo: 1,
            availabilityCount: 2,
            startingPriceMonthly: 4800,
            odhLicenseNumber: `E2E${ts % 100000}R`,
            inspections: [
              { surveyDate: '2026-03-04', surveyType: 'Standard', citationCount: 2 },
              { surveyDate: '2025-02-10', surveyType: 'Standard', citationCount: 0 },
            ],
          },
          { name: PLAIN, capacity: 8, city: 'Parma', careLevel: ['ASSISTED'] },
          { name: DEMO, capacity: 8, city: 'Cleveland', careLevel: ['ASSISTED'], isDemo: true, availabilityVerifiedDaysAgo: 0 },
        ],
      },
    });
    expect(res.status(), 'dev seed').toBe(200);
  });

  // Remove what we seeded so later specs in the same job (e.g. the /search
  // demo-filter spec, 10 results per page) never lose their own home off page 1.
  test.afterAll(async ({ request }) => {
    await request.delete('/api/dev/upsert-operator', { data: { email: OP_EMAIL } }).catch(() => undefined);
  });

  test('logged-out fetch has listing cards in the HTML (not client-only)', async ({ request }) => {
    const res = await request.get('/cleveland/assisted-living', { maxRedirects: 0 });
    expect(res.status()).toBe(200);
    expect(res.headers()['location']).toBeUndefined();
    const html = await res.text();

    // Still an indexable landing page.
    expect(html).not.toMatch(/<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i);
    expect(html).toMatch(/<link[^>]+rel="canonical"[^>]+getcarelinkai\.com\/cleveland\/assisted-living/);

    // Cards are server-rendered.
    const cards = html.match(/data-testid="listing-card"/g) ?? [];
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.length).toBeLessThanOrEqual(12);
    expect(html).toContain(VERIFIED);
    expect(html).toContain(PLAIN);
    expect(html).not.toContain('data-testid="listings-empty"');

    // Demo fixtures never surface.
    expect(html).not.toContain(DEMO);

    // Verified Availability badge + ODH facts for the seeded home.
    expect(html).toContain('Verified Availability');
    expect(html).toContain('ODH survey Mar 4, 2026 · 2 citations · 2 surveys on file');
    expect(html).toContain(`ODH license E2E${ts % 100000}R`);
    expect(html).toContain('Starting around $4,800/mo');
    // No operator contact email in the page.
    expect(html).not.toContain(OP_EMAIL);
    expect(html).not.toContain('directory-unclaimed@carelinkai.system');
  });

  test('verified home sorts ahead of the unverified one', async ({ request }) => {
    const html = await (await request.get('/cleveland/assisted-living')).text();
    expect(html.indexOf(VERIFIED)).toBeGreaterThan(-1);
    expect(html.indexOf(VERIFIED)).toBeLessThan(html.indexOf(PLAIN));
  });

  test('rendered page links each card to its listing', async ({ page }) => {
    await page.goto('/cleveland/assisted-living', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Assisted Living in Cleveland/);
    const card = page.locator('[data-testid="listing-card"]', { hasText: VERIFIED }).first();
    await expect(card).toBeVisible();
    await expect(card.getByRole('link', { name: 'View listing →' })).toHaveAttribute('href', /\/homes\/[a-z0-9]+/);
  });
});
