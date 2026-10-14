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

/** "Request concierge help" posts here → the existing DP concierge queue (W4 0a). */
export const CONCIERGE_REQUEST_API = '/api/concierge/request';

/**
 * The decided fee model (2026-10-14). Shown ONLY inside the private-pay offer,
 * which is mounted client-side after a FEE_ELIGIBLE screener answer — never in
 * the server HTML, never to a free-lane family. No Stripe product exists; the
 * fee is invoiced to the facility by hand. Families pay nothing.
 */
export const CONCIERGE_FEE_MODEL = {
  amount: 2500,
  display: '$2,500',
  headline: 'One flat fee of $2,500, paid by the facility — families pay nothing.',
  detail:
    'The fee is charged to the facility you move into, only for private-pay placements, and only after a confirmed move-in. There is never a fee when care is paid through Medicaid, Medicare or the VA, and no home pays us to be recommended.',
} as const;
