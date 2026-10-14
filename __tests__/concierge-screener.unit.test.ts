/**
 * Sprint W3 item 5 + W4 0a — /concierge screener routing + guards:
 *  - private funds / LTC insurance → private_pay; Medicaid / Medicare / VA /
 *    not sure / unanswered → free_help (fail-closed);
 *  - the page is public + known to the middleware and in the sitemap;
 *  - the fee model is the decided one ($2,500 flat, facility-paid, private pay
 *    only, families pay nothing) and lives ONLY in the client-mounted offer:
 *    the server-rendered page carries no price;
 *  - the concierge files make no Stripe calls (no product / price is created).
 */

import fs from 'fs';
import path from 'path';
import { CONCIERGE_FEE_MODEL, CONCIERGE_REQUEST_API, routeForPayerSource } from '@/lib/concierge/screener';
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
});

describe('fee model (decided 2026-10-14)', () => {
  it('is $2,500 flat, facility-paid, private-pay only, families pay nothing', () => {
    expect(CONCIERGE_FEE_MODEL.amount).toBe(2500);
    expect(CONCIERGE_FEE_MODEL.display).toBe('$2,500');
    expect(CONCIERGE_FEE_MODEL.headline).toMatch(/\$2,500/);
    expect(CONCIERGE_FEE_MODEL.headline).toMatch(/paid by the facility/i);
    expect(CONCIERGE_FEE_MODEL.headline).toMatch(/families pay nothing/i);
    expect(CONCIERGE_FEE_MODEL.detail).toMatch(/private-pay/i);
    expect(CONCIERGE_FEE_MODEL.detail).toMatch(/Medicaid, Medicare or the VA/);
  });

  it('the request CTA posts to the concierge queue API', () => {
    expect(CONCIERGE_REQUEST_API).toBe('/api/concierge/request');
  });
});

describe('/concierge routing + sitemap', () => {
  it('is public, known to the middleware, and in the sitemap', () => {
    expect(isPublicPage('/concierge')).toBe(true);
    expect(isKnownAppPath('/concierge')).toBe(true);
    expect(sitemap().map((e) => new URL(e.url).pathname)).toContain('/concierge');
  });
});

describe('no Stripe in the concierge diff; no price in the server-rendered page', () => {
  const root = path.join(__dirname, '..');
  const read = (f: string) => fs.readFileSync(path.join(root, f), 'utf8');
  const stripeCall = /(from\s+['"]stripe['"]|@\/lib\/stripe|new Stripe\(|stripe\.(products|prices|checkout|paymentLinks))/i;

  it('none of the concierge files import or call Stripe', () => {
    for (const f of [
      'src/app/concierge/page.tsx',
      'src/app/concierge/ConciergeScreener.tsx',
      'src/app/concierge/ConciergeRequestForm.tsx',
      'src/lib/concierge/screener.ts',
      'src/lib/concierge/intake.ts',
      'src/app/api/concierge/request/route.ts',
    ]) {
      expect({ file: f, stripe: stripeCall.test(read(f)) }).toEqual({ file: f, stripe: false });
    }
  });

  it('the server page and the request form carry no dollar price; only the screener lib does', () => {
    for (const f of ['src/app/concierge/page.tsx', 'src/app/concierge/ConciergeRequestForm.tsx', 'src/app/concierge/ConciergeScreener.tsx']) {
      expect({ file: f, dollarPrice: /\$\s?\d/.test(read(f)) }).toEqual({ file: f, dollarPrice: false });
    }
    expect(/\$2,500/.test(read('src/lib/concierge/screener.ts'))).toBe(true);
  });
});
