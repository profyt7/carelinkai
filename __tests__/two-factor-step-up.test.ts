/**
 * PHI step-up 2FA for OPERATOR / DISCHARGE_PLANNER (ADMIN / STAFF keep the hard gate).
 * Without 2FA an operator can sign in and edit listings; residents (PHI) need 2FA first,
 * enforced server-side in middleware AND inside the handlers. A DP needs it before a case.
 */
import { NextRequest } from 'next/server';
import { encode } from 'next-auth/jwt';

const session = { current: null as any };
jest.mock('next-auth', () => ({ getServerSession: async () => session.current }));
jest.mock('next-auth/next', () => ({ getServerSession: async () => session.current }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@next-auth/prisma-adapter', () => ({ PrismaAdapter: () => ({}) }));
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn(), isExpectedAuthError: () => true }));
jest.mock('@/lib/events/record-event', () => ({ recordEvent: jest.fn(async () => undefined), diffFields: () => [] }));
jest.mock('@/lib/audit', () => ({ createAuditLogFromRequest: jest.fn(async () => undefined), createAuditLog: jest.fn(async () => undefined) }));

const userFindUnique = jest.fn<any, any>();
const homeUpdate = jest.fn(async (a: any) => ({ id: a.where.id }));
const residentFindMany = jest.fn(async () => [] as any[]);
jest.mock('@/lib/prisma', () => {
  const tx = { assistedLivingHome: { update: (a: any) => homeUpdate(a) } };
  return {
    prisma: {
      user: { findUnique: (a: any) => userFindUnique(a) },
      assistedLivingHome: { findUnique: jest.fn(async () => ({ id: 'h1', operatorId: 'op1', name: 'Old name' })) },
      operator: { findUnique: jest.fn(async () => ({ id: 'op1' })) },
      resident: { findMany: () => residentFindMany(), count: jest.fn(async () => 0) },
      $transaction: async (cb: any) => cb(tx),
    },
  };
});

import { isPhiApiPath, isPhiPagePath, twoFactorStepUpUrl, roleMayNotDisableTwoFactor, roleRequiresTwoFactor, roleNeedsTwoFactorForPhi, TWO_FACTOR_STEP_UP_CODE } from '@/lib/auth/two-factor-routes';
import { isPhiPermission } from '@/lib/auth-utils';
import { sessionCookieName } from '@/lib/auth/session-version';

const SECRET = 'test-nextauth-secret-step-up';
const OLD = process.env;
beforeAll(() => {
  process.env = { ...OLD, NEXTAUTH_SECRET: SECRET } as NodeJS.ProcessEnv;
  delete process.env.TWO_FACTOR_ENFORCEMENT;
});
afterAll(() => { process.env = OLD; });
beforeEach(() => { userFindUnique.mockReset(); homeUpdate.mockClear(); residentFindMany.mockClear(); });

const OPERATOR_NO_2FA = { id: 'u-op', email: 'op@example.com', role: 'OPERATOR', twoFactorStepUpRequired: true };
const OPERATOR_2FA = { ...OPERATOR_NO_2FA, twoFactorStepUpRequired: false };
const DP_NO_2FA = { id: 'u-dp', email: 'dp@example.com', role: 'DISCHARGE_PLANNER', twoFactorStepUpRequired: true };

