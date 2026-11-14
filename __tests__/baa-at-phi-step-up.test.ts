/**
 * BAA/DPA acceptance moved from onboarding to the PHI step-up. An OPERATOR who has only claimed
 * or edited a listing never touches PHI, so nothing asks them for the (still draft) BAA/DPA.
 * The first PHI route does, server-side, alongside the 2FA step-up:
 *   - the session token carries baaAcceptanceRequired (session-guard.ts);
 *   - middleware: PHI APIs → 403 { code: BAA_ACCEPTANCE_REQUIRED }, PHI pages → /operator/acceptance;
 *   - route handlers repeat it (requirePhiAccess / phiStepUpResponse / requireOperatorOrAdminForPhi).
 */
import { NextRequest } from 'next/server';
import { encode } from 'next-auth/jwt';

const session = { current: null as any };
jest.mock('next-auth', () => ({ getServerSession: async () => session.current }));
jest.mock('next-auth/next', () => ({ getServerSession: async () => session.current }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@next-auth/prisma-adapter', () => ({ PrismaAdapter: () => ({}) }));
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn(), isExpectedAuthError: () => true }));
jest.mock('@/lib/audit', () => ({ createAuditLogFromRequest: jest.fn(async () => undefined), createAuditLog: jest.fn(async () => undefined) }));

const residentFindMany = jest.fn(async () => [] as any[]);
const userFindUnique = jest.fn<any, any>();
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: (a: any) => userFindUnique(a) },
    operator: { findUnique: jest.fn(async () => ({ id: 'op1' })) },
    resident: { findMany: () => residentFindMany(), count: jest.fn(async () => 0) },
  },
}));

import { applyUserToToken, GUARD_USER_SELECT, type GuardUser } from '@/lib/auth/session-guard';
import { BAA_CURRENT_VERSION, DPA_CURRENT_VERSION, acceptanceIsCurrent } from '@/lib/legal-versions';
import { BAA_ACCEPTANCE_REQUIRED_CODE, operatorAcceptanceUrl, safeAcceptanceCallback } from '@/lib/auth/phi-agreement';
import { TWO_FACTOR_STEP_UP_CODE } from '@/lib/auth/two-factor-routes';
import { sessionCookieName } from '@/lib/auth/session-version';

const SECRET = 'test-nextauth-secret-baa-step-up';
const OLD = process.env;
beforeAll(() => {
  process.env = { ...OLD, NEXTAUTH_SECRET: SECRET } as NodeJS.ProcessEnv;
  delete process.env.TWO_FACTOR_ENFORCEMENT;
});
afterAll(() => { process.env = OLD; });
beforeEach(() => { residentFindMany.mockClear(); userFindUnique.mockReset(); });

const ACCEPTED = { baaTemplateVersion: BAA_CURRENT_VERSION, baaAcceptedAt: new Date(), dpaTemplateVersion: DPA_CURRENT_VERSION, dpaAcceptedAt: new Date() };
const NOT_ACCEPTED = { baaTemplateVersion: null, baaAcceptedAt: null, dpaTemplateVersion: null, dpaAcceptedAt: null };

// A claim-only operator: has 2FA or not, but has never accepted the BAA/DPA.
const CLAIM_ONLY = { id: 'u-op', email: 'op@example.com', role: 'OPERATOR', twoFactorStepUpRequired: false, baaAcceptanceRequired: true };
const ACCEPTED_OP = { ...CLAIM_ONLY, baaAcceptanceRequired: false };

