/**
 * Concierge metrics — loader (sprint 4.4 / W4-3). Pulls every concierge
 * PlacementSearch with its FacilityResponse rows and hands them to the pure
 * computeConciergeMetrics(). DEMO EXCLUDED: requests from demo users and
 * responses for demo homes are dropped before counting.
 */

import { prisma } from '@/lib/prisma';
import { computeConciergeMetrics, type ConciergeMetrics, type MetricRequest } from '@/lib/concierge/metrics';
import { loadPlannerLeadDates } from '@/lib/leads/inbound-lead-admin';

export async function loadConciergeMetricInputs(): Promise<MetricRequest[]> {
  const rows = await prisma.placementSearch.findMany({
    where: { isConcierge: true, user: { isDemo: false } },
    select: {
      id: true,
      userId: true,
      conciergeSubmittedAt: true,
      conciergeRespondedAt: true,
      payerSource: true,
      user: { select: { firstName: true, lastName: true, email: true, dischargePlannerProfile: { select: { organization: true } } } },
      facilityResponses: {
        where: { home: { isDemo: false } },
        select: { status: true, sentAt: true, respondedAt: true, acceptedAt: true, declinedAt: true, admittedAt: true, declineReason: true },
      },
    },
    orderBy: { conciergeSubmittedAt: 'desc' },
    take: 5000,
  });
  return rows.map((r) => ({
    id: r.id,
    dpId: r.userId,
    dpName: [r.user?.firstName, r.user?.lastName].filter(Boolean).join(' ') || r.user?.email || r.userId,
    dpOrganization: r.user?.dischargePlannerProfile?.organization ?? null,
    conciergeSubmittedAt: r.conciergeSubmittedAt,
    conciergeRespondedAt: r.conciergeRespondedAt,
    payerSource: r.payerSource,
    responses: r.facilityResponses,
  }));
}

export async function getConciergeMetrics(now: Date = new Date()): Promise<ConciergeMetrics> {
  const [reqs, plannerLeadDates] = await Promise.all([loadConciergeMetricInputs(), loadPlannerLeadDates(now)]);
  return computeConciergeMetrics(reqs, now, plannerLeadDates);
}