describe('which routes are PHI', () => {
  it.each([
    '/api/residents', '/api/residents/r1/notes', '/api/residents/r1/documents/d1', '/api/residents/r1/contacts',
    '/api/operator/residents/r1/documents', '/api/documents/upload', '/api/family/residents', '/api/reports/generate',
    '/api/operator/ask', '/api/operator/caregivers/c1/assignments', '/api/caregivers/c1/assignments/a1',
    '/api/operator/inquiries/i1/convert', '/api/rides', '/api/calendar/appointments', '/api/billing/payments',
    '/api/discharge-planner/placement-request', '/api/discharge-planner/search', '/api/discharge-planner/requests',
    '/api/discharge-planner/history', '/api/discharge-planner/concierge', '/api/discharge-planner/concierge/p1/tour',
    '/api/discharge-planner/dashboard',
  ])('PHI API: %s', (p) => expect(isPhiApiPath(p)).toBe(true));

  it.each([
    '/api/operator/homes/h1', '/api/operator/homes/h1/photos', '/api/operator/availability-contact', '/api/operator/inquiries',
    '/api/operator/inquiries/i1', '/api/operator/inquiries/pipeline', '/api/operator/tours', '/api/operator/claim',
    '/api/operator/caregivers', '/api/operator/caregivers/c1', '/api/operator/dashboard', '/api/dashboard/metrics',
    '/api/discharge-planner/availability', '/api/discharge-planner/analytics', '/api/residentsx', '/api/homes/h1',
  ])('not PHI: %s', (p) => expect(isPhiApiPath(p)).toBe(false));

  it('pages', () => {
    for (const p of ['/operator/residents', '/operator/residents/r1', '/operator/documents', '/discharge-planner', '/discharge-planner/search', '/discharge-planner/requests', '/discharge-planner/concierge', '/discharge-planner/history']) {
      expect({ p, phi: isPhiPagePath(p) }).toEqual({ p, phi: true });
    }
    for (const p of ['/operator', '/operator/homes/h1/edit', '/operator/inquiries', '/operator/tours', '/operator/caregivers', '/discharge-planner/analytics', '/discharge-planner/billing', '/dashboard']) {
      expect({ p, phi: isPhiPagePath(p) }).toEqual({ p, phi: false });
    }
  });

  it('roles: ADMIN/STAFF hard gate, OPERATOR/DP step-up; none of them may switch 2FA off once on', () => {
    expect(['ADMIN', 'STAFF', 'OPERATOR', 'DISCHARGE_PLANNER', 'FAMILY'].map(roleRequiresTwoFactor)).toEqual([true, true, false, false, false]);
    expect(['ADMIN', 'STAFF', 'OPERATOR', 'DISCHARGE_PLANNER', 'FAMILY'].map(roleNeedsTwoFactorForPhi)).toEqual([false, false, true, true, false]);
    expect(['ADMIN', 'STAFF', 'OPERATOR', 'DISCHARGE_PLANNER', 'FAMILY'].map(roleMayNotDisableTwoFactor)).toEqual([true, true, true, true, false]);
  });

  it('a widget-started step-up keeps its page as callback and marks reason=phi (so setup does not skip)', () => {
    const u = new URL(twoFactorStepUpUrl('/operator/caregivers/c1', '?tab=assignments'), 'http://x');
    expect(u.pathname).toBe('/auth/setup-2fa');
    expect(u.searchParams.get('callbackUrl')).toBe('/operator/caregivers/c1?tab=assignments');
    expect(u.searchParams.get('reason')).toBe('phi');
  });

  it('PHI permissions', () => {
    for (const p of ['residents.view', 'assessments.create', 'incidents.view', 'compliance.view', 'family_contacts.view', 'documents.view', 'caregivers.assign', 'inquiries.convert']) expect(isPhiPermission(p)).toBe(true);
    for (const p of ['homes.update', 'inquiries.view', 'inquiries.update', 'tours.view', 'caregivers.view', 'analytics.view']) expect(isPhiPermission(p)).toBe(false);
  });
});

