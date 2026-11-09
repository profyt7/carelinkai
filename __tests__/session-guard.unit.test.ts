/**
 * Security package §3: server-side session revocation + 2FA enforcement.
 * Before: a NextAuth JWT kept working for 30 days whatever happened to the user
 * (deactivated, demoted, password reset, "log out other devices"), and roles
 * that should use 2FA could skip it.
 */
import { NextRequest, NextResponse } from 'next/server';
import { encode, decode } from 'next-auth/jwt';
import { authenticator } from 'otplib';

const findUnique = jest.fn();
const update = jest.fn();
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: (a: unknown) => findUnique(a), update: (a: unknown) => update(a) },
    auditLog: { create: jest.fn(async () => ({})) },
  },
}));
jest.mock('@next-auth/prisma-adapter', () => ({ PrismaAdapter: () => ({}) }));

import { applyUserToToken, SessionRevokedError, roleRequiresTwoFactor, twoFactorEnforced, type GuardUser } from '@/lib/auth/session-guard';
import { apiAllowedDuringTwoFactorSetup, safeCallbackUrl, twoFactorSetupUrl } from '@/lib/auth/two-factor-routes';
import { reissueSessionCookie, bumpSessionVersion, sessionCookieName } from '@/lib/auth/session-version';
import { encryptTotpSecret } from '@/lib/two-factor/secure';

const SECRET = 'test-nextauth-secret-session-guard';
const OLD = process.env;
beforeEach(() => {
  process.env = { ...OLD, NEXTAUTH_SECRET: SECRET, TWO_FACTOR_ENCRYPTION_KEY: 'k' } as NodeJS.ProcessEnv;
  delete process.env.TWO_FACTOR_ENFORCEMENT;
  findUnique.mockReset();
  update.mockReset();
});
afterAll(() => { process.env = OLD; });

const ENROLLED_SECRET = () => encryptTotpSecret(authenticator.generateSecret());
const dbUser = (over: Partial<GuardUser> = {}): GuardUser => ({
  status: 'ACTIVE', role: 'FAMILY', sessionVersion: 0, twoFactorEnabled: false, twoFactorSecret: null,
  firstName: 'Pat', lastName: 'Lee', profileImageUrl: null, ...over,
});

describe('applyUserToToken', () => {
  it('revokes when the user is gone, not ACTIVE, or the session version moved', () => {
    expect(() => applyUserToToken({ sv: 0 }, null)).toThrow(SessionRevokedError);
    for (const status of ['DEACTIVATED', 'SUSPENDED', 'PENDING']) {
      expect(() => applyUserToToken({ sv: 0 }, dbUser({ status }))).toThrow(/inactive/);
    }
    expect(() => applyUserToToken({ sv: 1 }, dbUser({ sessionVersion: 2 }))).toThrow(/version/);
  });

  it('a token from before this change (no sv) is version 0, so sessions survive the deploy', () => {
    expect(() => applyUserToToken({}, dbUser())).not.toThrow();
    expect(() => applyUserToToken({}, dbUser({ sessionVersion: 1 }))).toThrow(/version/);
  });

  it('refreshes role, name and image from the database (a demotion is immediate)', () => {
    const t = applyUserToToken({ sv: 0, role: 'ADMIN', name: 'old' }, dbUser({ role: 'FAMILY', firstName: 'New', lastName: 'Name', profileImageUrl: { medium: 'm.jpg' } }));
    expect(t).toMatchObject({ role: 'FAMILY', name: 'New Name', firstName: 'New', profileImageUrl: 'm.jpg' });
  });

  it.each(['ADMIN', 'STAFF', 'OPERATOR', 'DISCHARGE_PLANNER'])('%s without 2FA must set it up; with 2FA does not', (role) => {
    expect(applyUserToToken({ sv: 0 }, dbUser({ role })).twoFactorSetupRequired).toBe(true);
    // flag alone (the old toggle) is not enrolment
    expect(applyUserToToken({ sv: 0 }, dbUser({ role, twoFactorEnabled: true })).twoFactorSetupRequired).toBe(true);
    expect(applyUserToToken({ sv: 0 }, dbUser({ role, twoFactorEnabled: true, twoFactorSecret: ENROLLED_SECRET() })).twoFactorSetupRequired).toBe(false);
  });

  it.each(['FAMILY', 'CAREGIVER', 'PROVIDER', 'AFFILIATE'])('%s: 2FA is optional', (role) => {
    expect(applyUserToToken({ sv: 0 }, dbUser({ role })).twoFactorSetupRequired).toBe(false);
  });

  it('TWO_FACTOR_ENFORCEMENT=off turns the requirement off (e2e only)', () => {
    expect(twoFactorEnforced({} as any)).toBe(true);
    expect(twoFactorEnforced({ TWO_FACTOR_ENFORCEMENT: 'OFF' } as any)).toBe(false);
    expect(applyUserToToken({ sv: 0 }, dbUser({ role: 'ADMIN' }), { TWO_FACTOR_ENFORCEMENT: 'off' } as any).twoFactorSetupRequired).toBe(false);
    expect(roleRequiresTwoFactor('FAMILY')).toBe(false);
  });
});

