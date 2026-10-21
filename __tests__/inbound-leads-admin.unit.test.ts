/**
 * OL-167c — admin inbound-leads: filters, status transitions, the per-day
 * PLANNER count, and the two routes (admin-gated; PATCH 404 / 409 / 200).
 */

import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';

const requireRole = jest.fn();
jest.mock('@/lib/auth-utils', () => ({ requireRole: (...a: unknown[]) => requireRole(...a) }));
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    inboundLead: { findMany: jest.fn(), groupBy: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  },
}));

import { prisma } from '@/lib/prisma';
import { leadWhere, nextLeadState, parseCallerTypeFilter, parseStatusFilter } from '@/lib/leads/inbound-lead-admin';
import { plannerLeadsPerDay, toBusinessDay } from '@/lib/leads/inbound-lead-daily';
import { computeConciergeMetrics } from '@/lib/concierge/metrics';
import { GET } from '@/app/api/admin/inbound-leads/route';
import { PATCH } from '@/app/api/admin/inbound-leads/[id]/route';

const p = prisma as any;

beforeEach(() => {
  jest.clearAllMocks();
  requireRole.mockResolvedValue({ id: 'admin', role: 'ADMIN' });
});

describe('filters', () => {
  it('status: default open; new/contacted/closed/all; junk → null', () => {
    expect(parseStatusFilter(null)).toBe('OPEN');
    expect(parseStatusFilter('new')).toBe('NEW');
    expect(parseStatusFilter('Closed')).toBe('CLOSED');
    expect(parseStatusFilter('all')).toBe('ALL');
    expect(parseStatusFilter('bogus')).toBeNull();
  });
  it('callerType: default all; planner/family/facility/other; junk → null', () => {
    expect(parseCallerTypeFilter(undefined)).toBe('ALL');
    expect(parseCallerTypeFilter('planner')).toBe('PLANNER');
    expect(parseCallerTypeFilter('x')).toBeNull();
  });
  it('where: open = NEW+CONTACTED, all = no status clause, type narrows', () => {
    expect(leadWhere('OPEN', 'ALL')).toEqual({ status: { in: ['NEW', 'CONTACTED'] } });
    expect(leadWhere('ALL', 'PLANNER')).toEqual({ callerType: 'PLANNER' });
    expect(leadWhere('CLOSED', 'FAMILY')).toEqual({ status: 'CLOSED', callerType: 'FAMILY' });
  });
});

describe('nextLeadState', () => {
  const now = new Date('2026-10-21T15:00:00Z');
  it('contacted: only from NEW; sets contactedAt', () => {
    expect(nextLeadState({ status: 'NEW', contactedAt: null, closedAt: null }, 'contacted', now)).toEqual({ status: 'CONTACTED', contactedAt: now });
    expect(nextLeadState({ status: 'CONTACTED', contactedAt: now, closedAt: null }, 'contacted', now)).toBeNull();
    expect(nextLeadState({ status: 'CLOSED', contactedAt: null, closedAt: now }, 'contacted', now)).toBeNull();
  });
  it('close: from NEW or CONTACTED, never twice; leaves contactedAt alone', () => {
    expect(nextLeadState({ status: 'NEW', contactedAt: null, closedAt: null }, 'close', now)).toEqual({ status: 'CLOSED', closedAt: now });
    expect(nextLeadState({ status: 'CONTACTED', contactedAt: now, closedAt: null }, 'close', now)).toEqual({ status: 'CLOSED', closedAt: now });
    expect(nextLeadState({ status: 'CLOSED', contactedAt: null, closedAt: now }, 'close', now)).toBeNull();
  });
});

