/**
 * OL-112 tests: admin metrics exclude demo fixtures by default, include them
 * when the "Show demo data" toggle is on, and the demo-account email
 * convention classifies the retained tutorial/seed accounts correctly.
 */

import { jest } from '@jest/globals';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { count: jest.fn() },
    assistedLivingHome: { count: jest.fn() },
    inquiry: { count: jest.fn() },
    placementSearch: { count: jest.fn() },
    operator: { findMany: jest.fn() },
    caregiver: { count: jest.fn() },
    provider: { count: jest.fn() },
    family: { count: jest.fn() },
    ride: { aggregate: jest.fn() },
  },
}));

import { getAdminStats } from '@/lib/admin/stats';
import { isDemoAccountEmail } from '@/lib/admin/demo-identity';
import { prisma } from '@/lib/prisma';

const p = prisma as any;

beforeEach(() => {
  p.user.count.mockResolvedValue(5);
  p.assistedLivingHome.count.mockResolvedValue(3);
  p.inquiry.count.mockResolvedValue(2);
  p.placementSearch.count.mockResolvedValue(1);
  p.operator.findMany.mockResolvedValue([{ subscriptionPlan: 'STARTER' }]);
  p.caregiver.count.mockResolvedValue(0);
  p.provider.count.mockResolvedValue(0);
  p.family.count.mockResolvedValue(0);
  p.ride.aggregate.mockResolvedValue({ _sum: { platformFee: 0 } });
});
afterEach(() => jest.clearAllMocks());

describe('getAdminStats demo filtering (OL-112)', () => {
  it('default (showDemo=false): every metric query excludes demo rows', async () => {
    const stats = await getAdminStats(false);
    expect(stats.showDemo).toBe(false);

    // Direct user/home counts filter isDemo:false.
    for (const call of p.user.count.mock.calls) {
      expect(call[0].where.isDemo).toBe(false);
    }
    for (const call of p.assistedLivingHome.count.mock.calls) {
      expect(call[0].where.isDemo).toBe(false);
    }
    // Relational filters: subscriptions/pro/plus via user.isDemo, inquiries via
    // home.isDemo, placements via user.isDemo, transport via provider.user.
    expect(p.operator.findMany.mock.calls[0][0].where.user).toEqual({ isDemo: false });
    expect(p.caregiver.count.mock.calls[0][0].where.user).toEqual({ isDemo: false });
    expect(p.provider.count.mock.calls[0][0].where.user).toEqual({ isDemo: false });
    expect(p.family.count.mock.calls[0][0].where.user).toEqual({ isDemo: false });
    expect(p.inquiry.count.mock.calls[0][0].where.home).toEqual({ isDemo: false });
    expect(p.placementSearch.count.mock.calls[0][0].where.user).toEqual({ isDemo: false });
    expect(p.ride.aggregate.mock.calls[0][0].where.provider).toEqual({ user: { isDemo: false } });
  });

  it('showDemo=true (tutorial toggle): no demo filters anywhere', async () => {
    const stats = await getAdminStats(true);
    expect(stats.showDemo).toBe(true);

    const allWheres = [
      ...p.user.count.mock.calls,
      ...p.assistedLivingHome.count.mock.calls,
      ...p.inquiry.count.mock.calls,
      ...p.placementSearch.count.mock.calls,
      ...p.operator.findMany.mock.calls,
      ...p.caregiver.count.mock.calls,
      ...p.provider.count.mock.calls,
      ...p.family.count.mock.calls,
      ...p.ride.aggregate.mock.calls,
    ].map((c: any[]) => JSON.stringify(c[0] ?? {}));
    for (const where of allWheres) {
      expect(where).not.toContain('isDemo');
    }
  });

  it('MRR math is unchanged by the filter plumbing', async () => {
    const stats = await getAdminStats(false);
    expect(stats.mrr.operator).toBe(99); // 1 STARTER operator
    expect(stats.mrr.total).toBe(99);
  });
});

describe('isDemoAccountEmail (backfill classification)', () => {
  it('flags every retained demo/seed convention', () => {
    for (const email of [
      'demo.operator@carelinkai.test',
      'demo.family@carelinkai.test',
      'DEMO.ADMIN@CARELINKAI.TEST',
      'op1@test.carelinkai.com',
      'operator+seed@carelinkai.com',
      'family.seed2@carelinkai.com',
    ]) {
      expect(isDemoAccountEmail(email)).toBe(true);
    }
  });

  it('never flags real accounts', () => {
    for (const email of [
      'profyt7@gmail.com',
      'chris@getcarelinkai.com',
      'teresa@pleasantviewhealthcare.com',
      'lfluhart@elizajen.org',
      'seedling@example.com', // contains "seed" but not the convention
      'family.seedman@gmail.com', // right prefix, wrong domain
      null,
      undefined,
    ]) {
      expect(isDemoAccountEmail(email as any)).toBe(false);
    }
  });
});
