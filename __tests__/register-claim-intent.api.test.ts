/**
 * POST /api/auth/register + self-serve claim (fix/self-serve-claim):
 *  - an operator signing up from "Claim this listing" (claimIntent) gets a PENDING_REVIEW claim filed for
 *    that home, source 'signup'; the response says whether it was filed;
 *  - an expired / forged intent never fails registration and files nothing;
 *  - the signed outreach link (claimToken) works exactly as before — founder update from the link, no claim filed.
 */
import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';

jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));
jest.mock('@/lib/audit', () => ({ createAuditLogFromRequest: jest.fn(async () => undefined) }));
jest.mock('@/lib/email', () => ({ sendVerificationEmail: jest.fn(async () => true) }));
jest.mock('@/lib/email/transactional', () => ({ sendEmail: jest.fn(async () => ({ success: true })), escapeHtml: (v: unknown) => String(v ?? '') }));
jest.mock('@/lib/rate-limit', () => ({ rateLimit: () => ({ check: async () => undefined }) }));
jest.mock('bcryptjs', () => ({ hash: async () => 'hashed' }));
const verifyClaimToken = jest.fn<(...a: any[]) => any>(() => null);
jest.mock('@/lib/claim-token', () => ({ verifyClaimToken: (...a: unknown[]) => verifyClaimToken(...a) }));
const submitSelfServeClaim = jest.fn<(...a: any[]) => Promise<any>>();
jest.mock('@/lib/claims/self-serve', () => ({ submitSelfServeClaim: (...a: unknown[]) => submitSelfServeClaim(...a) }));
jest.mock('@/lib/prisma', () => {
  const p: any = {
    user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    operator: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
    leadConsent: { create: jest.fn(), findFirst: jest.fn() },
    auditLog: { create: jest.fn() },
    verificationToken: { create: jest.fn(), deleteMany: jest.fn() },
  };
  p.$transaction = jest.fn(async (fn: any) => fn(p));
  return { prisma: p };
});

import { prisma } from '@/lib/prisma';
import { signClaimIntent } from '@/lib/claims/claim-intent';
import { POST as postRegister } from '@/app/api/auth/register/route';

const db = prisma as any;
const SECRET = 'test-secret-register-claim';
const body = (extra: Record<string, unknown> = {}) => ({
  email: 'pat@maplegrove.test', password: 'Str0ng!Pass', firstName: 'Pat', lastName: 'Lee', phone: '(216) 555-0142', role: 'OPERATOR', agreeToTerms: true, ...extra,
});
const req = (b: unknown) => new NextRequest('http://localhost/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.20' }, body: JSON.stringify(b) });

beforeEach(() => {
  jest.clearAllMocks();
  process.env.NEXTAUTH_SECRET = SECRET;
  db.user.findUnique.mockResolvedValue(null);
  db.user.create.mockResolvedValue({ id: 'new-op-user', email: 'pat@maplegrove.test', firstName: 'Pat', lastName: 'Lee', role: 'OPERATOR', status: 'PENDING', createdAt: new Date() });
  db.operator.create.mockResolvedValue({ id: 'op-new' });
  submitSelfServeClaim.mockResolvedValue({ ok: true, claimId: 'claim-1' });
});

describe('register with a claim intent (signed-out "Claim this listing")', () => {
  it('files a PENDING_REVIEW claim for that home once the operator account exists', async () => {
    const res = await postRegister(req(body({ claimIntent: signClaimIntent('home-1', SECRET) })));
    expect(res.status).toBe(201);
    expect(submitSelfServeClaim).toHaveBeenCalledWith({ homeId: 'home-1', userId: 'new-op-user', source: 'signup' });
    expect((await res.json()).claim).toEqual({ submitted: true });
  });

  it('reports a refused claim (e.g. one already pending) without failing registration', async () => {
    submitSelfServeClaim.mockResolvedValue({ ok: false, reason: 'pending_exists' });
    const res = await postRegister(req(body({ claimIntent: signClaimIntent('home-1', SECRET) })));
    expect(res.status).toBe(201);
    expect((await res.json()).claim).toEqual({ submitted: false, reason: 'pending_exists' });
  });

  it('an expired or forged intent files nothing and still registers', async () => {
    const expired = signClaimIntent('home-1', SECRET, Date.now() - 3 * 3600 * 1000);
    const res = await postRegister(req(body({ claimIntent: expired })));
    expect(res.status).toBe(201);
    expect((await res.json()).claim).toEqual({ submitted: false, reason: 'expired' });
    await postRegister(req(body({ claimIntent: signClaimIntent('home-1', 'someone-else') })));
    expect(submitSelfServeClaim).not.toHaveBeenCalled();
  });

  it('only operators: a family signup ignores a claim intent', async () => {
    db.user.create.mockResolvedValue({ id: 'fam-user', email: 'f@x.test', firstName: 'F', lastName: 'X', role: 'FAMILY', status: 'PENDING', createdAt: new Date() });
    (db as any).family = { create: jest.fn(async () => ({ id: 'fam-1' })) };
    const res = await postRegister(req(body({ role: 'FAMILY', claimIntent: signClaimIntent('home-1', SECRET) })));
    expect(res.status).toBe(201);
    expect(submitSelfServeClaim).not.toHaveBeenCalled();
  });
});

describe('the signed outreach claim link (claimToken) is unchanged', () => {
  it('applies the founder update from the link and files no self-serve claim', async () => {
    verifyClaimToken.mockReturnValue({ operatorEmail: 'pat@maplegrove.test', clevelandFounder: true, cohort: 'CLEVELAND_FOUNDERS' });
    const res = await postRegister(req(body({ claimToken: 'signed.outreach.token' })));
    expect(res.status).toBe(201);
    expect(verifyClaimToken).toHaveBeenCalledWith('signed.outreach.token', SECRET);
    expect(db.operator.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'op-new' }, data: expect.objectContaining({ clevelandFounder: true }) }));
    expect(submitSelfServeClaim).not.toHaveBeenCalled();
    expect((await res.json()).claim).toBeUndefined();
  });
});
