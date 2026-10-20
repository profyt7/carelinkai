/**
 * OL-163b — AI agent call list:
 *  - week window: ISO week / date / default, Monday→Monday UTC, ISO label;
 *  - decision rules: do_not_call (flag or observation), wrong_number, declined
 *    < 30 d, wants_human < 30 d, attempted this week, no phone; E.164 phone;
 *    directory + waiver tagging; retry countdown;
 *  - route: 403 for non-admin, JSON rows + exclusion counts, CSV header/rows,
 *    400 on a bad week.
 */

import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';

jest.mock('@/lib/prisma', () => ({ prisma: { assistedLivingHome: { findMany: jest.fn() } } }));
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));
const requireRole = jest.fn();
jest.mock('@/lib/auth-utils', () => ({ requireRole: (...a: unknown[]) => requireRole(...a) }));

import { prisma } from '@/lib/prisma';
import {
  DECLINED_RETRY_DAYS,
  callListCsv,
  callListDecision,
  callWeek,
  isoWeekLabel,
  retryAfterDays,
  type CallCandidateHome,
} from '@/lib/availability/call-rules';
import { GET } from '@/app/api/admin/availability/call-list/route';

const NOW = new Date('2026-10-21T15:00:00.000Z'); // Wed of ISO week 43
const findMany = (prisma as any).assistedLivingHome.findMany as jest.Mock;

const home = (over: Partial<CallCandidateHome> = {}): CallCandidateHome => ({
  id: 'h1',
  name: 'Maple Grove',
  phone: '(216) 555-0100',
  city: 'Westlake',
  doNotCall: false,
  medicaidWaiverStatus: 'UNKNOWN',
  observations: [],
  ...over,
});
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

describe('callWeek', () => {
  it('resolves an ISO week, a date and the default to a Monday→Monday UTC window', () => {
    const w = callWeek('2026-W43', NOW)!;
    expect(w.start.toISOString()).toBe('2026-10-19T00:00:00.000Z');
    expect(w.end.toISOString()).toBe('2026-10-26T00:00:00.000Z');
    expect(w.label).toBe('2026-W43');
    expect(callWeek('2026-10-25', NOW)!.label).toBe('2026-W43');
    expect(callWeek('', NOW)!.label).toBe('2026-W43');
    expect(callWeek(null, NOW)!.start.toISOString()).toBe('2026-10-19T00:00:00.000Z');
    expect(callWeek('2026-W01', NOW)!.start.toISOString()).toBe('2025-12-29T00:00:00.000Z');
    expect(isoWeekLabel(new Date('2027-01-01T00:00:00Z'))).toBe('2026-W53');
  });
  it('rejects garbage', () => {
    expect(callWeek('nope', NOW)).toBeNull();
    expect(callWeek('2026-W60', NOW)).toBeNull();
  });
});

describe('callListDecision', () => {
  const week = callWeek('2026-W43', NOW)!;
  it('includes a listing with a phone, in E.164, tagged directory (+ waiver when on the WRAAA list)', () => {
    const d = callListDecision(home(), week, NOW);
    expect(d).toEqual({ include: true, row: { homeId: 'h1', name: 'Maple Grove', phone: '+12165550100', city: 'Westlake', reasons: ['directory'] } });
    const w = callListDecision(home({ medicaidWaiverStatus: 'CURRENT_RESIDENTS_ONLY' }), week, NOW);
    expect(w.include && w.row.reasons).toEqual(['directory', 'waiver']);
  });
  it('excludes do_not_call (home flag or any observation) and wrong_number forever', () => {
    expect(callListDecision(home({ doNotCall: true }), week, NOW)).toEqual({ include: false, reason: 'do_not_call' });
    expect(callListDecision(home({ observations: [{ outcome: 'ANSWERED', calledAt: daysAgo(40), doNotCall: true }] }), week, NOW)).toEqual({ include: false, reason: 'do_not_call' });
    expect(callListDecision(home({ observations: [{ outcome: 'WRONG_NUMBER', calledAt: daysAgo(200), doNotCall: false }] }), week, NOW)).toEqual({ include: false, reason: 'wrong_number' });
  });
  it('declined / wants_human wait 30 days; no_answer retries next cycle; one attempt per week', () => {
    expect(callListDecision(home({ observations: [{ outcome: 'DECLINED', calledAt: daysAgo(29), doNotCall: false }] }), week, NOW)).toEqual({ include: false, reason: 'declined_recently' });
    expect(callListDecision(home({ observations: [{ outcome: 'DECLINED', calledAt: daysAgo(31), doNotCall: false }] }), week, NOW).include).toBe(true);
    expect(callListDecision(home({ observations: [{ outcome: 'WANTS_HUMAN', calledAt: daysAgo(10), doNotCall: false }] }), week, NOW)).toEqual({ include: false, reason: 'wants_human' });
    // no_answer last week → due again this week; no_answer this week → already attempted.
    expect(callListDecision(home({ observations: [{ outcome: 'NO_ANSWER', calledAt: daysAgo(7), doNotCall: false }] }), week, NOW).include).toBe(true);
    expect(callListDecision(home({ observations: [{ outcome: 'NO_ANSWER', calledAt: daysAgo(1), doNotCall: false }] }), week, NOW)).toEqual({ include: false, reason: 'attempted_this_week' });
    expect(callListDecision(home({ observations: [{ outcome: 'ANSWERED', calledAt: daysAgo(2), doNotCall: false }] }), week, NOW)).toEqual({ include: false, reason: 'attempted_this_week' });
  });
  it('needs a US phone', () => {
    expect(callListDecision(home({ phone: null }), week, NOW)).toEqual({ include: false, reason: 'no_phone' });
    expect(callListDecision(home({ phone: '555-01' }), week, NOW)).toEqual({ include: false, reason: 'no_phone' });
  });
  it('retryAfterDays counts down from the declined / wants-human call', () => {
    expect(retryAfterDays('DECLINED', daysAgo(10), NOW)).toBe(DECLINED_RETRY_DAYS - 10);
    expect(retryAfterDays('DECLINED', daysAgo(31), NOW)).toBe(0);
    expect(retryAfterDays('NO_ANSWER', daysAgo(1), NOW)).toBe(0);
  });
  it('CSV is homeId,name,phone,city with quoting', () => {
    expect(callListCsv([{ homeId: 'h1', name: 'Maple, Grove', phone: '+12165550100', city: 'Westlake', reasons: ['directory'] }])).toBe('homeId,name,phone,city\nh1,"Maple, Grove",+12165550100,Westlake\n');
  });
});

