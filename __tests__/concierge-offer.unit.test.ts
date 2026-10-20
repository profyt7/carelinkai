/**
 * Family Concierge paid offer (sprint W5-3, G1): lane → offer routing, CTA mode
 * (flag / cap / waitlist), capacity math, dashboard card choice + 30-day dismiss,
 * and the authoritative offer copy.
 */

import {
  CONCIERGE_OFFER,
  DEFAULT_MONTHLY_CAP,
  conciergeRouteForLane,
  conciergeCtaMode,
  ctaLabelFor,
  isCapReached,
  isCheckoutEnabled,
  monthlyCap,
  monthStart,
  upsellCardForLane,
  isDismissed,
  mayBuyConcierge,
} from '@/lib/concierge/offer';
import { routeForPayerSource } from '@/lib/concierge/screener';
import { PAYER_SOURCE_VALUES } from '@/lib/payer/payer-source';

describe('lane → offer routing', () => {
  it('private funds and LTC insurance see the paid offer first', () => {
    for (const v of ['PRIVATE_FUNDS', 'LTC_INSURANCE'] as const) {
      expect(conciergeRouteForLane(v)).toBe('offer');
      expect(routeForPayerSource(v)).toBe('private_pay');
      expect(upsellCardForLane(v)).toBe('paid');
      expect(mayBuyConcierge(v)).toBe(true);
    }
  });
  it('"not sure" / unanswered see BOTH: free help first, the offer as a secondary option (never led with a price)', () => {
    expect(conciergeRouteForLane('NOT_SURE')).toBe('both');
    expect(routeForPayerSource('NOT_SURE')).toBe('both');
    expect(upsellCardForLane('NOT_SURE')).toBe('both');
    expect(mayBuyConcierge('NOT_SURE')).toBe(true); // may still request / book, as the secondary option
    // Unanswered on the dashboard = unknown lane → the same free-first card.
    expect(upsellCardForLane(null)).toBe('both');
    expect(upsellCardForLane(undefined)).toBe('both');
    expect(CONCIERGE_OFFER.notSureLine).toBe('If Medicaid may be involved, our help is free.');
  });
  it('Medicaid / Medicare / VA get the free path, never the offer or the paid card', () => {
    for (const v of ['MEDICAID_WAIVER', 'MEDICARE_ADVANTAGE', 'VA_BENEFITS'] as const) {
      expect(conciergeRouteForLane(v)).toBe('free');
      expect(routeForPayerSource(v)).toBe('free_help');
      expect(upsellCardForLane(v)).toBe('free');
      expect(mayBuyConcierge(v)).toBe(false);
    }
  });
  it('covers every PayerSource value', () => {
    for (const v of PAYER_SOURCE_VALUES) expect(['offer', 'free', 'both']).toContain(conciergeRouteForLane(v));
  });
});

describe('CTA mode: flag + capacity', () => {
  it('flag unset → "Request the concierge"; set → "Book the concierge — $399"', () => {
    expect(conciergeCtaMode({ checkoutEnabled: false, capReached: false })).toBe('request');
    expect(conciergeCtaMode({ checkoutEnabled: true, capReached: false })).toBe('checkout');
    expect(ctaLabelFor('request')).toBe('Request the concierge');
    expect(ctaLabelFor('checkout')).toBe('Book the concierge — $399');
  });
  it('cap reached → waitlist regardless of the flag', () => {
    expect(conciergeCtaMode({ checkoutEnabled: true, capReached: true })).toBe('waitlist');
    expect(conciergeCtaMode({ checkoutEnabled: false, capReached: true })).toBe('waitlist');
    expect(ctaLabelFor('waitlist')).toBe('Fully booked this month — join the waitlist');
  });
  it('reads the env flags; cap defaults to 4', () => {
    expect(isCheckoutEnabled({})).toBe(false);
    expect(isCheckoutEnabled({ CONCIERGE_CHECKOUT_ENABLED: '0' })).toBe(false);
    expect(isCheckoutEnabled({ CONCIERGE_CHECKOUT_ENABLED: '1' })).toBe(true);
    expect(isCheckoutEnabled({ CONCIERGE_CHECKOUT_ENABLED: 'true' })).toBe(true);
    expect(monthlyCap({})).toBe(DEFAULT_MONTHLY_CAP);
    expect(DEFAULT_MONTHLY_CAP).toBe(4);
    expect(monthlyCap({ CONCIERGE_MONTHLY_CAP: '2' })).toBe(2);
    expect(monthlyCap({ CONCIERGE_MONTHLY_CAP: 'x' })).toBe(4);
    expect(isCapReached(3, 4)).toBe(false);
    expect(isCapReached(4, 4)).toBe(true);
    expect(isCapReached(0, 0)).toBe(true);
  });
  it('capacity window is the current UTC month', () => {
    expect(monthStart(new Date('2026-10-17T23:59:00Z')).toISOString()).toBe('2026-10-01T00:00:00.000Z');
  });
});

describe('dashboard dismiss (30 days)', () => {
  const now = new Date('2026-10-17T12:00:00Z');
  it('hides for 30 days, then returns', () => {
    expect(isDismissed(null, now)).toBe(false);
    expect(isDismissed(new Date('2026-10-01T00:00:00Z'), now)).toBe(true);
    expect(isDismissed(new Date('2026-09-17T12:01:00Z'), now)).toBe(true); // 30 days minus a minute
    expect(isDismissed(new Date('2026-09-17T12:00:00Z'), now)).toBe(false); // exactly 30 days
    expect(isDismissed('garbage', now)).toBe(false);
  });
});

describe('offer copy (authoritative)', () => {
  it('is $399 flat, one-time, with the seven inclusions, guarantee and exclusions', () => {
    expect(CONCIERGE_OFFER.priceCents).toBe(39900);
    expect(CONCIERGE_OFFER.priceDisplay).toBe('$399');
    expect(CONCIERGE_OFFER.inclusions).toHaveLength(7);
    expect(CONCIERGE_OFFER.inclusions.join(' ')).toMatch(/20-minute intake call/);
    expect(CONCIERGE_OFFER.inclusions.join(' ')).toMatch(/3–5 homes within 2 business days/);
    expect(CONCIERGE_OFFER.inclusions.join(' ')).toMatch(/up to 5 tours/);
    expect(CONCIERGE_OFFER.inclusions.join(' ')).toMatch(/30, 60 and 90 days/);
    expect(CONCIERGE_OFFER.inclusions.join(' ')).toMatch(/re-search within 90 days/);
    expect(CONCIERGE_OFFER.guarantee).toBe('No verified shortlist within 2 business days → full refund.');
    expect(CONCIERGE_OFFER.notIncluded).toEqual(['Medical, legal or financial advice', 'Medicaid application filing', 'In-person tour attendance']);
    expect(CONCIERGE_OFFER.honestyLine).toBe(
      'Homes never pay to be listed, ranked or recommended. If a home ever pays CareLinkAI a fee when a resident moves in, we tell you before you tour — it never changes your price or which homes we show you.',
    );
    expect(CONCIERGE_OFFER.freeLaneLine).toBe('Paying with Medicaid, Medicare or the VA? Our help is always free.');
  });
});
