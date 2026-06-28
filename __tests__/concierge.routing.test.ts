/**
 * Concierge ROUTING + PHI unit tests (reliable, no e2e harness limits).
 *
 * Proves the safety-critical contract of POST /api/discharge-planner/concierge:
 *  - the request is routed to CareLinkAI (admin) — it flags the PlacementSearch
 *    and persists the patient intake IN-APP; it creates NO per-home
 *    PlacementRequest and calls NO operator-email function (the only outbound
 *    side effect is the PHI-free admin notification);
 *  - the admin notification is called with ONLY {requestId, dpName, dpOrganization}
 *    — structurally impossible to leak patient data.
 */

jest.mock('@/lib/auth-utils', () => ({ requireRole: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    placementSearch: { findUnique: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn() },
  },
}));
jest.mock('@/lib/email', () => ({ sendConciergeRequestNotification: jest.fn().mockResolvedValue(true) }));
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));

import { POST } from '@/app/api/discharge-planner/concierge/route';
import { requireRole } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { sendConciergeRequestNotification } from '@/lib/email';

function makeReq(body: unknown) {
  return { json: async () => body } as any;
}

const PATIENT = {
  patientName: 'J.D.',
  patientAge: '82',
  medicalNeeds: 'advanced dementia with wandering; needs secured memory care',
  timeline: 'urgent',
  paymentType: 'medicaid',
  additionalNotes: 'daughter is POA',
};

describe('POST /api/discharge-planner/concierge — routing + PHI safety', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireRole as jest.Mock).mockResolvedValue({ id: 'dp-1', role: 'DISCHARGE_PLANNER' });
    (prisma.placementSearch.findUnique as jest.Mock).mockResolvedValue({ id: 'search-1', userId: 'dp-1' });
    (prisma.placementSearch.update as jest.Mock).mockResolvedValue({});
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      firstName: 'Pat', lastName: 'Planner',
      dischargePlannerProfile: { organization: 'County Hospital' },
    });
  });

  it('routes to admin, persists patientInfo in-app, and creates no operator-bound request', async () => {
    const res = await POST(makeReq({ searchId: 'search-1', patientInfo: PATIENT }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, status: 'SUBMITTED' });

    // The search is flagged concierge + SUBMITTED and the intake is stored IN-APP.
    const updateArg = (prisma.placementSearch.update as jest.Mock).mock.calls[0][0];
    expect(updateArg.where).toEqual({ id: 'search-1' });
    expect(updateArg.data.isConcierge).toBe(true);
    expect(updateArg.data.conciergeStatus).toBe('SUBMITTED');
    expect(updateArg.data.patientInfo).toEqual(PATIENT);
    expect(updateArg.data.conciergeSubmittedAt).toBeInstanceOf(Date);

    // No per-home PlacementRequest is created → nothing routed to an operator.
    expect((prisma as any).placementRequest).toBeUndefined();
  });

  it('fires a PHI-FREE admin notification (DP identity + requestId only)', async () => {
    await POST(makeReq({ searchId: 'search-1', patientInfo: PATIENT }));

    expect(sendConciergeRequestNotification).toHaveBeenCalledTimes(1);
    const arg = (sendConciergeRequestNotification as jest.Mock).mock.calls[0][0];
    // Exactly the non-PHI fields — no patient data, no free-text query.
    expect(arg).toEqual({ requestId: 'search-1', dpName: 'Pat Planner', dpOrganization: 'County Hospital' });

    const blob = JSON.stringify(arg).toLowerCase();
    for (const leak of ['dementia', 'j.d.', 'medicaid', 'poa', 'wandering', 'medicalneeds']) {
      expect(blob).not.toContain(leak);
    }
  });

  it('rejects a search owned by a different DP (no cross-tenant submit)', async () => {
    (prisma.placementSearch.findUnique as jest.Mock).mockResolvedValue({ id: 'search-1', userId: 'other-dp' });
    const res = await POST(makeReq({ searchId: 'search-1', patientInfo: PATIENT }));
    expect(res.status).toBe(403);
    expect(prisma.placementSearch.update).not.toHaveBeenCalled();
    expect(sendConciergeRequestNotification).not.toHaveBeenCalled();
  });

  it('requires care needs (min-necessary validation)', async () => {
    const res = await POST(makeReq({ searchId: 'search-1', patientInfo: { ...PATIENT, medicalNeeds: '' } }));
    expect(res.status).toBe(400);
    expect(prisma.placementSearch.update).not.toHaveBeenCalled();
  });
});
