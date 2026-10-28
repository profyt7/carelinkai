/**
 * First-class intake facts for PlacementSearch (sprint W5-1, Δ14 / G2).
 *
 * Derived ONCE at intake time from what the request actually carried — payer
 * lane from the screener answer, ZIP from the stated search area, care level
 * from the same keyword rule the facility summary uses. Nothing is guessed
 * later and nothing is backfilled. Every value is a plain business fact (no PHI).
 */

import { buildFacilitySummary } from '@/lib/concierge/facility-response';
import { deriveFeeLane, isPayerSource } from '@/lib/payer/payer-source';

export type IntakeFacts = { payerLane: string; intakeZip: string | null; careLevel: string };

/** First 5-digit ZIP in a free-text location / query, else null. */
export function extractZip(...texts: Array<string | null | undefined>): string | null {
  for (const t of texts) {
    if (!t) continue;
    const m = /\b(\d{5})(?:-\d{4})?\b/.exec(t);
    if (m) return m[1]!;
  }
  return null;
}

export function deriveIntakeFacts(input: {
  payerSource?: unknown;
  patientInfo?: unknown;
  parsedCriteria?: unknown;
  queryText?: string | null;
  location?: string | null;
}): IntakeFacts {
  const payerLane = deriveFeeLane(isPayerSource(input.payerSource) ? input.payerSource : null);
  const summary = buildFacilitySummary({
    parsedCriteria: input.parsedCriteria,
    patientInfo: input.patientInfo,
    payerSource: input.payerSource,
    queryText: input.queryText,
  });
  const pc = (input.parsedCriteria && typeof input.parsedCriteria === 'object' ? input.parsedCriteria : {}) as Record<string, unknown>;
  const pcLoc = typeof pc['location'] === 'string' ? (pc['location'] as string) : typeof pc['zipCode'] === 'string' ? (pc['zipCode'] as string) : null;
  return {
    payerLane,
    intakeZip: extractZip(input.location, pcLoc, input.queryText),
    careLevel: summary.careLevel,
  };
}