describe('authOptions jwt callback', () => {
  const jwt = async (args: any) => (await import('@/lib/auth')).authOptions.callbacks!.jwt!(args);

  it('at sign-in stores sv + authTime and computes the 2FA claim', async () => {
    findUnique.mockResolvedValue(dbUser({ role: 'OPERATOR', sessionVersion: 3 }));
    const t: any = await jwt({ token: {}, user: { id: 'u1', email: 'a@b.c', role: 'OPERATOR', sessionVersion: 3 } });
    expect(t).toMatchObject({ id: 'u1', sv: 3, role: 'OPERATOR', twoFactorSetupRequired: true });
    expect(typeof t.authTime).toBe('number');
  });

  it('later calls revoke a deactivated user or a bumped version', async () => {
    findUnique.mockResolvedValue(dbUser({ status: 'DEACTIVATED' }));
    await expect(jwt({ token: { id: 'u1', sv: 0 } })).rejects.toThrow(SessionRevokedError);
    findUnique.mockResolvedValue(dbUser({ sessionVersion: 1 }));
    await expect(jwt({ token: { id: 'u1', sv: 0 } })).rejects.toThrow(SessionRevokedError);
  });

  it('a "trigger: update" from the client cannot raise its own version', async () => {
    findUnique.mockResolvedValue(dbUser({ sessionVersion: 5 }));
    await expect(jwt({ token: { id: 'u1', sv: 4 }, trigger: 'update', session: { sv: 5 } })).rejects.toThrow(SessionRevokedError);
  });

  it('a database error keeps the session (fail open on outages)', async () => {
    findUnique.mockRejectedValue(new Error('db down'));
    const t: any = await jwt({ token: { id: 'u1', sv: 0, role: 'ADMIN' } });
    expect(t).toMatchObject({ id: 'u1', role: 'ADMIN' });
  });

  it('session exposes twoFactorSetupRequired', async () => {
    const { authOptions } = await import('@/lib/auth');
    const s: any = await authOptions.callbacks!.session!({ session: { user: {} } as any, token: { id: 'u1', twoFactorSetupRequired: true } as any } as any);
    expect(s.user.twoFactorSetupRequired).toBe(true);
  });
});

