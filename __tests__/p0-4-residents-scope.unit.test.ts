/**
 * P0-4 (security decision package, Nov 2026): GET /api/residents (and its CSV export) stays inside the caller's scope.
 * Before: a caller-supplied ?homeId replaced an operator's/caregiver's home scope, and a FAMILY account with no
 * linked residents got no filter at all — both exposed other tenants' residents, incl. DOB / medications / allergies
 * / conditions in format=csv.
 */
const findMany = jest.fn(async (_a?: any) => [] as any[]);
let scope: any;
let user = { id: 'u1', role: 'OPERATOR' };
jest.mock('@/lib/prisma', () => ({ prisma: { resident: { findMany: (a: any) => findMany(a) } } }));
jest.mock('@/lib/auth-utils', () => ({
  requirePermission: async () => user,
  getUserScope: async () => scope,
  handleAuthError: () => new Response('{}', { status: 401 }),
}));
jest.mock('@/lib/audit', () => ({ createAuditLogFromRequest: jest.fn() }));
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn(), isExpectedAuthError: () => false }));
jest.mock('@/lib/utils/capacity-tracker', () => ({ updateHomeCapacity: jest.fn() }));

const get = async (qs: string) => {
  const { GET } = await import('@/app/api/residents/route');
  return GET(new Request(`http://x/api/residents?${qs}`) as any);
};

beforeEach(() => findMany.mockClear());

describe('GET /api/residents stays in scope', () => {
  it('operator: ?homeId of another tenant → 403, nothing queried (JSON and CSV)', async () => {
    user = { id: 'op', role: 'OPERATOR' };
    scope = { role: 'OPERATOR', homeIds: ['h-mine'], residentIds: [] };
    for (const qs of ['homeId=h-victim', 'homeId=h-victim&format=csv']) {
      const res = await get(qs);
      expect(res.status).toBe(403);
    }
    expect(findMany).not.toHaveBeenCalled();
  });
  it('operator: own homeId is honoured; no homeId → all own homes only', async () => {
    user = { id: 'op', role: 'OPERATOR' };
    scope = { role: 'OPERATOR', homeIds: ['h-mine', 'h-mine2'], residentIds: [] };
    await get('homeId=h-mine');
    expect(findMany.mock.calls[0]![0].where.homeId).toBe('h-mine');
    await get('');
    expect(findMany.mock.calls[1]![0].where.homeId).toEqual({ in: ['h-mine', 'h-mine2'] });
  });
  it('caregiver: same rule', async () => {
    user = { id: 'cg', role: 'CAREGIVER' };
    scope = { role: 'CAREGIVER', homeIds: ['h-cg'], residentIds: [] };
    expect((await get('homeId=h-other')).status).toBe(403);
  });
  it('family with NO linked residents → empty list, nothing queried (used to return every resident)', async () => {
    user = { id: 'fam', role: 'FAMILY' };
    scope = { role: 'FAMILY', homeIds: [], residentIds: [] };
    const res = await get('format=csv');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [], nextCursor: null });
    expect(findMany).not.toHaveBeenCalled();
  });
  it('family with residents → only those ids, even with a homeId param', async () => {
    user = { id: 'fam', role: 'FAMILY' };
    scope = { role: 'FAMILY', homeIds: [], residentIds: ['r1'] };
    await get('homeId=h-victim');
    expect(findMany.mock.calls[0]![0].where.id).toEqual({ in: ['r1'] });
  });
  it('a role with no scope (no homes) → empty, nothing queried', async () => {
    user = { id: 'x', role: 'OPERATOR' };
    scope = { role: 'OPERATOR', homeIds: [], residentIds: [] };
    expect(await (await get('homeId=h-victim')).json()).toEqual({ items: [], nextCursor: null });
    expect(findMany).not.toHaveBeenCalled();
  });
  it('admin/staff: unrestricted, homeId filter applies', async () => {
    user = { id: 'a', role: 'ADMIN' };
    scope = { role: 'ADMIN', homeIds: 'ALL', residentIds: 'ALL' };
    await get('homeId=h-any');
    expect(findMany.mock.calls[0]![0].where.homeId).toBe('h-any');
  });
});
