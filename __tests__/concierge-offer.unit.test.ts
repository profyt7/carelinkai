/**
 * Family Concierge paid offer (sprint W5-3, G1): lane → offer routing, CTA mode
 * (flag / cap / waitlist), capacity math, dashboard card choice + 30-day dismiss,
 * and the authoritative offer copy.
 */

import {
  CONCIERGE_FIVE_MISTAKES,
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
    expect(ctaLabelFor('request')).toBe('Request your shortlist');
    expect(ctaLabelFor('checkout')).toBe('Book the concierge — $399');
  });
  it('cap reached → waitlist regardless of the flag', () => {
    expect(conciergeCtaMode({ checkoutEnabled: true, capReached: true })).toBe('waitlist');
    expect(conciergeCtaMode({ checkoutEnabled: false, capReached: true })).toBe('waitlist');
    expect(ctaLabelFor('waitlist')).toBe('Fully booked this month — join the waitlist');
  });
  it('reads the env flags; cap defaults to 4; the flag alone never enables checkout (OL-162 preflight)', () => {
    const ready = { STRIPE_SECRET_KEY: 'sk_test_abc', STRIPE_PRICE_FAMILY_CONCIERGE: 'price_123', STRIPE_WEBHOOK_SECRET: 'whsec_abc', ADMIN_NOTIFY_EMAIL: 'chris@getcarelinkai.com' };
    expect(isCheckoutEnabled({})).toBe(false);
    expect(isCheckoutEnabled({ CONCIERGE_CHECKOUT_ENABLED: '0', ...ready })).toBe(false);
    expect(isCheckoutEnabled({ CONCIERGE_CHECKOUT_ENABLED: '1' })).toBe(false); // flag without the prerequisites
    expect(isCheckoutEnabled({ CONCIERGE_CHECKOUT_ENABLED: '1', ...ready })).toBe(true);
    expect(isCheckoutEnabled({ CONCIERGE_CHECKOUT_ENABLED: 'true', ...ready })).toBe(true);
    expect(isCheckoutEnabled({ CONCIERGE_CHECKOUT_ENABLED: '1', ...ready, NODE_ENV: 'production' })).toBe(false); // test key in production
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

describe('offer copy (authoritative, v2 — OL-165)', () => {
  it('is $399, pay when ready, with the nine inclusions, the terms word for word and the verbatim not-included list', () => {
    expect(CONCIERGE_OFFER.priceCents).toBe(39900);
    expect(CONCIERGE_OFFER.priceDisplay).toBe('$399');
    expect(CONCIERGE_OFFER.headline).toBe('Get a verified shortlist before you commit to a home.');
    expect(CONCIERGE_OFFER.subhead).toBe('We do the research first. You pay only when your shortlist is ready.');
    // Pay when ready (10/31): the terms, word for word.
    expect(CONCIERGE_OFFER.terms).toBe("Personalized shortlist of care options, with availability and pricing labeled as verified or unconfirmed. $399. We do the research first. When your shortlist is ready, we'll send you a secure payment link, and you'll get the full shortlist as soon as it's paid. If we can't put together a useful shortlist, you pay nothing. You're paying for the research and shortlist, not a guaranteed opening or placement.");
    // No turnaround promise and no unsourced dollar figure anywhere in the offer.
    expect(JSON.stringify(CONCIERGE_OFFER)).not.toMatch(/business day|\$5,000|full refund|(shortlist|call|intake)[^.]{0,40}within \d|\bin \d+ (hours?|days?)/i);
    expect(CONCIERGE_OFFER.freeForFamiliesLine).toMatch(/^Free for families\./);
    const incl = CONCIERGE_OFFER.inclusions;
    expect(incl).toHaveLength(9);
    expect(incl[0]).toMatch(/^A 20-minute intake call:/);
    expect(incl[1]).toMatch(/availability and pricing labeled as verified or unconfirmed/);
    expect(incl[2]).toMatch(/fit check against each home’s acceptance criteria/);
    expect(incl[2]).toMatch(/two-person assist.*secured unit.*oxygen.*insulin.*bariatric.*behavioral.*hospice/);
    expect(incl[3]).toMatch(/Medicaid runway plan/);
    expect(incl[3]).toMatch(/Ohio Assisted Living Waiver/);
    expect(incl[4]).toMatch(/Real prices in writing/);
    expect(incl[4]).toMatch(/community-fee waiver or reduction.*move-in concession.*12-month rate lock.*care-level assessment/);
    expect(incl[5]).toMatch(/up to 5 tours/);
    expect(incl[6]).toMatch(/contract red-flag review in plain English/);
    expect(incl[7]).toMatch(/Discharge coordination/);
    expect(incl[8]).toMatch(/before-you-sign checklist/);
    expect(incl[8]).toMatch(/30, 60 and 90 days/);
    expect(incl[8]).toMatch(/free re-search within 90 days/);
    expect(CONCIERGE_OFFER.guarantee).toBe("If we can't put together a useful shortlist, you pay nothing.");
    expect(CONCIERGE_OFFER.notAPlacementLine).toBe("You're paying for the research and shortlist, not a guaranteed opening or placement.");
    // Verbatim from Family_Concierge_Offer_2026_10_16.md (v2).
    expect(CONCIERGE_OFFER.notIncluded).toEqual([
      'medical, legal or financial advice',
      'Medicaid application filing (we point to the Western Reserve AAA)',
      'attending tours in person',
      'negotiating on the family’s behalf (we prepare them; they ask)',
    ]);
    expect(CONCIERGE_OFFER.honestyLine).toBe(
      'Homes never pay to be listed, ranked or recommended. The concierge is paid by you — flat, one time — never by a home.',
    );
    expect(CONCIERGE_OFFER.noOutcomeLine).toMatch(/never promise savings, a particular outcome/);
    expect(CONCIERGE_OFFER.freeLaneLine).toBe('Paying with Medicaid, Medicare or the VA? Our help is always free.');
    expect(CONCIERGE_FIVE_MISTAKES).toHaveLength(5);
    expect(CONCIERGE_FIVE_MISTAKES.map((m) => m.mistake)).toEqual([
      'The wrong-fit move.',
      'Running out of money in a home that won’t keep you.',
      'Signing without the real price.',
      'Missing the fine print.',
      'Losing the discharge window.',
    ]);
  });

  it('copy rules (OL-165 e): no "AI", no "legwork", no promised savings / outcomes / negotiation results, no facility fee', () => {
    const all = JSON.stringify({ CONCIERGE_OFFER, CONCIERGE_FIVE_MISTAKES });
    expect(all).not.toMatch(/\bAI\b/);
    expect(all).not.toMatch(/legwork/i);
    expect(all).not.toMatch(/\b(we|we’ll|we will|you’ll|you will) (save|negotiate|get you|lower)/i);
    expect(all).not.toMatch(/guaranteed? (savings|rate|price|outcome)/i);
    expect(all).not.toMatch(/pays CareLinkAI a fee|move-in fee|referral fee|placement fee/i);
    // The free lane never sees a price: no dollar amount in any free-lane / shared line.
    expect(CONCIERGE_OFFER.freeLaneHeadline).toBe('Free help for Medicaid, Medicare and VA families');
    for (const k of ['freeLaneLine', 'freeLaneHeadline', 'freeLaneSubhead', 'notSureLine', 'freeForFamiliesLine', 'oneLine', 'noOutcomeLine', 'honestyLine'] as const) {
      expect({ k, v: CONCIERGE_OFFER[k] }).toEqual({ k, v: expect.not.stringMatching(/\$\s?\d/) });
    }
  });
});
