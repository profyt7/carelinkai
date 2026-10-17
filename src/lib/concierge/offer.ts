/**
 * Family Concierge — the PAID offer (sprint W5-3, G1). Authoritative for code.
 *
 * $399 flat, one-time, per family search. Private-pay lane only: families
 * paying privately, through long-term-care insurance, or who are not sure yet
 * see the offer; Medicaid / Medicare / VA families get the free path and never
 * see a price. Pure module — no Prisma, no Stripe; the request / checkout APIs
 * and the UI read from here so copy and numbers never drift.
 */

import { deriveFeeLane, type PayerSource } from '@/lib/payer/payer-source';

export const CONCIERGE_OFFER = {
  priceCents: 39900,
  priceDisplay: '$399',
  priceLine: '$399 flat, one-time, per family search',
  bookLabel: 'Book the concierge — $399',
  requestLabel: 'Request the concierge',
  waitlistLabel: 'Fully booked this month — join the waitlist',
  inclusions: [
    'A 20-minute intake call',
    'A verified shortlist of 3–5 homes within 2 business days — availability and current price confirmed with each home, ODH inspection history in plain English',
    'Tour scheduling for up to 5 tours, plus a tour checklist',
    'A written side-by-side cost comparison: base rent, care level, community fee, last increases',
    'A before-you-sign checklist',
    'Check-ins at 30, 60 and 90 days after move-in',
    'A free re-search within 90 days',
  ],
  guarantee: 'No verified shortlist within 2 business days → full refund.',
  notIncluded: ['Medical, legal or financial advice', 'Medicaid application filing', 'In-person tour attendance'],
  capacityNote: 'Capacity-limited — a small number of family searches each month so every one gets a person.',
  /** Copy-honesty bullet (replaces "homes never pay us to be recommended"). */
  honestyLine:
    'Homes never pay to be listed, ranked or recommended. If a home ever pays CareLinkAI a fee when a resident moves in, we tell you before you tour — it never changes your price or which homes we show you.',
  freeLaneLine: 'Paying with Medicaid, Medicare or the VA? Our help is always free.',
} as const;

export const CONCIERGE_CHECKOUT_API = '/api/concierge/checkout';
export const CONCIERGE_OFFER_API = '/api/concierge/offer';
export const CONCIERGE_THANKS_PATH = '/concierge/thanks';
export const DEFAULT_MONTHLY_CAP = 4;

/** Which help a payer answer gets: the paid offer or the free path. */
export type ConciergeLaneRoute = 'offer' | 'free';

export function conciergeRouteForLane(payerSource: PayerSource | null | undefined): ConciergeLaneRoute {
  // Medicaid / Medicare / VA → free, always. Private funds, LTC insurance and
  // "not sure" (lane UNKNOWN) → the paid offer (the family pays, never the home).
  return deriveFeeLane(payerSource) === 'FREE_LANE' ? 'free' : 'offer';
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

/** Family dashboard card choice from the family's last payer-lane answer. */
export type UpsellCard = 'paid' | 'free';
export function upsellCardForLane(lastPayerSource: PayerSource | null | undefined): UpsellCard {
  return conciergeRouteForLane(lastPayerSource) === 'free' ? 'free' : 'paid';
}

export const UPSELL_DISMISS_DAYS = 30;
export function isDismissed(dismissedAt: Date | string | null | undefined, now: Date = new Date()): boolean {
  if (!dismissedAt) return false;
  const t = new Date(dismissedAt).getTime();
  if (Number.isNaN(t)) return false;
  return now.getTime() - t < UPSELL_DISMISS_DAYS * 86_400_000;
}
