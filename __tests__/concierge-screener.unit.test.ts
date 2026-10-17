/**
 * Sprint W3 item 5 + W4 0a + W5-3 — /concierge screener routing + guards:
 *  - private funds / LTC insurance / not sure → private_pay (the paid, family-paid
 *    offer); Medicaid / Medicare / VA / unanswered → free_help (fail-closed);
 *  - the page is public + known to the middleware and in the sitemap;
 *  - the offer is the decided one ($399 flat, one-time, paid by the family) and
 *    lives ONLY in src/lib/concierge/offer.ts + the client-mounted offer card:
 *    the server-rendered page carries no price;
 *  - the screener / request files make no Stripe calls (checkout lives in
 *    src/lib/concierge/orders.ts + /api/concierge/checkout, behind a flag).
 */

import fs from 'fs';
import path from 'path';
import { CONCIERGE_REQUEST_API, routeForPayerSource } from '@/lib/concierge/screener';
import { CONCIERGE_OFFER, CONCIERGE_CHECKOUT_API } from '@/lib/concierge/offer';
import { PAYER_SOURCE_VALUES } from '@/lib/payer/payer-source';
import { isKnownAppPath, isPublicPage } from '@/lib/routing/public-routes';
import sitemap from '@/app/sitemap';

describe('routeForPayerSource', () => {
  it('private pay, LTC insurance and "not sure" may see the offer (the family pays)', () => {
    expect(routeForPayerSource('PRIVATE_FUNDS')).toBe('private_pay');
    expect(routeForPayerSource('LTC_INSURANCE')).toBe('private_pay');
    expect(routeForPayerSource('NOT_SURE')).toBe('private_pay');
  });

  it('federal-program payers get free help (never the offer / price); unanswered fails closed', () => {
    for (const v of ['MEDICAID_WAIVER', 'MEDICARE_ADVANTAGE', 'VA_BENEFITS'] as const) {
      expect(routeForPayerSource(v)).toBe('free_help');
    }
    expect(routeForPayerSource(null)).toBe('free_help');
    expect(routeForPayerSource(undefined)).toBe('free_help');
  });

  it('covers every PayerSource value', () => {
    for (const v of PAYER_SOURCE_VALUES) expect(['private_pay', 'free_help']).toContain(routeForPayerSource(v));
  });
});

describe('offer (decided W5-3)', () => {
  it('is $399 flat, one-time, paid by the family, with a 2-business-day refund guarantee', () => {
    expect(CONCIERGE_OFFER.priceCents).toBe(39900);
    expect(CONCIERGE_OFFER.priceDisplay).toBe('$399');
    expect(CONCIERGE_OFFER.bookLabel).toBe('Book the concierge — $399');
    expect(CONCIERGE_OFFER.guarantee).toMatch(/2 business days/);
    expect(CONCIERGE_OFFER.guarantee).toMatch(/full refund/);
    expect(CONCIERGE_OFFER.freeLaneLine).toMatch(/Medicaid, Medicare or the VA/);
  });

  it('the CTAs post to the request / checkout APIs', () => {
    expect(CONCIERGE_REQUEST_API).toBe('/api/concierge/request');
    expect(CONCIERGE_CHECKOUT_API).toBe('/api/concierge/checkout');
  });
});

describe('/concierge routing + sitemap', () => {
  it('is public, known to the middleware, and in the sitemap', () => {
    expect(isPublicPage('/concierge')).toBe(true);
    expect(isPublicPage('/concierge/thanks')).toBe(true);
    expect(isKnownAppPath('/concierge')).toBe(true);
    expect(sitemap().map((e) => new URL(e.url).pathname)).toContain('/concierge');
  });
});

describe('no Stripe in the screener / request files; no price in the server-rendered page', () => {
  const root = path.join(__dirname, '..');
  const read = (f: string) => fs.readFileSync(path.join(root, f), 'utf8');
  const stripeCall = /(from\s+['"]stripe['"]|@\/lib\/stripe|new Stripe\(|stripe\.(products|prices|checkout|paymentLinks))/i;

  it('none of the screener / request files import or call Stripe', () => {
    for (const f of [
      'src/app/concierge/page.tsx',
      'src/app/concierge/ConciergeScreener.tsx',
      'src/app/concierge/ConciergeRequestForm.tsx',
      'src/lib/concierge/screener.ts',
      'src/lib/concierge/offer.ts',
      'src/lib/concierge/intake.ts',
      'src/app/api/concierge/request/route.ts',
    ]) {
      expect({ file: f, stripe: stripeCall.test(read(f)) }).toEqual({ file: f, stripe: false });
    }
  });

  it('nothing in the codebase creates Stripe products or prices', () => {
    const walk = (dir: string, out: string[]) => {
      for (const name of fs.readdirSync(dir)) {
        const p = path.join(dir, name);
        if (fs.statSync(p).isDirectory()) walk(p, out);
        else if (/\.(ts|tsx)$/.test(name)) out.push(p);
      }
      return out;
    };
    const offenders = walk(path.join(root, 'src'), []).filter((f) => /stripe\.(products|prices)\.create\(/.test(fs.readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('the server page and the components carry no literal dollar price; only offer.ts does', () => {
    for (const f of ['src/app/concierge/page.tsx', 'src/app/concierge/ConciergeRequestForm.tsx', 'src/app/concierge/ConciergeScreener.tsx']) {
      expect({ file: f, dollarPrice: /\$\s?\d/.test(read(f)) }).toEqual({ file: f, dollarPrice: false });
    }
    expect(/\$399/.test(read('src/lib/concierge/offer.ts'))).toBe(true);
  });
});