describe('session token: baaAcceptanceRequired', () => {
  const db = (over: Partial<GuardUser>): GuardUser => ({
    status: 'ACTIVE', role: 'OPERATOR', sessionVersion: 0, twoFactorEnabled: false, twoFactorSecret: null,
    firstName: 'Teresa', lastName: 'P', profileImageUrl: null, ...over,
  });
  const flag = (over: Partial<GuardUser>) => (applyUserToToken({ sv: 0 } as Record<string, unknown>, db(over)) as any).baaAcceptanceRequired;

  it('the guard lookup also reads the operator acceptance fields (one query)', () => {
    expect(GUARD_USER_SELECT.operator).toEqual({ select: { baaTemplateVersion: true, baaAcceptedAt: true, dpaTemplateVersion: true, dpaAcceptedAt: true } });
  });

  it('OPERATOR: required until the current BAA + DPA are accepted', () => {
    expect(flag({ operator: NOT_ACCEPTED })).toBe(true);
    expect(flag({ operator: null })).toBe(true);
    expect(flag({ operator: { ...ACCEPTED, baaTemplateVersion: 'draft-2020-01-01' } })).toBe(true); // stale version
    expect(flag({ operator: { ...ACCEPTED, dpaAcceptedAt: null } })).toBe(true);
    expect(flag({ operator: ACCEPTED })).toBe(false);
  });

  it('never required for other roles', () => {
    for (const role of ['ADMIN', 'STAFF', 'FAMILY', 'DISCHARGE_PLANNER', 'CAREGIVER']) {
      expect({ role, v: flag({ role, operator: null }) }).toEqual({ role, v: false });
    }
  });

  it('acceptanceIsCurrent (shared with isOperatorAcceptanceCurrent)', () => {
    expect(acceptanceIsCurrent(ACCEPTED)).toBe(true);
    expect(acceptanceIsCurrent(NOT_ACCEPTED)).toBe(false);
    expect(acceptanceIsCurrent(undefined)).toBe(false);
  });
});

describe('middleware (server-side, before any handler)', () => {
  const req = async (path: string, claims: Record<string, unknown>, method = 'GET') => {
    const cookie = await encode({ token: { sv: 0, ...claims }, secret: SECRET });
    return new NextRequest(`http://localhost${path}`, { method, headers: { cookie: `${sessionCookieName()}=${cookie}` } });
  };
  const run = async (r: NextRequest) => (await import('@/middleware')).default(r as any) as Promise<Response>;
  const passes = (r: Response) => r.headers.get('x-middleware-next') === '1';

  it('claim-only operator: dashboard, listing pages and listing/claim/onboarding APIs all pass', async () => {
    for (const p of ['/operator', '/operator/homes/h1/edit', '/operator/onboarding/4', '/operator/inquiries', '/claim']) {
      expect({ p, passes: passes(await run(await req(p, CLAIM_ONLY))) }).toEqual({ p, passes: true });
    }
    for (const [p, m] of [['/api/operator/homes/h1', 'PATCH'], ['/api/operator/claim', 'POST'], ['/api/operator/onboarding/complete', 'POST'], ['/api/operator/acceptance', 'GET'], ['/api/operator/inquiries', 'GET']] as const) {
      expect({ p, passes: passes(await run(await req(p, CLAIM_ONLY, m))) }).toEqual({ p, passes: true });
    }
  });

  it('claim-only operator: PHI API → 403 with a clear code', async () => {
    for (const p of ['/api/residents', '/api/residents/r1/notes', '/api/operator/residents/r1/documents', '/api/documents/upload', '/api/operator/ask', '/api/operator/inquiries/i1/convert']) {
      const r = await run(await req(p, CLAIM_ONLY));
      expect({ p, status: r.status }).toEqual({ p, status: 403 });
      expect(await r.json()).toEqual({ error: BAA_ACCEPTANCE_REQUIRED_CODE, code: BAA_ACCEPTANCE_REQUIRED_CODE, acceptanceUrl: '/operator/acceptance' });
    }
  });

  it('claim-only operator: a resident page goes to the acceptance page and back', async () => {
    const res = await run(await req('/operator/residents/r1?tab=notes', CLAIM_ONLY));
    expect(res.status).toBe(307);
    const loc = new URL(res.headers.get('location')!);
    expect(loc.pathname).toBe('/operator/acceptance');
    expect(loc.searchParams.get('callbackUrl')).toBe('/operator/residents/r1?tab=notes');
  });

  it('2FA comes first when both are missing (setup, then acceptance)', async () => {
    const both = { ...CLAIM_ONLY, twoFactorStepUpRequired: true };
    const api = await run(await req('/api/residents', both));
    expect((await api.json()).code).toBe(TWO_FACTOR_STEP_UP_CODE);
    expect(new URL((await run(await req('/operator/residents', both))).headers.get('location')!).pathname).toBe('/auth/setup-2fa');
  });

  it('operator who accepted: PHI API and page pass', async () => {
    expect(passes(await run(await req('/api/residents', ACCEPTED_OP)))).toBe(true);
    expect(passes(await run(await req('/operator/residents', ACCEPTED_OP)))).toBe(true);
  });
});

