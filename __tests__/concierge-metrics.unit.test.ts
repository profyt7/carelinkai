/**
 * Sprint 4.4 / W4-3 — concierge metrics, one assertion per metric on fixture data:
 * requests, time-to-shortlist (median), time-to-first-facility-response,
 * time-to-placement, accept rate, top decline reasons, payer-lane mix; per DP
 * and overall; empty input never divides by zero.
 */

import { computeConciergeMetrics, computeBlock, median, type MetricRequest, type MetricResponse } from '@/lib/concierge/metrics';

const T0 = new Date('2026-10-01T10:00:00Z').getTime();
const h = (hours: number) => new Date(T0 + hours * 3_600_000);

const resp = (over: Partial<MetricResponse>): MetricResponse => ({
  status: 'SENT', sentAt: h(4), respondedAt: null, acceptedAt: null, declinedAt: null, admittedAt: null, declineReason: null, ...over,
});

const FIXTURE: MetricRequest[] = [
  // DP Alice: request 1 — shortlist after 4h, home A declines (wandering) at +6h, home B accepts at +10h, admitted at +52h.
  {
    id: 'r1', dpId: 'alice', dpName: 'Alice Nurse', dpOrganization: 'County Hospital',
    conciergeSubmittedAt: h(0), conciergeRespondedAt: h(4), payerSource: 'PRIVATE_FUNDS',
    responses: [
      resp({ status: 'DECLINED', respondedAt: h(6), declinedAt: h(6), declineReason: 'ACUITY_WANDERING' }),
      resp({ status: 'ADMITTED', respondedAt: h(10), acceptedAt: h(10), admittedAt: h(52) }),
    ],
  },
  // DP Alice: request 2 — shortlist after 12h, one decline (no bed) at +13h, one still waiting.
  {
    id: 'r2', dpId: 'alice', dpName: 'Alice Nurse', dpOrganization: 'County Hospital',
    conciergeSubmittedAt: h(100), conciergeRespondedAt: h(112), payerSource: 'MEDICAID_WAIVER',
    responses: [
      resp({ status: 'DECLINED', respondedAt: h(113), declinedAt: h(113), declineReason: 'NO_BED' }),
      resp({ status: 'SENT' }),
    ],
  },
  // DP Bob: request 3 — no shortlist yet, payer unanswered.
  { id: 'r3', dpId: 'bob', dpName: 'Bob Case', dpOrganization: null, conciergeSubmittedAt: h(200), conciergeRespondedAt: null, payerSource: null, responses: [] },
  // DP Bob: request 4 — shortlist after 2h, accepted at +5h (not admitted yet), another wandering decline.
  {
    id: 'r4', dpId: 'bob', dpName: 'Bob Case', dpOrganization: null,
    conciergeSubmittedAt: h(300), conciergeRespondedAt: h(302), payerSource: 'VA_BENEFITS',
    responses: [
      resp({ status: 'ACCEPTED', respondedAt: h(305), acceptedAt: h(305) }),
      resp({ status: 'DECLINED', respondedAt: h(310), declinedAt: h(310), declineReason: 'ACUITY_WANDERING' }),
    ],
  },
];

