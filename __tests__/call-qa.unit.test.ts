/**
 * OL-163c — call QA queue:
 *  - approve an answered call → home.availabilityCount = AL + MC,
 *    availabilityVerifiedAt = calledAt, source AI_CALL, waiver + pending
 *    applied with source AI_CALL (never over a protected source), history rows;
 *  - approve a declined / no-answer call → reviewed, nothing written to the home;
 *  - correct → the edited values are what gets applied and stored;
 *  - reject → observation closed, home untouched;
 *  - do_not_call → home flagged (ADMIN), observation rejected;
 *  - already reviewed → 409; route is admin-only.
 */

import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';

jest.mock('@/lib/prisma', () => {
  const p: any = {
    availabilityObservation: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn(), groupBy: jest.fn() },
    assistedLivingHome: { update: jest.fn() },
    entityEvent: { create: jest.fn().mockResolvedValue({ id: 'evt' }) },
  };
  p.$transaction = jest.fn(async (arg: unknown) => (typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(p) : Promise.all(arg as Promise<unknown>[])));
  return { prisma: p };
});
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));
const requireRole = jest.fn();
jest.mock('@/lib/auth-utils', () => ({ requireRole: (...a: unknown[]) => requireRole(...a) }));

import { prisma } from '@/lib/prisma';
import { applyQaAction, verifiedCount } from '@/lib/availability/call-qa';
import { GET, POST } from '@/app/api/admin/call-qa/route';

const obsFind = (prisma as any).availabilityObservation.findUnique as jest.Mock;
const obsUpdate = (prisma as any).availabilityObservation.update as jest.Mock;
const homeUpdate = (prisma as any).assistedLivingHome.update as jest.Mock;
const evtCreate = (prisma as any).entityEvent.create as jest.Mock;

const CALLED_AT = new Date('2026-10-21T15:05:00.000Z');
const NOW = new Date('2026-10-21T18:00:00.000Z');
const actor = { userId: 'admin_1', role: 'ADMIN' };

const observation = (over: Record<string, unknown> = {}, home: Record<string, unknown> = {}) => ({
  id: 'obs_1',
  homeId: 'home_1',
  conversationId: 'conv_1',
  agentId: 'agent_x',
  calledAt: CALLED_AT,
  durationSecs: 90,
  outcome: 'ANSWERED',
  bedsAL: 2,
  bedsMC: 1,
  priceFromMonthly: 4200,
  priceUndisclosed: false,
  waiverStatus: 'CURRENT_ONLY',
  medicaidPending: 'YES',
  doNotCall: false,
  contactRole: 'admissions',
  notes: null,
  transcriptUrl: 't',
  recordingUrl: 'r',
  transcript: [{ role: 'user', message: 'two and one' }],
  confidence: 0.9,
  qaStatus: 'PENDING',
  qaByUserId: null,
  qaAt: null,
  qaNote: null,
  corrections: null,
  appliedAt: null,
  home: {
    name: 'Maple Grove',
    phone: '+12165550100',
    doNotCall: false,
    availabilityCount: null,
    availabilityVerifiedAt: null,
    availabilitySource: null,
    medicaidWaiverStatus: 'UNKNOWN',
    medicaidWaiverSource: null,
    medicaidPendingAccepted: null,
    address: { city: 'Westlake' },
    ...home,
  },
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  obsUpdate.mockImplementation(async (args: any) => ({ ...observation(), ...args.data, qaStatus: args.data.qaStatus }));
  homeUpdate.mockResolvedValue({});
});

describe('verifiedCount', () => {
  it('sums AL + MC, null when neither was given', () => {
    expect(verifiedCount({ bedsAL: 2, bedsMC: 1 })).toBe(3);
    expect(verifiedCount({ bedsAL: null, bedsMC: 4 })).toBe(4);
    expect(verifiedCount({ bedsAL: 0, bedsMC: null })).toBe(0);
    expect(verifiedCount({ bedsAL: null, bedsMC: null })).toBeNull();
  });
});

