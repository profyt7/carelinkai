/**
 * /concierge payer-source screener routing (sprint W3 item 5 / W5-3).
 *
 * The family concierge is a PRIVATE-PAY offer paid by the family ($399 flat,
 * see src/lib/concierge/offer.ts). The screener sits in front of it and routes
 * by the same Anti-Kickback firewall mapping the inquiry form uses
 * (src/lib/payer/payer-source.ts → deriveFeeLane):
 *
 *   FEE_ELIGIBLE (private funds, LTC insurance) → 'private_pay' — sees the offer
 *   UNKNOWN      (not sure)                     → 'private_pay' — sees the offer
 *                                                 (the family pays; no home ever does)
 *   FREE_LANE    (Medicaid/waiver, Medicare/MA, VA) → 'free_help' — routed to the
 *                                                 free directory + guides; NEVER
 *                                                 sees the offer or a price
 *
 * Pure; no pricing lives here (offer.ts owns the number). No Stripe here.
 */

import type { PayerSource } from '@/lib/payer/payer-source';
import { conciergeRouteForLane } from '@/lib/concierge/offer';

export type ConciergeRoute = 'private_pay' | 'free_help';

export function routeForPayerSource(payerSource: PayerSource | null | undefined): ConciergeRoute {
  // Unanswered fails closed (no offer, no price); an explicit "not sure" is an answer.
  if (!payerSource) return 'free_help';
  return conciergeRouteForLane(payerSource) === 'offer' ? 'private_pay' : 'free_help';
}

/** "Request the concierge" (flag unset) posts here → the existing DP concierge queue (W4 0a). */
export const CONCIERGE_REQUEST_API = '/api/concierge/request';

/** Directory pre-filtered to homes ACCEPTING_NEW Medicaid waiver residents (sprint W5-2). */
export const WAIVER_DIRECTORY_PATH = '/cleveland/assisted-living?waiver=1';

/** Where the free lane lands: the Medicaid answer goes straight to the waiver-filtered directory. */
export function freeHelpPathFor(payerSource: PayerSource | null | undefined): string {
  return payerSource === 'MEDICAID_WAIVER' ? WAIVER_DIRECTORY_PATH : '/cleveland';
}
