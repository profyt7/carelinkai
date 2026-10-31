/**
 * Self-serve listing claim (fix/self-serve-claim).
 *  - the claim intent is signed, short-lived and tamper-proof;
 *  - a signed-in operator (listing button) and a new operator (signup intent) both file a PENDING_REVIEW claim;
 *    nothing changes hands, the admin is emailed;
 *  - one pending claim per home (checked, and a lost race on the partial unique index maps to the same answer);
 *  - already-claimed listings are refused;
 *  - approve runs the existing ownership transfer and emails the operator; reject transfers nothing and emails politely;
 *  - the claim-request route needs a session and is rate-limited;
 *  - register redeems a claim intent; the signed outreach claimToken path is unchanged.
 */
import { NextRequest } from 'next/server';

const mockSession = jest.fn();
jest.mock('next-auth', () => ({ getServerSession: () => mockSession() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/audit', () => ({ createAuditLogFromRequest: jest.fn(async () => undefined) }));
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));
jest.mock('@/lib/email', () => ({
  sendHomeClaimAdminNotice: jest.fn().mockResolvedValue(true),
  sendHomeClaimDecisionEmail: jest.fn().mockResolvedValue(true),
  sendOperatorClaimNotification: jest.fn().mockResolvedValue(true),
}));
jest.mock('@/lib/prisma', () => {
  const p: any = {
    operator: { findUnique: jest.fn() },
    assistedLivingHome: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({ id: 'home-1' }) },
    homeClaim: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), updateMany: jest.fn(), count: jest.fn() },
    entityEvent: { create: jest.fn().mockResolvedValue({ id: 'evt' }) },
    notification: { create: jest.fn().mockResolvedValue({}), createMany: jest.fn().mockResolvedValue({ count: 1 }) },
    user: { findMany: jest.fn().mockResolvedValue([{ id: 'admin-1' }]) },
  };
  p.$transaction = jest.fn(async (fn: any) => fn(p));
  return { prisma: p };
});

import { prisma } from '@/lib/prisma';
import { sendHomeClaimAdminNotice, sendHomeClaimDecisionEmail, sendOperatorClaimNotification } from '@/lib/email';
import { signClaimIntent, verifyClaimIntent, registerUrlWithIntent } from '@/lib/claims/claim-intent';
import { approveHomeClaim, listingClaimState, rejectHomeClaim, submitSelfServeClaim } from '@/lib/claims/self-serve';
import { DIRECTORY_UNCLAIMED_EMAIL } from '@/lib/claim-engine/inquiry-claim-notification';
import { POST as claimRequest } from '@/app/api/homes/[id]/claim-request/route';
import { PATCH as reviewClaim } from '@/app/api/admin/home-claims/[id]/route';

const P = prisma as any;
const SECRET = 'test-secret-self-serve-claim';
const flush = () => new Promise((r) => setImmediate(r));

const unclaimedHome = { id: 'home-1', name: 'Maple Grove', operatorId: 'op-directory', status: 'ACTIVE', operator: { user: { email: DIRECTORY_UNCLAIMED_EMAIL } } };
const claimedHome = { ...unclaimedHome, operatorId: 'op-real', operator: { user: { email: 'owner@maplegrove.test' } } };
const operator = { id: 'op-1', user: { email: 'pat@example.test', role: 'OPERATOR' } };
const pendingClaim = (over: Record<string, unknown> = {}) => ({
  id: 'claim-1', status: 'PENDING_REVIEW', homeId: 'home-1', operatorId: 'op-1', source: 'listing_button',
  home: unclaimedHome,
  operator: { id: 'op-1', userId: 'user-1', user: { email: 'pat@example.test', firstName: 'Pat', lastName: 'Lee' } },
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  P.operator.findUnique.mockResolvedValue(operator);
  P.assistedLivingHome.findUnique.mockResolvedValue(unclaimedHome);
  P.homeClaim.findFirst.mockResolvedValue(null);
  P.homeClaim.create.mockResolvedValue({ id: 'claim-1' });
  P.homeClaim.updateMany.mockResolvedValue({ count: 1 });
  P.homeClaim.findUnique.mockResolvedValue(pendingClaim());
});