describe('applyQaAction', () => {
  it('approve (answered) → availability verified at calledAt, source AI_CALL; waiver + pending applied; events written', async () => {
    obsFind.mockResolvedValue(observation());
    const r = await applyQaAction({ id: 'obs_1', action: 'approve', actor, now: NOW });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.applied).toEqual({ availability: true, waiver: true, pending: true, doNotCall: false });
    expect(r.skipped).toEqual([]);
    expect(homeUpdate).toHaveBeenCalledTimes(1);
    expect(homeUpdate.mock.calls[0][0]).toEqual({
      where: { id: 'home_1' },
      data: {
        availabilityCount: 3,
        availabilityVerifiedAt: CALLED_AT,
        availabilitySource: 'AI_CALL',
        medicaidWaiverStatus: 'CURRENT_RESIDENTS_ONLY',
        medicaidWaiverSource: 'AI_CALL',
        medicaidWaiverVerifiedAt: CALLED_AT,
        medicaidPendingAccepted: true,
        medicaidPendingAcceptedSource: 'AI_CALL',
        medicaidPendingAcceptedVerifiedAt: CALLED_AT,
      },
    });
    expect(obsUpdate.mock.calls[0][0].data).toMatchObject({ qaStatus: 'APPROVED', qaByUserId: 'admin_1', qaAt: NOW, appliedAt: NOW });
    const types = evtCreate.mock.calls.map((c: any) => `${c[0].data.eventType}:${c[0].data.source}`);
    expect(types).toEqual(['availability.updated:AI_CALL', 'acceptance.updated:AI_CALL', 'acceptance.updated:AI_CALL', 'call.qa:ADMIN']);
    expect(evtCreate.mock.calls[0][0].data.newValue).toMatchObject({ count: 3, source: 'AI_CALL', observationId: 'obs_1' });
  });

  it('never overwrites a protected waiver source (VA_CALL / OPERATOR / ADMIN); unknown answers write nothing', async () => {
    obsFind.mockResolvedValue(observation({ medicaidPending: 'CASE_BY_CASE' }, { medicaidWaiverSource: 'VA_CALL', medicaidWaiverStatus: 'ACCEPTING_NEW' }));
    const r = await applyQaAction({ id: 'obs_1', action: 'approve', actor, now: NOW });
    expect(r.ok && r.applied).toEqual({ availability: true, waiver: false, pending: false, doNotCall: false });
    expect(r.ok && r.skipped).toEqual(['waiver_protected_source']);
    const data = homeUpdate.mock.calls[0][0].data;
    expect(data.medicaidWaiverStatus).toBeUndefined();
    expect(data.medicaidPendingAccepted).toBeUndefined();
    expect(data).toMatchObject({ availabilityCount: 3, availabilitySource: 'AI_CALL' });
  });

  it('approve of a declined / no-answer call reviews it but verifies nothing', async () => {
    obsFind.mockResolvedValue(observation({ outcome: 'DECLINED', bedsAL: null, bedsMC: null }));
    const r = await applyQaAction({ id: 'obs_1', action: 'approve', actor, now: NOW });
    expect(r.ok && r.applied).toEqual({ availability: false, waiver: false, pending: false, doNotCall: false });
    expect(r.ok && r.skipped).toEqual(['outcome_declined_not_verifiable']);
    expect(homeUpdate).not.toHaveBeenCalled();
    expect(obsUpdate.mock.calls[0][0].data).toMatchObject({ qaStatus: 'APPROVED', appliedAt: null });
    expect(evtCreate.mock.calls.map((c: any) => c[0].data.eventType)).toEqual(['call.qa']);
  });

  it('correct → the edited values are applied to the home and stored on the observation', async () => {
    obsFind.mockResolvedValue(observation());
    const r = await applyQaAction({ id: 'obs_1', action: 'correct', corrections: { bedsAL: 0, bedsMC: 2, waiverStatus: 'NO', medicaidPending: 'NO', priceUndisclosed: true, priceFromMonthly: null }, note: ' heard two MC only ', actor, now: NOW });
    expect(r.ok && r.applied).toEqual({ availability: true, waiver: true, pending: true, doNotCall: false });
    expect(homeUpdate.mock.calls[0][0].data).toMatchObject({ availabilityCount: 2, medicaidWaiverStatus: 'NOT_ACCEPTING_REFERRALS', medicaidPendingAccepted: false });
    const d = obsUpdate.mock.calls[0][0].data;
    expect(d).toMatchObject({ qaStatus: 'CORRECTED', bedsAL: 0, bedsMC: 2, waiverStatus: 'NO', medicaidPending: 'NO', priceUndisclosed: true, priceFromMonthly: null, qaNote: 'heard two MC only' });
    expect(d.corrections).toEqual({ bedsAL: 0, bedsMC: 2, waiverStatus: 'NO', medicaidPending: 'NO', priceUndisclosed: true, priceFromMonthly: null });
  });

  it('reject → closed, home untouched', async () => {
    obsFind.mockResolvedValue(observation());
    const r = await applyQaAction({ id: 'obs_1', action: 'reject', note: 'bad line', actor, now: NOW });
    expect(r.ok && r.applied).toEqual({ availability: false, waiver: false, pending: false, doNotCall: false });
    expect(homeUpdate).not.toHaveBeenCalled();
    expect(obsUpdate.mock.calls[0][0].data).toMatchObject({ qaStatus: 'REJECTED', qaNote: 'bad line', appliedAt: null });
  });

  it('do_not_call → home flagged by ADMIN with a history row, observation rejected, nothing verified', async () => {
    obsFind.mockResolvedValue(observation());
    const r = await applyQaAction({ id: 'obs_1', action: 'do_not_call', actor, now: NOW });
    expect(r.ok && r.applied).toEqual({ availability: false, waiver: false, pending: false, doNotCall: true });
    expect(homeUpdate.mock.calls[0][0].data).toEqual({ doNotCall: true, doNotCallAt: NOW, doNotCallSource: 'ADMIN' });
    expect(obsUpdate.mock.calls[0][0].data).toMatchObject({ qaStatus: 'REJECTED', doNotCall: true });
    expect(evtCreate.mock.calls.map((c: any) => c[0].data.eventType)).toEqual(['home.do_not_call', 'call.qa']);
  });

  it('a call that itself captured do-not-call is never applied, even on approve', async () => {
    obsFind.mockResolvedValue(observation({ doNotCall: true }));
    const r = await applyQaAction({ id: 'obs_1', action: 'approve', actor, now: NOW });
    expect(r.ok && r.applied).toEqual({ availability: false, waiver: false, pending: false, doNotCall: true });
    expect(homeUpdate.mock.calls[0][0].data).toEqual({ doNotCall: true, doNotCallAt: NOW, doNotCallSource: 'ADMIN' });
  });

  it('not found / already reviewed', async () => {
    obsFind.mockResolvedValue(null);
    expect(await applyQaAction({ id: 'x', action: 'approve', actor })).toEqual({ ok: false, error: 'not_found' });
    obsFind.mockResolvedValue(observation({ qaStatus: 'APPROVED' }));
    expect(await applyQaAction({ id: 'obs_1', action: 'approve', actor })).toEqual({ ok: false, error: 'already_reviewed' });
    expect(homeUpdate).not.toHaveBeenCalled();
  });
});