describe('plannerLeadsPerDay', () => {
  const now = new Date('2026-10-21T20:00:00Z'); // 16:00 America/New_York
  it('buckets by America/New_York calendar day, zero-filled, oldest first, window only', () => {
    const r = plannerLeadsPerDay(
      [
        '2026-10-21T13:00:00Z', // today
        '2026-10-21T03:30:00Z', // 23:30 on Oct 20 in New York
        '2026-10-15T12:00:00Z',
        '2026-09-01T12:00:00Z', // outside the window
      ],
      now,
    );
    expect(r.days).toHaveLength(14);
    expect(r.days[0]?.date).toBe('2026-10-08');
    expect(r.days[13]).toEqual({ date: '2026-10-21', count: 1 });
    expect(r.days.find((d) => d.date === '2026-10-20')).toEqual({ date: '2026-10-20', count: 1 });
    expect(r.days.find((d) => d.date === '2026-10-15')?.count).toBe(1);
    expect(r.total).toBe(3);
    expect(toBusinessDay('2026-10-21T03:30:00Z')).toBe('2026-10-20');
  });
  it('rides on the concierge metrics payload (empty by default)', () => {
    const m = computeConciergeMetrics([], now);
    expect(m.plannerLeads.total).toBe(0);
    expect(m.plannerLeads.days).toHaveLength(14);
    expect(computeConciergeMetrics([], now, ['2026-10-21T13:00:00Z']).plannerLeads.total).toBe(1);
  });
});

describe('GET /api/admin/inbound-leads', () => {
  const req = (qs = '') => new NextRequest(`http://localhost/api/admin/inbound-leads${qs}`);
  it('403 for non-admin', async () => {
    requireRole.mockRejectedValueOnce(new Error('nope'));
    expect((await GET(req())).status).toBe(403);
  });
  it('400 on a bad filter', async () => {
    expect((await GET(req('?status=weird'))).status).toBe(400);
    expect((await GET(req('?callerType=weird'))).status).toBe(400);
  });
  it('200 with rows + counts; filters reach the query', async () => {
    p.inboundLead.findMany.mockResolvedValue([{ id: 'l1', status: 'NEW', callerType: 'PLANNER' }]);
    p.inboundLead.groupBy.mockResolvedValue([{ status: 'NEW', _count: { _all: 1 } }, { status: 'CLOSED', _count: { _all: 2 } }]);
    const r = await GET(req('?status=new&callerType=planner'));
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j.rows).toHaveLength(1);
    expect(j.counts).toEqual({ new: 1, contacted: 0, closed: 2 });
    expect(p.inboundLead.findMany.mock.calls[0][0].where).toEqual({ status: 'NEW', callerType: 'PLANNER' });
  });
});

describe('PATCH /api/admin/inbound-leads/[id]', () => {
  const req = (body: unknown) => new NextRequest('http://localhost/api/admin/inbound-leads/l1', { method: 'PATCH', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });
  const ctx = { params: { id: 'l1' } };
  it('403 non-admin, 400 bad action, 404 unknown id', async () => {
    requireRole.mockRejectedValueOnce(new Error('nope'));
    expect((await PATCH(req({ action: 'close' }), ctx)).status).toBe(403);
    expect((await PATCH(req({ action: 'nuke' }), ctx)).status).toBe(400);
    p.inboundLead.findUnique.mockResolvedValueOnce(null);
    expect((await PATCH(req({ action: 'close' }), ctx)).status).toBe(404);
  });
  it('contacted on a NEW lead → 200 with contactedAt; again → 409', async () => {
    p.inboundLead.findUnique.mockResolvedValueOnce({ status: 'NEW', contactedAt: null, closedAt: null });
    p.inboundLead.update.mockImplementation(async (args: any) => ({ id: 'l1', ...args.data }));
    const r = await PATCH(req({ action: 'contacted' }), ctx);
    expect(r.status).toBe(200);
    expect((await r.json()).lead.status).toBe('CONTACTED');
    expect(p.inboundLead.update.mock.calls[0][0].data.contactedAt).toBeInstanceOf(Date);
    p.inboundLead.findUnique.mockResolvedValueOnce({ status: 'CONTACTED', contactedAt: new Date(), closedAt: null });
    expect((await PATCH(req({ action: 'contacted' }), ctx)).status).toBe(409);
  });
  it('close sets closedAt', async () => {
    p.inboundLead.findUnique.mockResolvedValueOnce({ status: 'CONTACTED', contactedAt: new Date(), closedAt: null });
    p.inboundLead.update.mockImplementation(async (args: any) => ({ id: 'l1', ...args.data }));
    const r = await PATCH(req({ action: 'close' }), ctx);
    expect(r.status).toBe(200);
    expect((await r.json()).lead.status).toBe('CLOSED');
    expect(p.inboundLead.update.mock.calls[0][0].data.closedAt).toBeInstanceOf(Date);
  });
});
