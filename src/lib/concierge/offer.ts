/**
 * Family Concierge — the PAID offer (sprint W5-3, G1). Authoritative for code.
 *
 * $399 flat, one-time, per family search. Private-pay lane only: families
 * paying privately or through long-term-care insurance see the offer first;
 * families who are NOT SURE yet see the free help first (directory, waiver
 * filter, guides — "if Medicaid may be involved, our help is free") with the
 * concierge as a secondary option; Medicaid / Medicare / VA families get the
 * free path only and never see a price. Pure module — no Prisma, no Stripe;
 * the request / checkout APIs and the UI read from here so copy and numbers
 * never drift.
 */

import { deriveFeeLane, type PayerSource } from '@/lib/payer/payer-source';

export const CONCIERGE_OFFER = {
  priceCents: 39900,
  priceDisplay: '$399',
  priceLine: '$399 flat, one-time, per family search',
  bookLabel: 'Book the concierge — $399',
  requestLabel: 'Request the concierge',
  waitlistLabel: 'Fully booked this month — join the waitlist',
  /**
   * v2 (OL-165, 10/20): the pitch is the expensive mistake a rushed discharge
   * causes — never the time saved, never the technology. The $5,000 here is the
   * cost of that mistake (a second community fee + a second move), not a price.
   */
  headline: 'We keep you from making the $5,000 mistake under pressure.',
  subhead: 'A verified shortlist in 2 business days — or you pay nothing.',
  /** Above the fold on /concierge: families never pay to search. */
  freeForFamiliesLine:
    'Free for families. Searching CareLinkAI — verified homes, prices, Medicaid waiver status, inspection history — never costs a family anything. The concierge is an optional, private-pay lane.',
  /** One-liner for the homepage section and the dashboard card. */
  oneLine: 'A Cleveland person checks fit, prices and the contract with you before you sign — paid by you, flat, never by a home.',
  /** v2 items 1–9, plain language (Family_Concierge_Offer_2026_10_16.md v2). */
  inclusions: [
    'A 20-minute intake call within 1 business day: care needs, location, timeline, budget and how long it lasts, who in the family decides, and your hospital or discharge contact',
    'A verified shortlist of 3–5 homes within 2 business days — availability and current price confirmed with each home, ODH inspection history in plain English',
    'A fit check against each home’s acceptance criteria — two-person assist, wandering or a secured unit, oxygen, insulin, bariatric, behavioral, hospice in place — before it goes on your list, so a mismatch doesn’t force a second move',
    'A Medicaid runway plan: how many months private pay lasts at each home’s price, and when that runway is short, a shortlist that favors homes keeping current residents on the Ohio Assisted Living Waiver',
    'Real prices in writing — base rent, care-level tiers, community fee, recent increases — plus, for each home, what to ask for before signing: a community-fee waiver or reduction, a move-in concession, a 12-month rate lock, a care-level assessment done before the contract',
    'Tour scheduling for up to 5 tours, plus a what-to-look-for checklist',
    'A contract red-flag review in plain English: annual-increase clauses, care-level add-on pricing, notice and termination terms, deposit refundability, what triggers a level-of-care change',
    'Discharge coordination: one thread with the hospital social worker or discharge planner so the move-in date, paperwork and transport line up',
    'A before-you-sign checklist, check-ins at 30, 60 and 90 days after move-in, and a free re-search within 90 days if the home isn’t working out',
  ],
  guarantee: 'No verified shortlist within 2 business days → full refund.',
  /** Verbatim from the v2 offer doc. */
  notIncluded: [
    'medical, legal or financial advice',
    'Medicaid application filing (we point to the Western Reserve AAA)',
    'attending tours in person',
    'negotiating on the family’s behalf (we prepare them; they ask)',
  ],
  capacityNote: 'Capacity-limited — a small number of family searches each month so every one gets a person.',
  /** Copy-honesty bullet (replaces "homes never pay us to be recommended"); never mentions a facility fee (OL-165 e). */
  honestyLine: 'Homes never pay to be listed, ranked or recommended. The concierge is paid by you — flat, one time — never by a home.',
  /** Copy rule: describe what we check and what we tell the family to ask; promise nothing. */
  noOutcomeLine:
    'We tell you what we checked and what to ask for. We never promise savings, a particular outcome, or that a home will agree to a request.',
  freeLaneLine: 'Paying with Medicaid, Medicare or the VA? Our help is always free.',
  /** Leads the "not sure yet" lane: free help first, the concierge second. */
  notSureLine: 'If Medicaid may be involved, our help is free.',
  /** Header of the secondary offer shown under the free help for "not sure yet". */
  secondaryLead: 'If you end up paying privately: the optional Family Concierge — a person who checks fit, prices and the contract with you before you sign.',
} as const;

/**
 * The five mistakes a 48-hour discharge window causes, and the v2 deliverable
 * that addresses each. Rendered on /concierge in place of the old "how it
 * works" steps. Describes what we check — never a promised outcome.
 */