describe('route handlers (the same rule inside the API routes)', () => {
  it('claim-only operator: residents API → 403 BAA code, no resident query', async () => {
    session.current = { user: CLAIM_ONLY };
    const { GET } = await import('@/app/api/residents/route');
    const res = await GET(new NextRequest('http://localhost/api/residents'));
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe(BAA_ACCEPTANCE_REQUIRED_CODE);
    expect(residentFindMany).not.toHaveBeenCalled();
  });

  it('operator who accepted: residents API → 200', async () => {
    session.current = { user: ACCEPTED_OP };
    userFindUnique.mockResolvedValue({ id: 'u-op', role: 'OPERATOR', operator: { id: 'op1', homes: [{ id: 'h1' }] }, family: null, caregiver: null });
    const { GET } = await import('@/app/api/residents/route');
    expect((await GET(new NextRequest('http://localhost/api/residents'))).status).toBe(200);
    expect(residentFindMany).toHaveBeenCalledTimes(1);
  });

  it('resident sub-routes (requireOperatorOrAdminForPhi) refuse a claim-only operator; listings still fine', async () => {
    const { requireOperatorOrAdmin, requireOperatorOrAdminForPhi } = await import('@/lib/rbac');
    session.current = { user: CLAIM_ONLY };
    expect('error' in (await requireOperatorOrAdmin())).toBe(false);
    const phi = await requireOperatorOrAdminForPhi();
    expect('error' in phi && phi.error!.status).toBe(403);
    expect(await (phi as any).error.json()).toMatchObject({ code: BAA_ACCEPTANCE_REQUIRED_CODE });
    session.current = { user: ACCEPTED_OP };
    expect('error' in (await requireOperatorOrAdminForPhi())).toBe(false);
  });

  it('requirePhiAccess / phiStepUpResponse / handleAuthError', async () => {
    const { requirePhiAccess, phiStepUpResponse, handleAuthError, BaaAcceptanceRequiredError, phiWithheld } = await import('@/lib/auth-utils');
    expect(() => requirePhiAccess(CLAIM_ONLY)).toThrow(BaaAcceptanceRequiredError);
    expect(() => requirePhiAccess(ACCEPTED_OP)).not.toThrow();
    const r = phiStepUpResponse(CLAIM_ONLY)!;
    expect(r.status).toBe(403);
    expect((await r.json()).code).toBe(BAA_ACCEPTANCE_REQUIRED_CODE);
    expect(phiStepUpResponse(ACCEPTED_OP)).toBeNull();
    const h = handleAuthError(new BaaAcceptanceRequiredError());
    expect(h.status).toBe(403);
    expect((await h.json()).acceptanceUrl).toBe('/operator/acceptance');
    expect(phiWithheld(CLAIM_ONLY)).toBe(true);
    expect(phiWithheld(ACCEPTED_OP)).toBe(false);
  });
});

describe('acceptance URLs', () => {
  it('remembers where the operator was going; callbacks stay same-site', () => {
    expect(operatorAcceptanceUrl('/operator/residents/r1', '?tab=notes')).toBe('/operator/acceptance?callbackUrl=%2Foperator%2Fresidents%2Fr1%3Ftab%3Dnotes');
    expect(safeAcceptanceCallback('/operator/residents/r1')).toBe('/operator/residents/r1');
    for (const bad of [null, '', 'https://evil.example', '//evil.example', '/\\evil', '/operator/acceptance?x=1']) {
      expect(safeAcceptanceCallback(bad)).toBe('/operator');
    }
  });
});