describe('/api/admin/call-qa', () => {
  const findMany = (prisma as any).availabilityObservation.findMany as jest.Mock;
  const groupBy = (prisma as any).availabilityObservation.groupBy as jest.Mock;
  beforeEach(() => {
    requireRole.mockResolvedValue({ id: 'admin_1', role: 'ADMIN' });
    findMany.mockResolvedValue([observation()]);
    groupBy.mockResolvedValue([{ qaStatus: 'PENDING', _count: { _all: 1 } }, { qaStatus: 'REJECTED', _count: { _all: 2 } }]);
    obsFind.mockResolvedValue(observation());
  });
  const post = (body: unknown) => POST(new NextRequest('http://localhost/api/admin/call-qa', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }));

  it('is admin-only', async () => {
    requireRole.mockRejectedValue(new Error('nope'));
    expect((await GET(new NextRequest('http://localhost/api/admin/call-qa'))).status).toBe(403);
    expect((await post({ id: 'obs_1', action: 'approve' })).status).toBe(403);
    expect(homeUpdate).not.toHaveBeenCalled();
  });
  it('GET lists pending by default with counts; validates status', async () => {
    const res = await GET(new NextRequest('http://localhost/api/admin/call-qa'));
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.rows).toHaveLength(1);
    expect(j.counts).toEqual({ pending: 1, approved: 0, corrected: 0, rejected: 2 });
    expect(findMany.mock.calls[0][0].where).toEqual({ qaStatus: 'PENDING' });
    expect((await GET(new NextRequest('http://localhost/api/admin/call-qa?status=bogus'))).status).toBe(400);
  });
  it('POST validates, applies, and maps not_found / already_reviewed to 404 / 409', async () => {
    expect((await post({ id: 'obs_1', action: 'explode' })).status).toBe(400);
    const ok = await post({ id: 'obs_1', action: 'approve', note: 'fine' });
    expect(ok.status).toBe(200);
    expect((await ok.json()).applied.availability).toBe(true);
    obsFind.mockResolvedValue(null);
    expect((await post({ id: 'nope', action: 'approve' })).status).toBe(404);
    obsFind.mockResolvedValue(observation({ qaStatus: 'REJECTED' }));
    expect((await post({ id: 'obs_1', action: 'approve' })).status).toBe(409);
  });
});
