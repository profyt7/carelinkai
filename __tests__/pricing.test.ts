/**
 * Pricing capture (OL-111) — pure logic: signed quote-survey token, freshness window,
 * best-price selection, int normalization, and the honest source-labeled view (never
 * presents a number as an official/guaranteed quote; FAMILY_AVG only past the threshold).
 */
import { signQuoteToken, verifyQuoteToken } from '@/lib/pricing/quote-token';
import {
  normalizePriceInt,
  bestPriceMonthly,
  isPricingFresh,
  pricingView,
  PRICING_FRESH_DAYS,
  MAX_PRICE,
} from '@/lib/pricing/pricing';

const SECRET = 'test-secret-pricing';
const DAY = 86_400_000;

describe('quote-survey magic-link token', () => {
  it('round-trips with the same secret and carries the homeId + type', () => {
    const t = signQuoteToken('home_123', SECRET);
    const p = verifyQuoteToken(t, SECRET);
    expect(p?.homeId).toBe('home_123');
    expect(p?.type).toBe('quote');
  });
  it('carries an optional inquiryId when provided', () => {
    const t = signQuoteToken('home_123', SECRET, { inquiryId: 'inq_9' });
    expect(verifyQuoteToken(t, SECRET)?.inquiryId).toBe('inq_9');
  });
  it('rejects a wrong secret and a tampered/garbage token', () => {
    const t = signQuoteToken('home_123', SECRET);
    expect(verifyQuoteToken(t, 'other-secret')).toBeNull();
    expect(verifyQuoteToken(t + 'x', SECRET)).toBeNull();
    expect(verifyQuoteToken('garbage', SECRET)).toBeNull();
  });
  it('rejects an expired token', () => {
    const t = signQuoteToken('home_123', SECRET, { ttlDays: -1 }); // already expired
    expect(verifyQuoteToken(t, SECRET)).toBeNull();
  });
});

describe('normalizePriceInt', () => {
  it('parses, strips non-digits, clamps, and rejects', () => {
    expect(normalizePriceInt('4500')).toBe(4500);
    expect(normalizePriceInt('$4,500')).toBe(4500);
    expect(normalizePriceInt(4500.7)).toBe(4500);
    expect(normalizePriceInt(1_000_000)).toBe(MAX_PRICE);
    expect(normalizePriceInt(0)).toBeNull();
    expect(normalizePriceInt(-5)).toBeNull();
    expect(normalizePriceInt('abc')).toBeNull();
    expect(normalizePriceInt('')).toBeNull();
    expect(normalizePriceInt(null)).toBeNull();
  });
});

describe('bestPriceMonthly — budget-filter input', () => {
  it('prefers starting price, then range low, then legacy priceMin', () => {
    expect(bestPriceMonthly({ startingPriceMonthly: 5000, priceRangeLow: 4000, priceMin: 3000 })).toBe(5000);
    expect(bestPriceMonthly({ startingPriceMonthly: null, priceRangeLow: 4000, priceMin: 3000 })).toBe(4000);
    expect(bestPriceMonthly({ startingPriceMonthly: null, priceRangeLow: null, priceMin: 3000 })).toBe(3000);
    expect(bestPriceMonthly({})).toBeNull();
  });
});

describe('isPricingFresh', () => {
  const now = Date.now();
  it('is fresh within the window, stale outside it', () => {
    expect(isPricingFresh(new Date(now - 2 * DAY), now)).toBe(true);
    expect(isPricingFresh(new Date(now - (PRICING_FRESH_DAYS + 1) * DAY), now)).toBe(false);
    expect(isPricingFresh(null, now)).toBe(false);
    expect(isPricingFresh(undefined, now)).toBe(false);
  });
});

describe('pricingView — honest, source-labeled, never a guaranteed quote', () => {
  const now = Date.now();

  it('operator starting price + fresh → Transparent Pricing badge, operator-provided label', () => {
    const v = pricingView(
      { startingPriceMonthly: 5500, priceSource: 'OPERATOR', priceUpdatedAt: new Date(now - DAY) },
      undefined,
      now,
    );
    expect(v.hasPrice).toBe(true);
    expect(v.amount).toBe(5500);
    expect(v.source).toBe('OPERATOR');
    expect(v.sourceLabel).toBe('operator-provided');
    expect(v.transparent).toBe(true);
    expect(v.display).toContain('$5,500');
  });

  it('operator starting price but STALE → no Transparent badge', () => {
    const v = pricingView(
      { startingPriceMonthly: 5500, priceSource: 'OPERATOR', priceUpdatedAt: new Date(now - (PRICING_FRESH_DAYS + 5) * DAY) },
      undefined,
      now,
    );
    expect(v.hasPrice).toBe(true);
    expect(v.transparent).toBe(false);
  });

  it('DP estimate range → "estimated" label, not transparent, range display', () => {
    const v = pricingView(
      { priceRangeLow: 4000, priceRangeHigh: 6000, priceSource: 'DP_ESTIMATE', priceUpdatedAt: new Date(now - DAY) },
      undefined,
      now,
    );
    expect(v.hasPrice).toBe(true);
    expect(v.source).toBe('DP_ESTIMATE');
    expect(v.sourceLabel).toBe('estimated');
    expect(v.transparent).toBe(false);
    expect(v.display).toContain('$4,000');
    expect(v.display).toContain('$6,000');
  });

  it('FAMILY_AVG surfaces ONLY at/above the report threshold (default 3)', () => {
    const home = { startingPriceMonthly: 5500, priceSource: 'OPERATOR' as const, priceUpdatedAt: new Date(now - DAY) };
    // Below threshold → falls back to the operator starting price.
    const below = pricingView(home, { avg: 4800, count: 2 }, now);
    expect(below.source).toBe('OPERATOR');
    expect(below.amount).toBe(5500);
    // At threshold → family-reported average wins.
    const at = pricingView(home, { avg: 4800, count: 3 }, now);
    expect(at.source).toBe('FAMILY_AVG');
    expect(at.amount).toBe(4800);
    expect(at.sourceLabel).toBe('families report');
    expect(at.display).toContain('avg of 3');
  });

  it('no price of any kind → contact for pricing, not transparent', () => {
    const v = pricingView({}, undefined, now);
    expect(v.hasPrice).toBe(false);
    expect(v.amount).toBeNull();
    expect(v.transparent).toBe(false);
    expect(v.display.toLowerCase()).toContain('contact');
  });
});
