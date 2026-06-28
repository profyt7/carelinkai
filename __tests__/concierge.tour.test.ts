/**
 * Concierge tour coordination — routing + notifications.
 *
 * Proves the concierge promise: a tour from a shortlist never black-holes.
 *  - CLAIMED home   → operator email + admin (Chris) notify; no claim drip.
 *  - UNCLAIMED home → admin (Chris) notify + claim-conversion signal; no operator email.
 *  - Idempotent (already-requested → no duplicate notifications).
 *  - Ownership + status guards.
 *  - coordinateConciergeInquiry only acts for the DP who owns the search (anti-spoof).
 *
 * Uses the REAL persistence helper (markConciergeTourRequested) with prisma mocked.
 */

jest.mock('@/lib/auth-utils', () => ({ requireRole: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    placementSearch: { findUnique: jest.fn(), update: jest.fn() },
    assistedLivingHome: { findUnique: jest.fn() },
  },
}));
jest.mock('@/lib/email', () => ({
  sendConciergeTourNotification: jest.fn().mockResolvedValue(true),
  sendNewLeadOperatorEmail: jest.fn().mockResolvedValue(true),
}));
jest.mock('@/lib/claim-engine/claim-drip', () => ({ startClaimDripOnLead: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));

import { POST } from '@/app/api/discharge-planner/concierge/[id]/tour/route';
import { coordinateConciergeInquiry } from '@/lib/concierge/tour-coordination';
import { requireRole } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { sendConciergeTourNotification, sendNewLeadOperatorEmail } from '@/lib/email';
import { startClaimDripOnLead } from '@/lib/claim-engine/claim-drip';

const SENTINEL = 'directory-unclaimed@carelinkai.system';
function req(body: unknown) { return { json: async () => body } as any; }
const ctx = { params: { id: 'search-1' } };

function seedSearch(over: any = {}) {
  (prisma.placementSearch.findUnique as jest.Mock).mockResolvedValue({
    id: 'search-1', userId: 'dp-1', isConcierge: true, conciergeStatus: 'SHORTLIST_READY',
    curatedHomes: [{ homeId: 'h1', name: 'Lakeview' }],
    user: { firstName: 'Pat', lastName: 'Planner', dischargePlannerProfile: { organization: 'County' } },
    ...over,
  });
}
function seedHome(email: string | null) {
  (prisma.assistedLivingHome.findUnique as jest.Mock).mockResolvedValue({
    id: 'h1', name: 'Lakeview', operator: { user: { email, firstName: 'Olivia' } },
  });
}

describe('POST /api/discharge-planner/concierge/[id]/tour', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireRole as jest.Mock).mockResolvedValue({ id: 'dp-1', role: 'DISCHARGE_PLANNER' });
    (prisma.placementSearch.update as jest.Mock).mockResolvedValue({});
  });

  it('CLAIMED home → operator email + admin notify, no claim drip', async () => {
    seedSearch();
    seedHome('operator@realhome.com');
    const res = await POST(req({ homeId: 'h1' }), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, tourStatus: 'REQUESTED', claimed: true });
    expect(sendConciergeTourNotification).toHaveBeenCalledTimes(1);
    expect((sendConciergeTourNotification as jest.Mock).mock.calls[0][0]).toMatchObject({ facilityName: 'Lakeview', claimed: true });
    expect(sendNewLeadOperatorEmail).toHaveBeenCalledTimes(1);
    expect(startClaimDripOnLead).not.toHaveBeenCalled();
    // status persisted
    expect((prisma.placementSearch.update as jest.Mock).mock.calls[0][0].data.curatedHomes[0].tourStatus).toBe('REQUESTED');
  });

  it('UNCLAIMED home → admin notify + claim signal, no operator email', async () => {
    seedSearch();
    seedHome(SENTINEL);
    const res = await POST(req({ homeId: 'h1' }), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, claimed: false });
    expect(sendConciergeTourNotification).toHaveBeenCalledTimes(1);
    expect((sendConciergeTourNotification as jest.Mock).mock.calls[0][0]).toMatchObject({ claimed: false });
    expect(sendNewLeadOperatorEmail).not.toHaveBeenCalled();
    expect(startClaimDripOnLead).toHaveBeenCalledWith({ homeId: 'h1', trigger: 'tour' });
  });

  it('already requested → no duplicate notifications', async () => {
    seedSearch({ curatedHomes: [{ homeId: 'h1', name: 'Lakeview', tourStatus: 'REQUESTED' }] });
    seedHome(SENTINEL);
    const res = await POST(req({ homeId: 'h1' }), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, alreadyRequested: true });
    expect(sendConciergeTourNotification).not.toHaveBeenCalled();
    expect(sendNewLeadOperatorEmail).not.toHaveBeenCalled();
    expect(startClaimDripOnLead).not.toHaveBeenCalled();
    expect(prisma.placementSearch.update).not.toHaveBeenCalled();
  });

  it('rejects another DP (cross-tenant)', async () => {
    seedSearch({ userId: 'other-dp' });
    const res = await POST(req({ homeId: 'h1' }), ctx);
    expect(res.status).toBe(403);
    expect(prisma.placementSearch.update).not.toHaveBeenCalled();
  });

  it('rejects when no shortlist is ready', async () => {
    seedSearch({ conciergeStatus: 'MATCHING' });
    const res = await POST(req({ homeId: 'h1' }), ctx);
    expect(res.status).toBe(400);
  });

  it('rejects a home that is not on the shortlist', async () => {
    seedSearch({ curatedHomes: [{ homeId: 'other' }] });
    const res = await POST(req({ homeId: 'h1' }), ctx);
    expect(res.status).toBe(400);
  });
});

describe('coordinateConciergeInquiry — anti-spoof', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.placementSearch.update as jest.Mock).mockResolvedValue({});
  });

  it('notifies when the requester owns the concierge search', async () => {
    (prisma.placementSearch.findUnique as jest.Mock).mockResolvedValue({
      id: 'search-1', userId: 'dp-1', isConcierge: true, curatedHomes: [{ homeId: 'h1' }],
      user: { firstName: 'Pat', lastName: 'Planner', dischargePlannerProfile: { organization: 'County' } },
    });
    await coordinateConciergeInquiry({ searchId: 'search-1', homeId: 'h1', requesterUserId: 'dp-1', facilityName: 'Lakeview', claimed: false });
    expect(sendConciergeTourNotification).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the requester is not the search owner', async () => {
    (prisma.placementSearch.findUnique as jest.Mock).mockResolvedValue({
      id: 'search-1', userId: 'dp-1', isConcierge: true, curatedHomes: [{ homeId: 'h1' }], user: {},
    });
    await coordinateConciergeInquiry({ searchId: 'search-1', homeId: 'h1', requesterUserId: 'someone-else', facilityName: 'X', claimed: true });
    expect(prisma.placementSearch.update).not.toHaveBeenCalled();
    expect(sendConciergeTourNotification).not.toHaveBeenCalled();
  });
});