describe('GET /api/admin/availability/call-list', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireRole.mockResolvedValue({ id: 'admin', role: 'ADMIN' });
    findMany.mockResolvedValue([
      { id: 'h1', name: 'Maple Grove', phone: '216-555-0100', doNotCall: false, medicaidWaiverStatus: 'ACCEPTING_NEW', address: { city: 'Westlake' }, availabilityObservations: [] },
      { id: 'h2', name: 'Dover Center', phone: '216-555-0101', doNotCall: true, medicaidWaiverStatus: 'UNKNOWN', address: { city: 'Westlake' }, availabilityObservations: [] },
      { id: 'h3', name: 'No Phone Home', phone: null, doNotCall: false, medicaidWaiverStatus: 'UNKNOWN', address: { city: 'Parma' }, availabilityObservations: [] },
      { id: 'h4', name: 'Declined Home', phone: '216-555-0104', doNotCall: false, medicaidWaiverStatus: 'UNKNOWN', address: null, availabilityObservations: [{ outcome: 'DECLINED', calledAt: new Date(Date.now() - 5 * 86_400_000), doNotCall: false }] },
    ]);
  });
  const get = (qs = '') => GET(new NextRequest(`http://localhost/api/admin/availability/call-list${qs}`));

  it('is admin-only', async () => {
    requireRole.mockRejectedValueOnce(new Error('nope'));
    expect((await get()).status).toBe(403);
    expect(findMany).not.toHaveBeenCalled();
  });
  it('JSON: rows minus the excluded, with counts, week and call window', async () => {
    const res = await get('?week=2026-W43');
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.week).toMatchObject({ label: '2026-W43', start: '2026-10-19T00:00:00.000Z' });
    expect(j.callWindow.days).toEqual(['Tue', 'Wed', 'Thu']);
    expect(j.rows).toEqual([{ homeId: 'h1', name: 'Maple Grove', phone: '+12165550100', city: 'Westlake', reasons: ['directory', 'waiver'] }]);
    expect(j).toMatchObject({ candidates: 4, count: 1, excluded: { do_not_call: 1, no_phone: 1, declined_recently: 1, wrong_number: 0, wants_human: 0, attempted_this_week: 0 } });
    // Only ACTIVE non-demo listings or WRAAA-list homes are candidates; observations limited to the lookback.
    const where = findMany.mock.calls[0][0].where;
    expect(where.isDemo).toBe(false);
    expect(where.OR).toEqual([{ status: 'ACTIVE' }, { medicaidWaiverStatus: { in: ['ACCEPTING_NEW', 'CURRENT_RESIDENTS_ONLY', 'NOT_ACCEPTING_REFERRALS'] } }]);
  });
  it('CSV: header + one line per callable home, as an attachment', async () => {
    const res = await get('?week=2026-W43&format=csv');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/csv');
    expect(res.headers.get('content-disposition')).toContain('availability-call-list-2026-W43.csv');
    expect(await res.text()).toBe('homeId,name,phone,city\nh1,Maple Grove,+12165550100,Westlake\n');
  });
  it('400 on a bad week', async () => {
    expect((await get('?week=garbage')).status).toBe(400);
  });
});
