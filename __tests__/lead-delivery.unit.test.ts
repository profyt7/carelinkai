/**
 * feat/demand-first-admin-metric — the demand-first North Star.
 *
 * These pin the definition of a "qualified lead delivered to an operator":
 * the 5-part bar, the dedupe identity, the source→bar mappings, and the
 * windowed distinct count. The metric is decoupled from claims by design, so
 * the concierge/unclaimed mappings are pinned too.
 */

import { jest } from '@jest/globals';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    leadDelivery: { findMany: jest.fn(), upsert: jest.fn() },
    leadConsent: { findFirst: jest.fn() },
  },
}));

import {
  assessQualification,
  leadKeyFor,
  qualificationFromInquiry,
  qualificationFromConcierge,
  hasConsumerConsent,
  leadDeliveryWindows,
  countQualifiedLeadsDelivered,
} from '@/lib/leads/lead-delivery';
import { prisma } from '@/lib/prisma';

const p = prisma as any;
// resetAllMocks (not clearAllMocks) so any queued mockResolvedValueOnce is
// drained between tests — otherwise a leftover "once" leaks into the next test.
afterEach(() => jest.resetAllMocks());

describe('assessQualification — the 5-part bar', () => {
  const full = { hasContact: true, hasCareNeed: true, hasQualifyingFacts: true, hasConsent: true };

  it('qualifies only when all four inputs hold (routed is implicit)', () => {
    expect(assessQualification(full).qualified).toBe(true);
  });

  it('fails if ANY single criterion is missing', () => {
    for (const k of ['hasContact', 'hasCareNeed', 'hasQualifyingFacts', 'hasConsent'] as const) {
      const partial = { ...full, [k]: false };
      expect(assessQualification(partial).qualified).toBe(false);
    }
  });

  it('treats undefined as false (never accidentally qualifies)', () => {
    const q = assessQualification({});
    expect(q).toEqual({
      hasContact: false, hasCareNeed: false, hasQualifyingFacts: false, hasConsent: false, qualified: false,
    });
  });
});

describe('leadKeyFor — one lead counts once across facilities', () => {
  it('CONCIERGE keys on the placement search (one patient search = one lead)', () => {
    expect(leadKeyFor({ source: 'CONCIERGE', placementSearchId: 'ps1', familyId: 'famX' })).toBe('ps:ps1');
  });
  it('prefers the family account when present', () => {
    expect(leadKeyFor({ source: 'INQUIRY', familyId: 'fam1', contactEmail: 'a@b.com' })).toBe('fam:fam1');
  });
  it('normalizes email (case + whitespace)', () => {
    expect(leadKeyFor({ source: 'INQUIRY', contactEmail: '  Jane@Example.COM ' })).toBe('email:jane@example.com');
  });
  it('falls back to digits-only phone', () => {
    expect(leadKeyFor({ source: 'INQUIRY', contactPhone: '(216) 555-0134' })).toBe('phone:2165550134');
  });
  it('CONCIERGE without a search id falls through to the next identity', () => {
    expect(leadKeyFor({ source: 'CONCIERGE', familyId: 'fam9' })).toBe('fam:fam9');
  });
});

describe('qualificationFromInquiry — consumer path', () => {
  const base = {
    contactName: 'Jane', contactEmail: 'jane@x.com', contactPhone: null,
    careNeeds: ['memory care'], urgency: 'HIGH', payerSource: 'PRIVATE_FUNDS',
  };
  it('all facts + consent → fully qualified', () => {
    expect(qualificationFromInquiry(base, true)).toEqual({
      hasContact: true, hasCareNeed: true, hasQualifyingFacts: true, hasConsent: true,
    });
  });
  it('#3 keys on the payer tag (OL-114)', () => {
    expect(qualificationFromInquiry({ ...base, payerSource: null }, true).hasQualifyingFacts).toBe(false);
  });
  it('contact needs a name AND a channel', () => {
    expect(qualificationFromInquiry({ ...base, contactEmail: null, contactPhone: null }, true).hasContact).toBe(false);
  });
  it('consent is passed through (not inferred)', () => {
    expect(qualificationFromInquiry(base, false).hasConsent).toBe(false);
  });
});

describe('qualificationFromConcierge — DP path is claim-agnostic', () => {
  it('DP is the contact; consent is the professional regime (true)', () => {
    const q = qualificationFromConcierge({
      payerSource: 'MEDICAID_WAIVER', dpEmail: 'dp@hosp.org', timeline: 'this week', careNeeds: 'ADL help',
    });
    expect(q).toEqual({ hasContact: true, hasCareNeed: true, hasQualifyingFacts: true, hasConsent: true });
  });
  it('still needs qualifying facts (payer) to fully qualify', () => {
    expect(qualificationFromConcierge({ dpEmail: 'dp@h.org', timeline: 'now' }).hasQualifyingFacts).toBe(false);
  });
});

describe('hasConsumerConsent', () => {
  it('true when a granted consent row references the inquiry', async () => {
    p.leadConsent.findFirst.mockResolvedValueOnce({ id: 'c1' });
    expect(await hasConsumerConsent('inq1', null)).toBe(true);
  });
  it('falls back to an email match (case-insensitive query)', async () => {
    // No inquiryId → only the email lookup runs.
    p.leadConsent.findFirst.mockResolvedValueOnce({ id: 'c2' });
    expect(await hasConsumerConsent(null, 'Jane@x.com')).toBe(true);
    expect(p.leadConsent.findFirst.mock.calls[0][0].where.contactEmail).toEqual({ equals: 'Jane@x.com', mode: 'insensitive' });
  });
  it('false (never throws) on no match', async () => {
    p.leadConsent.findFirst.mockResolvedValue(null);
    expect(await hasConsumerConsent('inq1', 'x@y.com')).toBe(false);
  });
});

describe('leadDeliveryWindows', () => {
  it('rolling 7/14-day windows + month-to-date', () => {
    const now = new Date('2026-07-13T12:00:00Z');
    const w = leadDeliveryWindows(now);
    expect(w.weekStart.toISOString()).toBe('2026-07-06T12:00:00.000Z');
    expect(w.prevWeekStart.toISOString()).toBe('2026-06-29T12:00:00.000Z');
    expect(w.monthStart.getDate()).toBe(1);
    expect(w.monthStart.getMonth()).toBe(6); // July (0-indexed)
  });
});

describe('countQualifiedLeadsDelivered', () => {
  it('counts distinct leadKeys, filters demo by default, only qualified', async () => {
    p.leadDelivery.findMany.mockResolvedValue([{ leadKey: 'fam:1' }, { leadKey: 'ps:2' }]);
    const res = await countQualifiedLeadsDelivered({ showDemo: false, now: new Date('2026-07-13T00:00:00Z') });

    expect(res).toEqual({ thisWeek: 2, lastWeek: 2, mtd: 2 });
    const call = p.leadDelivery.findMany.mock.calls[0][0];
    expect(call.where.qualified).toBe(true);
    expect(call.where.facility).toEqual({ isDemo: false });
    expect(call.distinct).toEqual(['leadKey']);
  });

  it('showDemo=true removes the facility filter', async () => {
    p.leadDelivery.findMany.mockResolvedValue([]);
    await countQualifiedLeadsDelivered({ showDemo: true, now: new Date('2026-07-13T00:00:00Z') });
    for (const c of p.leadDelivery.findMany.mock.calls) {
      expect(c[0].where.facility).toBeUndefined();
    }
  });
});
