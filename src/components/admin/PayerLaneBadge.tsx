"use client";

/**
 * Read-only payer-source + derived fee-lane display for admin/concierge views
 * (OL-114). Display only — payer source never gates or changes behavior; the
 * lane is derived on the fly by the shared (attorney-reviewable) function so
 * it is never stale.
 */

import {
  FEE_LANE_LABELS,
  PAYER_SOURCE_LABELS,
  deriveFeeLane,
  isPayerSource,
} from "@/lib/payer/payer-source";

const LANE_STYLES: Record<string, string> = {
  FEE_ELIGIBLE: "bg-success-50 text-success-700 border-success-200",
  FREE_LANE: "bg-primary-50 text-primary-700 border-primary-200",
  UNKNOWN: "bg-neutral-50 text-neutral-600 border-neutral-200",
};

/** Compact badge: "Payer: <label>" + lane chip. Renders nothing when untagged. */
export function PayerLaneBadge({ payerSource }: { payerSource?: string | null }) {
  if (!isPayerSource(payerSource)) return null;
  const lane = deriveFeeLane(payerSource);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${LANE_STYLES[lane]}`}
      title={FEE_LANE_LABELS[lane]}
    >
      {PAYER_SOURCE_LABELS[payerSource]}
    </span>
  );
}

/** Definition-list row variant for detail views. Shows "Not captured" when blank. */
export function PayerLaneRow({ payerSource }: { payerSource?: string | null }) {
  const tagged = isPayerSource(payerSource);
  const lane = deriveFeeLane(tagged ? payerSource : null);
  return (
    <div>
      <span className="font-medium">Payer source:</span>{" "}
      {tagged ? PAYER_SOURCE_LABELS[payerSource] : "Not captured"}
      <span
        className={`ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${LANE_STYLES[lane]}`}
      >
        {FEE_LANE_LABELS[lane]}
      </span>
    </div>
  );
}