describe('median', () => {
  it('handles odd, even and empty', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});

describe('computeConciergeMetrics — overall', () => {
  const m = computeConciergeMetrics(FIXTURE, new Date('2026-10-13T12:00:00Z'));
  const o = m.overall;

  it('requests + shortlisted', () => {
    expect(o.requests).toBe(4);
    expect(o.shortlisted).toBe(3);
  });
  it('time-to-shortlist median (4h, 12h, 2h → 4h)', () => {
    expect(o.timeToShortlistMedianHours).toBe(4);
  });
  it('time-to-first-facility-response median from shortlist sent (2h, 1h, 3h → 2h)', () => {
    expect(o.timeToFirstFacilityResponseMedianHours).toBe(2);
  });
  it('time-to-placement median from request (only r1 placed: 52h)', () => {
    expect(o.timeToPlacementMedianHours).toBe(52);
    expect(o.placedRequests).toBe(1);
  });
  it('accept rate = accepted / (accepted + declined); open rows do not count', () => {
    expect(o.facilityResponses).toBe(6);
    expect(o.accepted).toBe(2);
    expect(o.declined).toBe(3);
    expect(o.admitted).toBe(1);
    expect(o.acceptRate).toBe(0.4);
  });
  it('top decline reasons, most frequent first, with labels', () => {
    expect(o.topDeclineReasons).toEqual([
      { reason: 'ACUITY_WANDERING', label: expect.stringMatching(/wandering/i), count: 2 },
      { reason: 'NO_BED', label: expect.stringMatching(/no bed/i), count: 1 },
    ]);
  });
  it('payer-lane mix (private-pay vs free lane vs unknown) + source mix', () => {
    expect(o.payerLaneMix).toEqual({ FEE_ELIGIBLE: 1, FREE_LANE: 2, UNKNOWN: 1 });
    expect(o.payerSourceMix.find((s) => s.payerSource === 'UNANSWERED')).toMatchObject({ count: 1, label: 'Not answered' });
    expect(o.payerSourceMix.find((s) => s.payerSource === 'MEDICAID_WAIVER')?.count).toBe(1);
  });
  it('generatedAt is the supplied clock', () => {
    expect(m.generatedAt).toBe('2026-10-13T12:00:00.000Z');
  });
});

describe('computeConciergeMetrics — per DP', () => {
  const m = computeConciergeMetrics(FIXTURE);
  const alice = m.perDp.find((b) => b.key === 'alice')!;
  const bob = m.perDp.find((b) => b.key === 'bob')!;

  it('groups by DP, most requests first, with name + organization', () => {
    expect(m.perDp.map((b) => b.key)).toEqual(['alice', 'bob']);
    expect(alice).toMatchObject({ label: 'Alice Nurse', organization: 'County Hospital', requests: 2, shortlisted: 2 });
    expect(bob).toMatchObject({ label: 'Bob Case', organization: null, requests: 2, shortlisted: 1 });
  });
  it('per-DP medians and rates are computed on that DP only', () => {
    expect(alice.timeToShortlistMedianHours).toBe(8); // (4 + 12) / 2
    expect(alice.timeToFirstFacilityResponseMedianHours).toBe(1.5); // (2 + 1) / 2
    expect(alice.timeToPlacementMedianHours).toBe(52);
    expect(alice.acceptRate).toBeCloseTo(1 / 3, 3);
    expect(alice.topDeclineReasons.map((r) => r.reason)).toEqual(['ACUITY_WANDERING', 'NO_BED']);
    expect(alice.payerLaneMix).toEqual({ FEE_ELIGIBLE: 1, FREE_LANE: 1, UNKNOWN: 0 });
    expect(bob.timeToShortlistMedianHours).toBe(2);
    expect(bob.timeToFirstFacilityResponseMedianHours).toBe(3);
    expect(bob.timeToPlacementMedianHours).toBeNull();
    expect(bob.acceptRate).toBe(0.5);
    expect(bob.payerLaneMix).toEqual({ FEE_ELIGIBLE: 0, FREE_LANE: 1, UNKNOWN: 1 });
  });
});

describe('edge cases', () => {
  it('empty input → zeros and nulls, never NaN', () => {
    const m = computeConciergeMetrics([]);
    expect(m.perDp).toEqual([]);
    expect(m.overall).toMatchObject({ requests: 0, shortlisted: 0, timeToShortlistMedianHours: null, timeToFirstFacilityResponseMedianHours: null, timeToPlacementMedianHours: null, acceptRate: null, topDeclineReasons: [], payerLaneMix: { FEE_ELIGIBLE: 0, FREE_LANE: 0, UNKNOWN: 0 } });
  });
  it('a request answered before the shortlist timestamp (clock skew) is not counted negative', () => {
    const b = computeBlock('x', 'x', null, [{
      id: 'r', dpId: 'd', dpName: 'd', dpOrganization: null, conciergeSubmittedAt: h(10), conciergeRespondedAt: h(12), payerSource: null,
      responses: [resp({ status: 'ACCEPTED', respondedAt: h(11), acceptedAt: h(11) })],
    }]);
    expect(b.timeToFirstFacilityResponseMedianHours).toBeNull();
    expect(b.accepted).toBe(1);
  });
});
