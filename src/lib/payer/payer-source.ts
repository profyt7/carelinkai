/**
 * Payer-source screener (OL-114, feat/payer-source-screener).
 *
 * Tags how a family expects to pay for care and derives which FEE LANE the
 * record falls in for the (ratified, not-yet-live) $2,500 placement fee.
 *
 * ⚖️ LEGAL-SENSITIVE — the deriveFeeLane mapping is the Anti-Kickback Statute
 * firewall: placement fees must never attach to placements paid by a federal
 * health care program (Medicaid/waiver, Medicare/MA, VA). The mapping below is
 * v1 PENDING ATTORNEY REVIEW (Haran engagement) — change it only via that
 * review. feeLane is deliberately NOT persisted anywhere: it is derived at
 * read time by this one function, so an attorney-driven change applies to all
 * historical records with no backfill.
 *
 * 🚫 TAGS ONLY: payer source must NEVER gate, filter, rank, or otherwise
 * change what help a family receives — no matching/search behavior may read it.
 */

// Mirrors the Prisma enum PayerSource — keep in sync with prisma/schema.prisma.
export type PayerSource =
  | 'PRIVATE_FUNDS'
  | 'LTC_INSURANCE'
  | 'MEDICAID_WAIVER'
  | 'MEDICARE_ADVANTAGE'
  | 'VA_BENEFITS'
  | 'NOT_SURE';

export type FeeLane = 'FEE_ELIGIBLE' | 'FREE_LANE' | 'UNKNOWN';

export const PAYER_SOURCE_VALUES: readonly PayerSource[] = [
  'PRIVATE_FUNDS',
  'LTC_INSURANCE',
  'MEDICAID_WAIVER',
  'MEDICARE_ADVANTAGE',
  'VA_BENEFITS',
  'NOT_SURE',
] as const;

/** Friendly, no-wrong-answers labels — the exact copy shown in forms. */
export const PAYER_SOURCE_LABELS: Record<PayerSource, string> = {
  PRIVATE_FUNDS: 'Private funds / savings',
  LTC_INSURANCE: 'Long-term care insurance',
  MEDICAID_WAIVER: 'Medicaid or Medicaid waiver (Assisted Living Waiver)',
  MEDICARE_ADVANTAGE: 'Medicare or Medicare Advantage benefit',
  VA_BENEFITS: 'VA benefits',
  NOT_SURE: "Not sure yet — we'd like help figuring it out",
};

/** Options in display order. "Not sure yet" is a first-class, prominent choice. */
export const PAYER_SOURCE_OPTIONS: ReadonlyArray<{ value: PayerSource; label: string }> =
  PAYER_SOURCE_VALUES.map((value) => ({ value, label: PAYER_SOURCE_LABELS[value] }));

export function isPayerSource(value: unknown): value is PayerSource {
  return typeof value === 'string' && (PAYER_SOURCE_VALUES as readonly string[]).includes(value);
}

/**
 * The AKS firewall mapping (v1, attorney review pending):
 *   FEE_ELIGIBLE — private funds, LTC insurance (no federal program dollars)
 *   FREE_LANE   — Medicaid/waiver, Medicare/MA, VA (federal program payers:
 *                 the placement fee must never attach)
 *   UNKNOWN     — "not sure yet" or unanswered (later triggers the Financing
 *                 Navigator flow — NOT built yet)
 */
export function deriveFeeLane(payerSource: PayerSource | null | undefined): FeeLane {
  switch (payerSource) {
    case 'PRIVATE_FUNDS':
    case 'LTC_INSURANCE':
      return 'FEE_ELIGIBLE';
    case 'MEDICAID_WAIVER':
    case 'MEDICARE_ADVANTAGE':
    case 'VA_BENEFITS':
      return 'FREE_LANE';
    case 'NOT_SURE':
    default:
      return 'UNKNOWN';
  }
}

/** Admin-display labels for the derived lane (read-only surfaces). */
export const FEE_LANE_LABELS: Record<FeeLane, string> = {
  FEE_ELIGIBLE: 'Fee-eligible (private pay / LTC insurance)',
  FREE_LANE: 'Free lane (Medicaid / Medicare / VA — no placement fee)',
  UNKNOWN: 'Unknown (not sure yet / unanswered)',
};
