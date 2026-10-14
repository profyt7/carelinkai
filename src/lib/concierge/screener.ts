/**
 * /concierge payer-source screener routing (sprint W3 item 5 / sprint 3.1).
 *
 * The family concierge is a PRIVATE-PAY-ONLY offer. The screener sits in front
 * of it and routes by the same Anti-Kickback firewall mapping the inquiry
 * form uses (src/lib/payer/payer-source.ts → deriveFeeLane):
 *
 *   FEE_ELIGIBLE (private funds, LTC insurance) → 'private_pay' — may see the
 *                                                  offer (and, once Chris adds
 *                                                  it, the price)
 *   FREE_LANE    (Medicaid/waiver, Medicare/MA, VA) → 'free_help' — routed to
 *                                                  the free directory + guides;
 *                                                  NEVER sees the offer/price
 *   UNKNOWN      (not sure / unanswered)         → 'free_help' — fail-closed:
 *                                                  nobody sees a price until
 *                                                  they have said private pay
 *
 * Pure; no pricing lives here (no Stripe product or price exists yet).
 */

import { deriveFeeLane, type PayerSource } from '@/lib/payer/payer-source';

export type ConciergeRoute = 'private_pay' | 'free_help';

export function routeForPayerSource(payerSource: PayerSource | null | undefined): ConciergeRoute {
  return deriveFeeLane(payerSource) === 'FEE_ELIGIBLE' ? 'private_pay' : 'free_help';
}

/** Where the placeholder CTA sends a private-pay family: the existing intake. */
export const CONCIERGE_REQUEST_PATH = '/get-started';

export function conciergeRequestHref(payerSource: PayerSource): string {
  return `${CONCIERGE_REQUEST_PATH}?from=concierge&payerSource=${encodeURIComponent(payerSource)}`;
}