export const CONCIERGE_FIVE_MISTAKES = [
  {
    mistake: 'The wrong-fit move.',
    cost: 'A home that can’t handle two-person assist, wandering, oxygen or insulin asks the family to leave within 30–90 days: a second community fee and a second move for your parent.',
    answer: 'Every shortlisted home is checked against its own acceptance criteria — all seven acuity items — before it goes on your list.',
  },
  {
    mistake: 'Running out of money in a home that won’t keep you.',
    cost: 'Private pay runs out and the home doesn’t take the Medicaid waiver for current residents, so the family is forced out at the worst time.',
    answer: 'A Medicaid runway estimate for each home, and when the runway is short, a shortlist that favors homes keeping current residents on the Ohio Assisted Living Waiver.',
  },
  {
    mistake: 'Signing without the real price.',
    cost: 'The number on the tour isn’t the number on the invoice: care-level tiers, the community fee and the next increase arrive after move-in.',
    answer: 'Prices in writing, side by side, plus what to ask for before signing — a community-fee waiver or reduction, a move-in concession, a 12-month rate lock, a care-level assessment before the contract. We tell you what to ask; the answer is the home’s.',
  },
  {
    mistake: 'Missing the fine print.',
    cost: 'Annual-increase clauses, add-on pricing, notice and termination terms, deposit refundability and what triggers a level-of-care change are easy to miss at 11pm.',
    answer: 'A red-flag review in plain English, flagged for you to raise with the community or an attorney. Not legal advice.',
  },
  {
    mistake: 'Losing the discharge window.',
    cost: 'The move-in date, the paperwork and the transport don’t line up, and the hospital’s clock is running.',
    answer: 'One thread with the hospital social worker or discharge planner, with CareLinkAI as the family’s single point of contact.',
  },
] as const;

export const CONCIERGE_CHECKOUT_API = '/api/concierge/checkout';
export const CONCIERGE_OFFER_API = '/api/concierge/offer';
export const CONCIERGE_THANKS_PATH = '/concierge/thanks';
export const DEFAULT_MONTHLY_CAP = 4;

/**
 * Which help a payer answer gets: the paid offer, the free path, or both
 * (free help first, the offer as a secondary option).
 */
export type ConciergeLaneRoute = 'offer' | 'free' | 'both';

export function conciergeRouteForLane(payerSource: PayerSource | null | undefined): ConciergeLaneRoute {
  // Medicaid / Medicare / VA → free, always. Private funds / LTC insurance →
  // the paid offer (the family pays, never the home). "Not sure" / unanswered
  // (lane UNKNOWN) → free help FIRST, then the offer: a possibly-Medicaid
  // family is never led with a price.
  const lane = deriveFeeLane(payerSource);
  if (lane === 'FREE_LANE') return 'free';
  return lane === 'FEE_ELIGIBLE' ? 'offer' : 'both';
}

/** May this payer answer buy / request the concierge at all? (Free lane never can.) */
export function mayBuyConcierge(payerSource: PayerSource | null | undefined): boolean {
  return conciergeRouteForLane(payerSource) !== 'free';
}

export type ConciergeCtaMode = 'checkout' | 'request' | 'waitlist';

export function isCheckoutEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const v = (env['CONCIERGE_CHECKOUT_ENABLED'] ?? '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

export function monthlyCap(env: NodeJS.ProcessEnv = process.env): number {
  const n = Number.parseInt(env['CONCIERGE_MONTHLY_CAP'] ?? '', 10);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_MONTHLY_CAP;
}

export function isCapReached(committedThisMonth: number, cap: number): boolean {
  return committedThisMonth >= cap;
}

/** The CTA the offer card renders. Waitlist wins over everything once the cap is hit. */
export function conciergeCtaMode(args: { checkoutEnabled: boolean; capReached: boolean }): ConciergeCtaMode {
  if (args.capReached) return 'waitlist';
  return args.checkoutEnabled ? 'checkout' : 'request';
}

export function ctaLabelFor(mode: ConciergeCtaMode): string {
  switch (mode) {
    case 'checkout':
      return CONCIERGE_OFFER.bookLabel;
    case 'waitlist':
      return CONCIERGE_OFFER.waitlistLabel;
    default:
      return CONCIERGE_OFFER.requestLabel;
  }
}

/** First day of the current month (UTC) — the capacity window. */
export function monthStart(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** Order statuses that consume a monthly slot. */
export const COMMITTED_ORDER_STATUSES = ['PAID', 'REQUESTED_UNPAID'] as const;
/** Order statuses that mean "this family already has the concierge" (no upsell). */
export const ACTIVE_ORDER_STATUSES = ['PAID', 'REQUESTED_UNPAID'] as const;

/**
 * Family dashboard card choice from the family's last payer-lane answer:
 * 'paid' (private / LTC), 'free' (Medicaid / Medicare / VA), or 'both' (not
 * sure / unanswered → the free-help card with the concierge as a secondary
 * line; dismissible like the paid card).
 */
export type UpsellCard = 'paid' | 'free' | 'both';
export function upsellCardForLane(lastPayerSource: PayerSource | null | undefined): UpsellCard {
  const r = conciergeRouteForLane(lastPayerSource);
  return r === 'offer' ? 'paid' : r;
}

export const UPSELL_DISMISS_DAYS = 30;
export function isDismissed(dismissedAt: Date | string | null | undefined, now: Date = new Date()): boolean {
  if (!dismissedAt) return false;
  const t = new Date(dismissedAt).getTime();
  if (Number.isNaN(t)) return false;
  return now.getTime() - t < UPSELL_DISMISS_DAYS * 86_400_000;
}