describe('claim intent', () => {
  it('round-trips the home id, and is refused when tampered, signed with another secret, or older than 2 hours', () => {
    const t = signClaimIntent('home-1', SECRET);
    expect(verifyClaimIntent(t, SECRET)?.homeId).toBe('home-1');
    expect(verifyClaimIntent(t, 'other-secret')).toBeNull();
    const [data, sig] = t.split('.');
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(data!, 'base64url').toString()), homeId: 'home-2' })).toString('base64url');
    expect(verifyClaimIntent(`${forged}.${sig}`, SECRET)).toBeNull();
    expect(verifyClaimIntent(t, SECRET, Date.now() + 2 * 3600 * 1000 + 5000)).toBeNull();
    expect(verifyClaimIntent('nope', SECRET)).toBeNull();
    expect(verifyClaimIntent(t, '')).toBeNull();
    expect(registerUrlWithIntent(t)).toBe(`/auth/register?role=OPERATOR&claimIntent=${encodeURIComponent(t)}`);
  });
});

describe('submitting a claim', () => {
  it('signed in (listing button): files a PENDING_REVIEW claim, transfers nothing, emails the admin', async () => {
    expect(await submitSelfServeClaim({ homeId: 'home-1', userId: 'user-1', source: 'listing_button' })).toEqual({ ok: true, claimId: 'claim-1' });
    expect(P.homeClaim.create).toHaveBeenCalledWith({ data: { homeId: 'home-1', operatorId: 'op-1', source: 'listing_button' }, select: { id: true } });
    expect(P.assistedLivingHome.update).not.toHaveBeenCalled();
    await flush();
    expect(sendHomeClaimAdminNotice).toHaveBeenCalledWith({ homeName: 'Maple Grove', operatorEmail: 'pat@example.test', claimId: 'claim-1' });
    expect(P.notification.createMany.mock.calls[0][0].data[0]).toMatchObject({ title: 'New claim: Maple Grove by pat@example.test', link: '/admin/home-claims' });
  });

  it('one pending claim per home: a second claimant is refused, and a lost race maps to the same answer', async () => {
    P.homeClaim.findFirst.mockResolvedValue({ id: 'claim-0' });
    expect(await submitSelfServeClaim({ homeId: 'home-1', userId: 'user-2', source: 'listing_button' })).toEqual({ ok: false, reason: 'pending_exists' });
    expect(P.homeClaim.create).not.toHaveBeenCalled();
    P.homeClaim.findFirst.mockResolvedValue(null);
    P.homeClaim.create.mockRejectedValueOnce(Object.assign(new Error('unique'), { code: 'P2002' }));
    expect(await submitSelfServeClaim({ homeId: 'home-1', userId: 'user-2', source: 'listing_button' })).toEqual({ ok: false, reason: 'pending_exists' });
    expect(sendHomeClaimAdminNotice).not.toHaveBeenCalled();
  });

  it('an already-claimed listing is blocked; so is a non-operator and a missing home', async () => {
    P.assistedLivingHome.findUnique.mockResolvedValue(claimedHome);
    expect(await submitSelfServeClaim({ homeId: 'home-1', userId: 'user-1', source: 'listing_button' })).toEqual({ ok: false, reason: 'already_claimed' });
    P.assistedLivingHome.findUnique.mockResolvedValue(null);
    expect(await submitSelfServeClaim({ homeId: 'nope', userId: 'user-1', source: 'listing_button' })).toEqual({ ok: false, reason: 'home_not_found' });
    P.operator.findUnique.mockResolvedValue(null);
    expect(await submitSelfServeClaim({ homeId: 'home-1', userId: 'family-1', source: 'listing_button' })).toEqual({ ok: false, reason: 'not_operator' });
    expect(P.homeClaim.create).not.toHaveBeenCalled();
  });

  it('listingClaimState: claimed / pending / open', async () => {
    expect(await listingClaimState({ id: 'home-1', operatorEmail: 'owner@x.test' })).toBe('claimed');
    P.homeClaim.count.mockResolvedValueOnce(1);
    expect(await listingClaimState({ id: 'home-1', operatorEmail: DIRECTORY_UNCLAIMED_EMAIL })).toBe('pending');
    P.homeClaim.count.mockResolvedValueOnce(0);
    expect(await listingClaimState({ id: 'home-1', operatorEmail: DIRECTORY_UNCLAIMED_EMAIL })).toBe('open');
  });
});

