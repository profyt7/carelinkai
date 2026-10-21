/**
 * Sprint W3 item 5 + W4 0a + W5-3 — /concierge screener routing + guards:
 *  - private funds / LTC insurance → private_pay (the paid, family-paid offer);
 *    not sure → both (free help first, the offer as a secondary option);
 *    Medicaid / Medicare / VA / unanswered → free_help (fail-closed);
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
  it('private pay and LTC insurance see the offer (the family pays)', () => {
    expect(routeForPayerSource('PRIVATE_FUNDS')).toBe('private_pay');
    expect(routeForPayerSource('LTC_INSURANCE')).toBe('private_pay');
  });

  it('"not sure" sees both — free help first, the offer second (never led with a price)', () => {
    expect(routeForPayerSource('NOT_SURE')).toBe('both');
  });

  it('federal-program payers get free help (never the offer / price); unanswered fails closed', () => {
    for (const v of ['MEDICAID_WAIVER', 'MEDICARE_ADVANTAGE', 'VA_BENEFITS'] as const) {
      expect(routeForPayerSource(v)).toBe('free_help');
    }
    expect(routeForPayerSource(null)).toBe('free_help');
    expect(routeForPayerSource(undefined)).toBe('free_help');
  });

  it('covers every PayerSource value', () => {
    for (const v of PAYER_SOURCE_VALUES) expect(['private_pay', 'free_help', 'both']).toContain(routeForPayerSource(v));
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

  it('the server page and the components carry no literal dollar amount; only offer.ts does', () => {
    for (const f of ['src/app/concierge/page.tsx', 'src/app/concierge/ConciergeRequestForm.tsx', 'src/app/concierge/ConciergeScreener.tsx']) {
      expect({ file: f, dollarPrice: /\$\s?\d/.test(read(f)) }).toEqual({ file: f, dollarPrice: false });
    }
    expect(/\$399/.test(read('src/lib/concierge/offer.ts'))).toBe(true);
  });

  it('OL-165 copy rules on every concierge surface: no "legwork", no "AI" pitch, no facility fee', () => {
    for (const f of [
      'src/app/concierge/page.tsx',
      'src/app/concierge/ConciergeScreener.tsx',
      'src/app/concierge/ConciergeRequestForm.tsx',
      'src/components/dashboard/ConciergeUpsellCard.tsx',
      'src/lib/concierge/offer.ts',
    ]) {
      const src = read(f);
      expect({ file: f, legwork: /legwork/i.test(src), ai: /\bAI\b/.test(src), facilityFee: /pays CareLinkAI a fee|move-in fee|referral fee/i.test(src) }).toEqual({
        file: f,
        legwork: false,
        ai: false,
        facilityFee: false,
      });
    }
    // The homepage concierge section and the terms section (the files also carry unrelated copy).
    const home = read('src/app/HomePageClient.tsx');
    const section = home.slice(home.indexOf('data-testid="home-concierge-section"'), home.indexOf('VALUE PROPOSITION SECTION'));
    expect(section).not.toMatch(/legwork|\bAI\b|\$\s?\d/);
    const terms = read('src/app/terms/page.tsx');
    const tsec = terms.slice(terms.indexOf('data-testid="terms-family-concierge"'), terms.indexOf('Contact Us'));
    expect(tsec).toMatch(/not medical, legal or financial advice/);
    expect(tsec).toMatch(/do not promise savings, a particular outcome/);
    // OL-166a: the Terms keep the move-in-fee DISCLOSURE sentence (Terms only — never /concierge, homepage or dashboard).
    expect(tsec).toMatch(/If a home ever pays CareLinkAI a fee when a resident moves in, we tell you before you tour; it never changes your price or which homes we show you\./);
    expect(tsec).not.toMatch(/legwork|\bAI\b/);
  });
});
