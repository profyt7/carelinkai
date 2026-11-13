/** Aggregate, non-PHI availability for the DP landing page (shown before 2FA). */
import { jest } from '@jest/globals';

const findMany = jest.fn<(a: any) => Promise<any[]>>();
const requireAnyRole = jest.fn<(r: any) => Promise<any>>(async () => ({ session: { user: { role: 'DISCHARGE_PLANNER' } } }));
jest.mock('@/lib/prisma', () => ({ prisma: { assistedLivingHome: { findMany: (a: any) => findMany(a) } } }));
jest.mock('@/lib/rbac', () => ({ requireAnyRole: (r: any) => requireAnyRole(r) }));

import { summarizeAvailability } from '@/lib/discharge-planner/availability-summary';
import { GET } from '@/app/api/discharge-planner/availability/summary/route';

const NOW = Date.parse('2026-11-12T12:00:00Z');
const fresh = new Date(NOW - 2 * 86_400_000); // 2 days ago
const stale = new Date(NOW - 90 * 86_400_000);
const home = (careLevel: string[], count: number | null, verifiedAt: Date | null) => ({ careLevel, availabilityCount: count, availabilityVerifiedAt: verifiedAt, availabilitySource: verifiedAt ? 'OPERATOR' : null });

describe('summarizeAvailability', () => {
  it('counts only verified-fresh openings, by care level (no capacity math)', () => {
    const s = summarizeAvailability([
      home(['ASSISTED', 'MEMORY_CARE'], 3, fresh),
      home(['ASSISTED'], 0, fresh),
      home(['MEMORY_CARE'], 5, stale), // stale → contact to confirm, not counted
      home(['INDEPENDENT'], null, null),
    ], NOW);
    expect(s).toMatchObject({ totalHomes: 4, verifiedHomes: 2, homesWithOpenings: 1, openings: 3, lastVerifiedAt: fresh.toISOString() });
    expect(s.byCareLevel).toEqual([
      { careLevel: 'INDEPENDENT', homes: 1, homesWithOpenings: 0, openings: 0 },
      { careLevel: 'ASSISTED', homes: 2, homesWithOpenings: 1, openings: 3 },
      { careLevel: 'MEMORY_CARE', homes: 2, homesWithOpenings: 1, openings: 3 },
    ]);
  });

  it('empty directory', () => {
    expect(summarizeAvailability([], NOW)).toEqual({ totalHomes: 0, verifiedHomes: 0, homesWithOpenings: 0, openings: 0, lastVerifiedAt: null, byCareLevel: [] });
  });
});

describe('GET /api/discharge-planner/availability/summary', () => {
  it('DP/ADMIN only; active non-demo homes; selects no patient or home-identifying fields', async () => {
    findMany.mockResolvedValue([home(['ASSISTED'], 2, new Date())]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(requireAnyRole).toHaveBeenCalledWith(['DISCHARGE_PLANNER', 'ADMIN']);
    const q = findMany.mock.calls[0][0];
    expect(q.where).toEqual({ status: 'ACTIVE', isDemo: false });
    expect(Object.keys(q.select).sort()).toEqual(['availabilityCount', 'availabilitySource', 'availabilityVerifiedAt', 'careLevel']);
    expect((await res.json()).summary).toMatchObject({ totalHomes: 1, homesWithOpenings: 1, openings: 2 });
  });

  it('a refused role gets the rbac error', async () => {
    const { NextResponse } = await import('next/server');
    requireAnyRole.mockResolvedValueOnce({ error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) });
    expect((await GET()).status).toBe(403);
  });
});
