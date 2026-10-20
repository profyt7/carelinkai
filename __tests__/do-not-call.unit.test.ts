/**
 * OL-163e — do_not_call is honored everywhere:
 *  - the VA / AI-voice call-list CSV (expired pings) never lists a do-not-call home;
 *  - the admin ping row is never "eligible" nor "on the call list" when flagged;
 *  - the AI agent list excludes it (call-rules, covered in call-list.unit);
 *  - retry rules: declined / wants_human wait 30 days, no_answer retries next cycle.
 */

jest.mock('@/lib/prisma', () => ({ prisma: { availabilityContact: { findMany: jest.fn() } } }));
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));
jest.mock('@/lib/email', () => ({ sendAvailabilityPingEmail: jest.fn() }));

import { prisma } from '@/lib/prisma';
import { adminPingRows, callListCsv } from '@/lib/availability/ping-engine';
import { DECLINED_RETRY_DAYS, WANTS_HUMAN_RETRY_DAYS, callListDecision, callWeek } from '@/lib/availability/call-rules';

const NOW = new Date('2026-10-21T15:00:00.000Z');
const findMany = prisma.availabilityContact.findMany as jest.Mock;

const row = (over: Record<string, unknown> = {}, home: Record<string, unknown> = {}) => ({
  id: 'c1', homeId: 'h1', name: 'Pat', email: 'ops@facility.com', mobile: null, preferredChannel: 'EMAIL',
  optedIn: true, optedInAt: NOW, optedInSource: 'operator_portal', optedOutAt: null,
  home: { name: 'Facility One', doNotCall: false, availabilityCount: null, availabilityVerifiedAt: null, availabilitySource: null, address: { city: 'Westlake' }, operator: { user: { email: 'owner@facility.com' } }, ...home },
  pings: [{ id: 'p1', channel: 'EMAIL', sentAt: new Date('2026-10-01T00:00:00Z'), expiresAt: new Date('2026-10-11T00:00:00Z'), delivery: 'sent', repliedAt: null, replyRaw: null, replyVia: null, parsedCount: null, outcome: 'EXPIRED' }],
  ...over,
});

describe('OL-163e do-not-call', () => {
  it('a flagged home is neither eligible for the ping nor on the VA call list; the CSV omits it', async () => {
    findMany.mockResolvedValue([row(), row({ id: 'c2', homeId: 'h2' }, { name: 'Flagged Home', doNotCall: true })]);
    const rows = await adminPingRows(NOW);
    expect(rows.map((r) => [r.homeId, r.doNotCall, r.eligible, r.onCallList])).toEqual([
      ['h1', false, true, true],
      ['h2', true, false, false],
    ]);
    const csv = callListCsv(rows);
    expect(csv).toContain('Facility One');
    expect(csv).not.toContain('Flagged Home');
  });

  it('retry rules: declined / wants_human wait 30 days, no_answer is due next week, wrong_number never', () => {
    const week = callWeek('2026-W43', NOW)!;
    const base = { id: 'h', name: 'H', phone: '2165550100', city: 'Parma', doNotCall: false, medicaidWaiverStatus: 'UNKNOWN' as const };
    const at = (d: number) => new Date(NOW.getTime() - d * 86_400_000);
    expect(DECLINED_RETRY_DAYS).toBe(30);
    expect(WANTS_HUMAN_RETRY_DAYS).toBe(30);
    expect(callListDecision({ ...base, observations: [{ outcome: 'DECLINED', calledAt: at(29), doNotCall: false }] }, week, NOW).include).toBe(false);
    expect(callListDecision({ ...base, observations: [{ outcome: 'DECLINED', calledAt: at(30), doNotCall: false }] }, week, NOW).include).toBe(true);
    expect(callListDecision({ ...base, observations: [{ outcome: 'WANTS_HUMAN', calledAt: at(29), doNotCall: false }] }, week, NOW).include).toBe(false);
    expect(callListDecision({ ...base, observations: [{ outcome: 'NO_ANSWER', calledAt: at(8), doNotCall: false }] }, week, NOW).include).toBe(true);
    expect(callListDecision({ ...base, observations: [{ outcome: 'WRONG_NUMBER', calledAt: at(400), doNotCall: false }] }, week, NOW).include).toBe(false);
    expect(callListDecision({ ...base, doNotCall: true, observations: [] }, week, NOW)).toEqual({ include: false, reason: 'do_not_call' });
  });
});