describe('ending other sessions', () => {
  it('bumpSessionVersion increments the column', async () => {
    update.mockResolvedValue({ sessionVersion: 7 });
    expect(await bumpSessionVersion('u1')).toBe(7);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'u1' }, data: { sessionVersion: { increment: 1 } } }));
  });

  it('reissueSessionCookie keeps the caller signed in with the new version', async () => {
    const cookie = await encode({ token: { id: 'u1', sv: 0, role: 'FAMILY' }, secret: SECRET });
    const req = new NextRequest('http://localhost/api/profile/sessions', { headers: { cookie: `${sessionCookieName()}=${cookie}` } });
    const res = NextResponse.json({ ok: true });
    expect(await reissueSessionCookie(req, res, 1)).toBe(true);
    const set = res.cookies.get(sessionCookieName());
    const decoded: any = await decode({ token: set!.value, secret: SECRET });
    expect(decoded).toMatchObject({ id: 'u1', sv: 1, role: 'FAMILY' });
    expect(set).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/' });
  });

  it('reissueSessionCookie does nothing without a session cookie', async () => {
    const res = NextResponse.json({ ok: true });
    expect(await reissueSessionCookie(new NextRequest('http://localhost/x'), res, 1)).toBe(false);
    expect(res.cookies.get(sessionCookieName())).toBeUndefined();
  });
});

describe('middleware: 2FA setup is forced before anything else', () => {
  const withSession = async (path: string, claims: Record<string, unknown>) => {
    const cookie = await encode({ token: { id: 'u1', sv: 0, role: 'ADMIN', ...claims }, secret: SECRET });
    return new NextRequest(`http://localhost${path}`, { headers: { cookie: `${sessionCookieName()}=${cookie}` } });
  };
  const run = async (req: NextRequest) => (await import('@/middleware')).default(req as any) as Promise<Response>;

  it('pages redirect to /auth/setup-2fa with the original destination', async () => {
    const res = await run(await withSession('/admin/users?page=2', { twoFactorSetupRequired: true }));
    expect(res.status).toBe(307);
    const loc = new URL(res.headers.get('location')!);
    expect(loc.pathname).toBe('/auth/setup-2fa');
    expect(loc.searchParams.get('callbackUrl')).toBe('/admin/users?page=2');
  });

  it('APIs answer 403, except /api/auth/* (session, sign-out, 2FA setup)', async () => {
    const blocked = await run(await withSession('/api/admin/users', { twoFactorSetupRequired: true }));
    expect(blocked.status).toBe(403);
    expect(await blocked.json()).toEqual({ error: 'TWO_FACTOR_SETUP_REQUIRED' });
    for (const p of ['/api/auth/session', '/api/auth/setup-2fa', '/api/auth/signout']) {
      const r = await run(await withSession(p, { twoFactorSetupRequired: true }));
      expect({ p, next: r.headers.get('x-middleware-next') }).toEqual({ p, next: '1' });
    }
  });

  it('an enrolled user (or one whose role does not require 2FA) passes', async () => {
    expect((await run(await withSession('/api/admin/users', { twoFactorSetupRequired: false }))).headers.get('x-middleware-next')).toBe('1');
    expect((await run(await withSession('/admin/users', { twoFactorSetupRequired: false }))).headers.get('x-middleware-next')).toBe('1');
  });

  it('a request with no session is unaffected on APIs (routes do their own auth)', async () => {
    const r = await run(new NextRequest('http://localhost/api/homes/search'));
    expect(r.headers.get('x-middleware-next')).toBe('1');
  });
});

describe('two-factor-routes helpers', () => {
  it('only /api/auth/* is open during setup', () => {
    expect(apiAllowedDuringTwoFactorSetup('/api/auth/setup-2fa')).toBe(true);
    expect(apiAllowedDuringTwoFactorSetup('/api/authx')).toBe(false);
    expect(apiAllowedDuringTwoFactorSetup('/api/profile/account')).toBe(false);
  });
  it('callbackUrl is same-site only', () => {
    expect(twoFactorSetupUrl('/operator', '?x=1')).toBe('/auth/setup-2fa?callbackUrl=%2Foperator%3Fx%3D1');
    expect(safeCallbackUrl('/operator?x=1')).toBe('/operator?x=1');
    for (const bad of [null, '', 'https://evil.test', '//evil.test', '/\\evil.test', '/auth/setup-2fa?callbackUrl=/x']) {
      expect(safeCallbackUrl(bad)).toBe('/dashboard');
    }
  });
});