describe('middleware (server-side, before any handler)', () => {
  const req = async (path: string, claims: Record<string, unknown>, method = 'GET') => {
    const cookie = await encode({ token: { sv: 0, ...claims }, secret: SECRET });
    return new NextRequest(`http://localhost${path}`, { method, headers: { cookie: `${sessionCookieName()}=${cookie}` } });
  };
  const run = async (r: NextRequest) => (await import('@/middleware')).default(r as any) as Promise<Response>;
  const passes = (r: Response) => r.headers.get('x-middleware-next') === '1';

  it('operator without 2FA: listing edit API + page pass; residents API is 403 with the step-up code', async () => {
    expect(passes(await run(await req('/api/operator/homes/h1', OPERATOR_NO_2FA, 'PATCH')))).toBe(true);
    expect(passes(await run(await req('/api/operator/inquiries', OPERATOR_NO_2FA)))).toBe(true);
    expect(passes(await run(await req('/operator/homes/h1/edit', OPERATOR_NO_2FA)))).toBe(true);
    const blocked = await run(await req('/api/residents', OPERATOR_NO_2FA));
    expect(blocked.status).toBe(403);
    expect(await blocked.json()).toEqual({ error: TWO_FACTOR_STEP_UP_CODE, code: TWO_FACTOR_STEP_UP_CODE, setupUrl: '/auth/setup-2fa' });
  });

  it('operator without 2FA: a resident page goes to setup and back', async () => {
    const res = await run(await req('/operator/residents/r1?tab=notes', OPERATOR_NO_2FA));
    expect(res.status).toBe(307);
    const loc = new URL(res.headers.get('location')!);
    expect(loc.pathname).toBe('/auth/setup-2fa');
    expect(loc.searchParams.get('callbackUrl')).toBe('/operator/residents/r1?tab=notes');
  });

  it('operator with 2FA: residents API and page pass', async () => {
    expect(passes(await run(await req('/api/residents', OPERATOR_2FA)))).toBe(true);
    expect(passes(await run(await req('/operator/residents', OPERATOR_2FA)))).toBe(true);
  });

  it('DP without 2FA: case submit 403; availability passes; case pages go to setup', async () => {
    const r = await run(await req('/api/discharge-planner/placement-request', DP_NO_2FA, 'POST'));
    expect(r.status).toBe(403);
    expect((await r.json()).code).toBe(TWO_FACTOR_STEP_UP_CODE);
    expect(passes(await run(await req('/api/discharge-planner/availability', DP_NO_2FA)))).toBe(true);
    expect((await run(await req('/discharge-planner/search', DP_NO_2FA))).status).toBe(307);
    expect(passes(await run(await req('/discharge-planner/analytics', DP_NO_2FA)))).toBe(true);
  });

  it('ADMIN / STAFF keep the hard gate (every page and API until enrolled)', async () => {
    const admin = { id: 'u-a', role: 'ADMIN', twoFactorSetupRequired: true };
    const api = await run(await req('/api/operator/homes/h1', admin, 'PATCH'));
    expect(api.status).toBe(403);
    expect(await api.json()).toEqual({ error: 'TWO_FACTOR_SETUP_REQUIRED' });
    expect((await run(await req('/admin/users', admin))).status).toBe(307);
  });
});

describe('route handlers (the same rule inside the API routes)', () => {
  it('operator without 2FA: listing edit → 200', async () => {
    session.current = { user: OPERATOR_NO_2FA };
    userFindUnique.mockResolvedValue({ id: 'u-op', role: 'OPERATOR' });
    const { PATCH } = await import('@/app/api/operator/homes/[id]/route');
    const res = await PATCH(new Request('http://localhost/api/operator/homes/h1', { method: 'PATCH', body: JSON.stringify({ name: 'Sunrise Villa' }) }), { params: { id: 'h1' } });
    expect(res.status).toBe(200);
    expect(homeUpdate).toHaveBeenCalledTimes(1);
  });

  it('operator without 2FA: residents API → 403 step-up, no resident query', async () => {
    session.current = { user: OPERATOR_NO_2FA };
    const { GET } = await import('@/app/api/residents/route');
    const res = await GET(new NextRequest('http://localhost/api/residents'));
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe(TWO_FACTOR_STEP_UP_CODE);
    expect(residentFindMany).not.toHaveBeenCalled();
  });

  it('operator with 2FA: residents API → 200', async () => {
    session.current = { user: OPERATOR_2FA };
    userFindUnique.mockResolvedValue({ id: 'u-op', role: 'OPERATOR', operator: { id: 'op1', homes: [{ id: 'h1' }] }, family: null, caregiver: null });
    const { GET } = await import('@/app/api/residents/route');
    const res = await GET(new NextRequest('http://localhost/api/residents'));
    expect(res.status).toBe(200);
    expect(residentFindMany).toHaveBeenCalledTimes(1);
  });

  it('resident sub-routes (requireOperatorOrAdminForPhi) refuse an operator without 2FA', async () => {
    const { requireOperatorOrAdmin, requireOperatorOrAdminForPhi } = await import('@/lib/rbac');
    session.current = { user: OPERATOR_NO_2FA };
    expect('error' in (await requireOperatorOrAdmin())).toBe(false); // listings etc. still fine
    const phi = await requireOperatorOrAdminForPhi();
    expect('error' in phi && phi.error!.status).toBe(403);
    session.current = { user: OPERATOR_2FA };
    expect('error' in (await requireOperatorOrAdminForPhi())).toBe(false);
  });

  it('DP without 2FA: case submit (placement-request) → 403 step-up', async () => {
    session.current = { user: DP_NO_2FA };
    const { POST } = await import('@/app/api/discharge-planner/placement-request/route');
    const res = await POST(new NextRequest('http://localhost/api/discharge-planner/placement-request', { method: 'POST', body: JSON.stringify({ homeId: 'h1', patientInfo: {} }) }));
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe(TWO_FACTOR_STEP_UP_CODE);
  });
});
