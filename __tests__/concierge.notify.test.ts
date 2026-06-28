/**
 * Concierge "send to DP" notifications — when an admin sends a shortlist, the DP
 * gets an in-app bell notification (linking to /discharge-planner/concierge) and a
 * PHI-free email. "Mark as Matching" notifies nothing.
 */

jest.mock('@/lib/auth-utils', () => ({ requireRole: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    placementSearch: { findUnique: jest.fn(), update: jest.fn() },
    assistedLivingHome: { findMany: jest.fn() },
  },
}));
jest.mock('@/lib/services/notifications', () => ({ createInAppNotification: jest.fn().mockResolvedValue({ success: true, id: 'n1' }) }));
jest.mock('@/lib/email', () => ({ sendConciergeShortlistReadyEmail: jest.fn().mockResolvedValue(true) }));

import { PATCH } from '@/app/api/admin/concierge/[id]/route';
import { requireRole } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { createInAppNotification } from '@/lib/services/notifications';
import { sendConciergeShortlistReadyEmail } from '@/lib/email';

function makeReq(body: unknown) {
  return { json: async () => body } as any;
}
const ctx = { params: { id: 'search-1' } };

describe('PATCH /api/admin/concierge/[id] — DP notifications on send', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireRole as jest.Mock).mockResolvedValue({ id: 'admin-1', role: 'ADMIN' });
    (prisma.placementSearch.findUnique as jest.Mock).mockResolvedValue({
      id: 'search-1', isConcierge: true, userId: 'dp-1', user: { email: 'dp@example.com' },
    });
    (prisma.placementSearch.update as jest.Mock).mockResolvedValue({});
    (prisma.assistedLivingHome.findMany as jest.Mock).mockResolvedValue([
      { id: 'h1', name: 'Lakeview Memory Care', address: { street: '1 Main', city: 'Cleveland', state: 'OH', zipCode: '44114' } },
      { id: 'h2', name: 'Maple Assisted Living', address: { street: '2 Main', city: 'Cleveland', state: 'OH', zipCode: '44114' } },
    ]);
  });

  it('respond: bell notification (links to concierge) + PHI-free email with only a count', async () => {
    const res = await PATCH(makeReq({
      action: 'respond',
      curatedHomes: [
        { homeId: 'h1', note: 'secured dementia unit', confirmedAvailability: '2 beds' },
        { homeId: 'h2' },
      ],
      conciergeNote: 'Two strong options.',
    }), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, status: 'SHORTLIST_READY', curatedCount: 2 });

    // In-app bell to the DP, deep-linking to the concierge page.
    expect(createInAppNotification).toHaveBeenCalledTimes(1);
    const note = (createInAppNotification as jest.Mock).mock.calls[0][0];
    expect(note.userId).toBe('dp-1');
    expect(note.link).toBe('/discharge-planner/concierge');
    expect(note.title).toMatch(/shortlist/i);

    // PHI-free email to the DP's own address — count only, no patient/home detail.
    expect(sendConciergeShortlistReadyEmail).toHaveBeenCalledTimes(1);
    const email = (sendConciergeShortlistReadyEmail as jest.Mock).mock.calls[0][0];
    expect(email).toEqual({ toEmail: 'dp@example.com', count: 2 });
    const blob = JSON.stringify(email).toLowerCase();
    for (const leak of ['dementia', 'lakeview', 'maple', '1 main', 'secured']) {
      expect(blob).not.toContain(leak);
    }
  });

  it('matching: notifies nothing', async () => {
    const res = await PATCH(makeReq({ action: 'matching' }), ctx);
    expect(res.status).toBe(200);
    expect(createInAppNotification).not.toHaveBeenCalled();
    expect(sendConciergeShortlistReadyEmail).not.toHaveBeenCalled();
  });
});
