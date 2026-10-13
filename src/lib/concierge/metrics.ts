/**
 * Concierge metrics — PURE (sprint 4.4 / W4-3). Computed from the timestamps
 * the concierge flow already records:
 *
 *   PlacementSearch.conciergeSubmittedAt   → request
 *   PlacementSearch.conciergeRespondedAt   → shortlist sent
 *   FacilityResponse.respondedAt           → facility answered (accept / decline)
 *   FacilityResponse.admittedAt            → placement (admin confirmed move-in)
 *
 * Per DP and overall: requests, time-to-shortlist (median), time-to-first-
 * facility-response (median, from shortlist sent), time-to-placement (median,
 * from request), accept rate, top decline reasons, payer-lane mix. Demo data
 * is excluded by the loader (metrics-engine.ts) — this module only counts.
 */

import type { FacilityDeclineReason, FacilityResponseStatus, PayerSource } from '@prisma/client';
import { deriveFeeLane, PAYER_SOURCE_LABELS, type FeeLane } from '@/lib/payer/payer-source';
import { DECLINE_REASON_LABELS } from '@/lib/concierge/facility-response';

export type MetricResponse = {
  status: FacilityResponseStatus;
  sentAt: Date | string | null;
  respondedAt: Date | string | null;
  acceptedAt: Date | string | null;
  declinedAt: Date | string | null;
  admittedAt: Date | string | null;
  declineReason: FacilityDeclineReason | null;
};

export type MetricRequest = {
  id: string;
  dpId: string;
  dpName: string;
  dpOrganization: string | null;
  conciergeSubmittedAt: Date | string | null;
  conciergeRespondedAt: Date | string | null;
  payerSource: PayerSource | null;
  responses: MetricResponse[];
};

export type MetricsBlock = {
  key: string;
  label: string;
  organization: string | null;
  requests: number;
  shortlisted: number;
  /** Hours, median over requests that got a shortlist. null = no data. */
  timeToShortlistMedianHours: number | null;
  /** Hours from shortlist sent to the first facility answer, median over requests with ≥1 answer. */
  timeToFirstFacilityResponseMedianHours: number | null;
  /** Hours from request to the first confirmed admission, median over placed requests. */
  timeToPlacementMedianHours: number | null;
  facilityResponses: number;
  accepted: number;
  declined: number;
  admitted: number;
  /** accepted / (accepted + declined), 0–1; null when nobody answered yet. */
  acceptRate: number | null;
  placedRequests: number;
  topDeclineReasons: Array<{ reason: FacilityDeclineReason; label: string; count: number }>;
  payerLaneMix: Record<FeeLane, number>;
  payerSourceMix: Array<{ payerSource: PayerSource | 'UNANSWERED'; label: string; count: number }>;
};

export type ConciergeMetrics = {
  generatedAt: string;
  overall: MetricsBlock;
  perDp: MetricsBlock[];
};

const HOUR = 3_600_000;
const t = (d: Date | string | null | undefined): number | null => {
  if (!d) return null;
  const n = new Date(d).getTime();
  return Number.isNaN(n) ? null : n;
};

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? (s[mid] as number) : ((s[mid - 1] as number) + (s[mid] as number)) / 2;
}

const round1 = (n: number | null) => (n === null ? null : Math.round(n * 10) / 10);

export function computeBlock(key: string, label: string, organization: string | null, reqs: MetricRequest[]): MetricsBlock {
  const toShortlist: number[] = [];
  const toFirstResponse: number[] = [];
  const toPlacement: number[] = [];
  let shortlisted = 0;
  let facilityResponses = 0;
  let accepted = 0;
  let declined = 0;
  let admitted = 0;
  let placedRequests = 0;
  const reasons = new Map<FacilityDeclineReason, number>();
  const lanes: Record<FeeLane, number> = { FEE_ELIGIBLE: 0, FREE_LANE: 0, UNKNOWN: 0 };
  const sources = new Map<PayerSource | 'UNANSWERED', number>();

  for (const r of reqs) {
    const submitted = t(r.conciergeSubmittedAt);
    const shortlistAt = t(r.conciergeRespondedAt);
    if (shortlistAt) {
      shortlisted++;
      if (submitted && shortlistAt >= submitted) toShortlist.push((shortlistAt - submitted) / HOUR);
    }
    lanes[deriveFeeLane(r.payerSource)]++;
    const srcKey: PayerSource | 'UNANSWERED' = r.payerSource ?? 'UNANSWERED';
    sources.set(srcKey, (sources.get(srcKey) ?? 0) + 1);

    let firstAnswer: number | null = null;
    let firstAdmit: number | null = null;
    for (const fr of r.responses) {
      facilityResponses++;
      if (fr.status === 'ACCEPTED' || fr.status === 'ADMITTED') accepted++;
      if (fr.status === 'DECLINED') {
        declined++;
        if (fr.declineReason) reasons.set(fr.declineReason, (reasons.get(fr.declineReason) ?? 0) + 1);
      }
      if (fr.status === 'ADMITTED') admitted++;
      const answered = t(fr.respondedAt);
      if (answered && (firstAnswer === null || answered < firstAnswer)) firstAnswer = answered;
      const adm = t(fr.admittedAt);
      if (adm && (firstAdmit === null || adm < firstAdmit)) firstAdmit = adm;
    }
    const from = shortlistAt ?? submitted;
    if (firstAnswer && from && firstAnswer >= from) toFirstResponse.push((firstAnswer - from) / HOUR);
    if (firstAdmit) {
      placedRequests++;
      if (submitted && firstAdmit >= submitted) toPlacement.push((firstAdmit - submitted) / HOUR);
    }
  }

  const answered = accepted + declined;
  return {
    key,
    label,
    organization,
    requests: reqs.length,
    shortlisted,
    timeToShortlistMedianHours: round1(median(toShortlist)),
    timeToFirstFacilityResponseMedianHours: round1(median(toFirstResponse)),
    timeToPlacementMedianHours: round1(median(toPlacement)),
    facilityResponses,
    accepted,
    declined,
    admitted,
    acceptRate: answered > 0 ? Math.round((accepted / answered) * 1000) / 1000 : null,
    placedRequests,
    topDeclineReasons: [...reasons.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([reason, count]) => ({ reason, label: DECLINE_REASON_LABELS[reason], count })),
    payerLaneMix: lanes,
    payerSourceMix: [...sources.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([payerSource, count]) => ({
        payerSource,
        label: payerSource === 'UNANSWERED' ? 'Not answered' : PAYER_SOURCE_LABELS[payerSource],
        count,
      })),
  };
}

export function computeConciergeMetrics(reqs: MetricRequest[], now: Date = new Date()): ConciergeMetrics {
  const byDp = new Map<string, MetricRequest[]>();
  for (const r of reqs) {
    const list = byDp.get(r.dpId) ?? [];
    list.push(r);
    byDp.set(r.dpId, list);
  }
  const perDp = [...byDp.entries()]
    .map(([dpId, list]) => computeBlock(dpId, list[0]?.dpName ?? dpId, list[0]?.dpOrganization ?? null, list))
    .sort((a, b) => b.requests - a.requests || a.label.localeCompare(b.label));
  return { generatedAt: now.toISOString(), overall: computeBlock('overall', 'All discharge planners', null, reqs), perDp };
}