describe('admin review', () => {
  it('approve runs the existing ownership transfer (operatorId + PENDING_REVIEW) and emails the operator', async () => {
    expect(await approveHomeClaim('claim-1', { userId: 'admin-1' })).toEqual({ ok: true, status: 'APPROVED' });
    expect(P.homeClaim.updateMany).toHaveBeenCalledWith({ where: { id: 'claim-1', status: 'PENDING_REVIEW' }, data: expect.objectContaining({ status: 'APPROVED', reviewedById: 'admin-1' }) });
    expect(P.assistedLivingHome.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'home-1' }, data: { operatorId: 'op-1', status: 'PENDING_REVIEW' } }));
    expect(P.notification.create.mock.calls[0][0].data).toMatchObject({ userId: 'user-1', title: 'Listing assigned to you' });
    expect(sendOperatorClaimNotification).toHaveBeenCalledTimes(1);
    await flush();
    expect(sendHomeClaimDecisionEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'pat@example.test', decision: 'approved', homeId: 'home-1' }));
  });

  it('approve refuses (and transfers nothing) when the listing got an owner meanwhile, or the claim was already decided', async () => {
    P.homeClaim.findUnique.mockResolvedValue(pendingClaim({ home: claimedHome }));
    expect(await approveHomeClaim('claim-1', { userId: 'admin-1' })).toEqual({ ok: false, reason: 'already_claimed' });
    P.homeClaim.findUnique.mockResolvedValue(pendingClaim({ status: 'REJECTED' }));
    expect(await approveHomeClaim('claim-1', { userId: 'admin-1' })).toEqual({ ok: false, reason: 'not_pending' });
    P.homeClaim.findUnique.mockResolvedValue(pendingClaim());
    P.homeClaim.updateMany.mockResolvedValue({ count: 0 }); // a double click lost the conditional update
    expect(await approveHomeClaim('claim-1', { userId: 'admin-1' })).toEqual({ ok: false, reason: 'not_pending' });
    expect(P.assistedLivingHome.update).not.toHaveBeenCalled();
  });

  it('reject transfers nothing and emails the operator politely', async () => {
    expect(await rejectHomeClaim('claim-1', { userId: 'admin-1' })).toEqual({ ok: true, status: 'REJECTED' });
    expect(P.assistedLivingHome.update).not.toHaveBeenCalled();
    expect(P.homeClaim.updateMany).toHaveBeenCalledWith({ where: { id: 'claim-1', status: 'PENDING_REVIEW' }, data: expect.objectContaining({ status: 'REJECTED' }) });
    await flush();
    expect(sendHomeClaimDecisionEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'pat@example.test', decision: 'rejected' }));
  });

  it('PATCH /api/admin/home-claims/[id] is admin only', async () => {
    const req = (action: string) => new NextRequest('http://localhost/api/admin/home-claims/claim-1', { method: 'PATCH', body: JSON.stringify({ action }) });
    const ctx = { params: Promise.resolve({ id: 'claim-1' }) };
    mockSession.mockResolvedValue({ user: { id: 'op-user', role: 'OPERATOR' } });
    expect((await reviewClaim(req('approve'), ctx)).status).toBe(403);
    mockSession.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    expect((await reviewClaim(req('maybe'), ctx)).status).toBe(400);
    const res = await reviewClaim(req('reject'), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, status: 'REJECTED' });
  });
});

describe('POST /api/homes/[id]/claim-request', () => {
  const call = (ip = '198.51.100.7') =>
    claimRequest(new NextRequest('http://localhost/api/homes/home-1/claim-request', { method: 'POST', headers: { 'x-forwarded-for': ip } }), { params: Promise.resolve({ id: 'home-1' }) });

  it('logged out → 401 with nothing filed; logged in → 201 PENDING_REVIEW; claimed → 409', async () => {
    mockSession.mockResolvedValue(null);
    const out = await call();
    expect(out.status).toBe(401);
    expect((await out.json()).reason).toBe('sign_in');
    expect(P.homeClaim.create).not.toHaveBeenCalled();

    mockSession.mockResolvedValue({ user: { id: 'user-route-1', role: 'OPERATOR' } });
    const ok = await call();
    expect(ok.status).toBe(201);
    expect(await ok.json()).toEqual({ ok: true, claimId: 'claim-1', status: 'PENDING_REVIEW' });

    P.assistedLivingHome.findUnique.mockResolvedValue(claimedHome);
    expect((await call()).status).toBe(409);
  });

  it('is rate-limited per operator (5 an hour)', async () => {
    mockSession.mockResolvedValue({ user: { id: 'user-route-rl', role: 'OPERATOR' } });
    P.homeClaim.findFirst.mockResolvedValue({ id: 'claim-0' }); // each attempt answers 409; still counts
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) statuses.push((await call('203.0.113.9')).status);
    expect(statuses.slice(0, 5).every((s) => s === 409)).toBe(true);
    expect(statuses[5]).toBe(429);
  });
});
