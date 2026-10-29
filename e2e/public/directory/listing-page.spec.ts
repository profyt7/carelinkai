/**
 * OL-173 — public listing page (/homes/[id]) honesty + map.
 *
 * Seeds a "Windsor Heights Assisted Living <ts>" home via the dev endpoint
 * (ALLOW_DEV_ENDPOINTS=1). Like a directory import, the seed sets capacity 100
 * and an amenity but writes NO operator/admin history rows and NO verified
 * availability — so the page must treat capacity, availability and amenities as
 * unverified. It carries a Medicaid waiver status so the waiver line shows.
 *
 * Asserts:
 *   (a) the Leaflet map initialises, uses the MapTiler tile template (OL-178),
 *       shows the MapTiler + OSM attribution, never "Failed to initialize map";
 *   (b) no "100 Residents" / "spots available" / waitlist copy — availability
 *       reads "Availability: contact to confirm" in tile, Quick Facts and sidebar;
 *   (c) no "24/7" staffing claim; amenities labelled as reported by the home;
 *   (d) no "partnered with CareCredit";
 *   (e) the waiver line renders (data-testid="listing-page-waiver-line");
 *   (f) the OL-171 site header / logo / footer render.
 *
 *   npx playwright test --config=playwright.e2e.config.ts e2e/public/directory/listing-page.spec.ts
 */
import { test, expect } from '@playwright/test';

const ts = Date.now();
const OP_EMAIL = `listing-page-op-${ts}@test.carelinkai.com`;
const HOME_NAME = `Windsor Heights Assisted Living ${ts}`;

const CONSENT_INIT = () => {
  try {
    localStorage.setItem('carelinkai_cookie_consent', JSON.stringify({ necessary: true, analytics: false, marketing: false }));
  } catch {
    /* storage blocked — banner may show; assertions don't depend on it */
  }
};

let homeId = '';

test.describe('@critical /homes/[id] listing page (OL-173)', () => {
  test.beforeAll(async ({ request }) => {
    const res = await request.post('/api/dev/upsert-operator', {
      data: {
        email: OP_EMAIL,
        companyName: `Listing Page Ops ${ts}`,
        homes: [
          {
            name: HOME_NAME,
            city: 'Beachwood',
            zipCode: '44122',
            careLevel: ['ASSISTED'],
            medicaidWaiverStatus: 'ACCEPTING_NEW',
          },
        ],
      },
    });
    expect(res.status(), 'dev seed').toBe(200);
    homeId = (await res.json()).homeId;
    expect(homeId).toBeTruthy();
  });

  test.afterAll(async ({ request }) => {
    await request.delete('/api/dev/upsert-operator', { data: { email: OP_EMAIL } }).catch(() => undefined);
  });

  test('API marks the seeded fields as unverified', async ({ request }) => {
    const res = await request.get(`/api/homes/${homeId}`);
    expect(res.status()).toBe(200);
    const data = (await res.json()).data;
    expect(data.name).toBe(HOME_NAME);
    expect(data.verifiedFields).toEqual([]);
    expect(data.availabilityFreshness.fresh).toBe(false);
    expect(data.address.coordinates).toBeTruthy();
  });

  test('map, honest facts, waiver line, financing copy and site shell', async ({ page }) => {
    await page.addInitScript(CONSENT_INIT);
    await page.goto(`/homes/${homeId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1, name: HOME_NAME })).toBeVisible({ timeout: 60000 });

    // (f) OL-171 shared shell
    await expect(page.getByTestId('site-header')).toBeVisible();
    await expect(page.getByTestId('site-logo')).toBeVisible();
    await expect(page.getByTestId('site-footer')).toBeAttached();

    // (a) map
    const location = page.getByRole('heading', { level: 2, name: 'Location' });
    await location.scrollIntoViewIfNeeded();
    const leaflet = page.locator('#map-container.leaflet-container');
    await expect(leaflet).toBeVisible({ timeout: 30000 });
    // OL-178: MapTiler tiles (the job sets a fake NEXT_PUBLIC_MAPTILER_KEY);
    // assert the host + attribution, not the pixels. listing-map-tiles.spec.ts
    // intercepts the requests and checks nothing goes to OSM / CARTO.
    const tile = leaflet.locator('img.leaflet-tile').first();
    await expect(tile).toBeAttached({ timeout: 30000 });
    const src = (await tile.getAttribute('src')) ?? '';
    expect(src).toMatch(/^https:\/\/api\.maptiler\.com\/maps\/streets-v2\/256\/\d+\/\d+\/\d+(@2x)?\.png\?key=/);
    const attribution = leaflet.locator('.leaflet-control-attribution');
    await expect(attribution).toContainText('MapTiler');
    await expect(attribution).toContainText('OpenStreetMap contributors');
    await expect(attribution.locator('a[href="https://www.openstreetmap.org/copyright"]')).toHaveCount(1);
    await expect(attribution.locator('a[href="https://www.maptiler.com/copyright/"]')).toHaveCount(1);
    await expect(leaflet.locator('.leaflet-marker-icon')).toHaveCount(1);
    await expect(page.getByText('Failed to initialize map')).toHaveCount(0);
    await expect(page.getByText(/cartocdn|API KEY REQUIRED/i)).toHaveCount(0);

    // (b) capacity / availability
    await expect(page.getByTestId('listing-capacity-tile')).toHaveCount(0);
    // Pre-launch dedupe: availability is stated in the inquiry panel (and the < lg CTA bar), not
    // repeated in a stat tile or the About quick facts.
    await expect(page.getByTestId('listing-availability-tile')).toHaveCount(0);
    await expect(page.getByTestId('quick-facts-availability')).toHaveCount(0);
    await expect(page.getByTestId('sidebar-availability')).toContainText('Availability: contact to confirm');
    await expect(page.getByTestId('panel-availability-detail')).toHaveText('Availability changes often — we verify on request.');
    const body = page.locator('body');
    await expect(body).not.toContainText(/\b\d+ Residents\b/);
    await expect(body).not.toContainText(/spots? available/i);
    await expect(body).not.toContainText(/waitlist/i);
    await expect(body).not.toContainText(/\b0 beds\b/);

    // (c) staffing + amenities
    await expect(body).not.toContainText('24/7');
    await expect(page.getByTestId('amenities-heading')).toHaveText('Reported features — confirm on your tour');
    await expect(page.getByTestId('listing-amenities')).toHaveAttribute('data-verified', 'false');

    // (d) CareCredit
    await expect(body).not.toContainText(/partnered with CareCredit/i);
    await expect(page.getByText('Financing option (CareCredit)')).toBeVisible();
    await expect(page.getByTestId('carecredit-disclosure')).toContainText('not affiliated');

    // (e) Medicaid waiver line — same wording as the directory card
    const waiver = page.getByTestId('listing-page-waiver-line');
    await expect(waiver).toBeVisible();
    await expect(waiver).toHaveAttribute('data-waiver-status', 'ACCEPTING_NEW');
    await expect(waiver).toContainText('Medicaid Assisted Living Waiver: Accepting new waiver residents');
    await expect(waiver).toContainText('Confirm with the home');
  });
});
