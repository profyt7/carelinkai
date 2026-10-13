/**
 * Sprint W3 item 5 — /concierge screener routing + guards:
 *  - private funds / LTC insurance → private_pay; Medicaid / Medicare / VA /
 *    not sure / unanswered → free_help (fail-closed);
 *  - the page is public + known to the middleware and in the sitemap;
 *  - the concierge files make no Stripe calls (no product / price is created).
 */

import fs from 'fs';
import path from 'path';
import { CONCIERGE_REQUEST_PATH, conciergeRequestHref, routeForPayerSource } from '@/lib/concierge/screener';
import { PAYER_SOURCE_VALUES } from '@/lib/payer/payer-source';
import { isKnownAppPath, isPublicPage } from '@/lib/routing/public-routes';
import sitemap from '@/app/sitemap';

describe('routeForPayerSource', () => {
  it('only private pay and LTC insurance may see the offer', () => {
    expect(routeForPayerSource('PRIVATE_FUNDS')).toBe('private_pay');
    expect(routeForPayerSource('LTC_INSURANCE')).toBe('private_pay');
  });

  it('federal-program payers and unknowns get free help (never the offer / price)', () => {
    for (const v of ['MEDICAID_WAIVER', 'MEDICARE_ADVANTAGE', 'VA_BENEFITS', 'NOT_SURE'] as const) {
      expect(routeForPayerSource(v)).toBe('free_help');
    }
    expect(routeForPayerSource(null)).toBe('free_help');
    expect(routeForPayerSource(undefined)).toBe('free_help');
  });

  it('covers every PayerSource value', () => {
    for (const v of PAYER_SOURCE_VALUES) expect(['private_pay', 'free_help']).toContain(routeForPayerSource(v));
  });

  it('the placeholder CTA points at the existing intake with the payer source', () => {
    expect(CONCIERGE_REQUEST_PATH).toBe('/get-started');
    expect(conciergeRequestHref('PRIVATE_FUNDS')).toBe('/get-started?from=concierge&payerSource=PRIVATE_FUNDS');
  });
});

describe('/concierge routing + sitemap', () => {
  it('is public, known to the middleware, and in the sitemap', () => {
    expect(isPublicPage('/concierge')).toBe(true);
    expect(isKnownAppPath('/concierge')).toBe(true);
    expect(sitemap().map((e) => new URL(e.url).pathname)).toContain('/concierge');
  });
});

describe('no Stripe in the concierge diff', () => {
  it('neither the page, the screener nor the lib reference Stripe', () => {
    const root = path.join(__dirname, '..');
    for (const f of ['src/app/concierge/page.tsx', 'src/app/concierge/ConciergeScreener.tsx', 'src/lib/concierge/screener.ts']) {
      const src = fs.readFileSync(path.join(root, f), 'utf8');
      // No Stripe import, client or API call (the word may appear in a comment
      // explaining that no product / price exists yet).
      const stripeCall = /(from\s+['"]stripe['"]|@\/lib\/stripe|new Stripe\(|stripe\.(products|prices|checkout|paymentLinks))/i;
      expect({ file: f, stripe: stripeCall.test(src) }).toEqual({ file: f, stripe: false });
      expect({ file: f, dollarPrice: /\$\s?\d/.test(src) }).toEqual({ file: f, dollarPrice: false });
    }
  });
});
