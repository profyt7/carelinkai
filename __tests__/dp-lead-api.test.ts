/**
 * feat/dp-lead-capture — API routes.
 *
 * POST /api/lead/dp: shared-secret gate, honeypot + consent enforcement, lead
 * creation, and firing Touch 1. Admin PATCH: status transitions halt/resume the
 * sequence. prisma, the engine, and auth are mocked.
 */

import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    dPLead: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));
jest.mock('@/lib/dp-outreach/dp-followup', () => ({
  startDpSequenceOnLead: jest.fn(),
  // real offsets so the admin route can compute reactivation timing
  DP_FOLLOWUP_OFFSETS_DAYS: [0, 3, 7, 14],
  MAX_DP_TOUCHES: 4,
}));
jest.mock('@/lib/auth-utils', () => ({ requireRole: jest.fn() }));
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));

import { POST as leadPost } from '@/app/api/lead/dp/route';
import { PATCH as adminPatch, DELETE as adminDelete } from '@/app/api/admin/dp-leads/[id]/route';
import { GET as adminGet } from '@/app/api/admin/dp-leads/route';
import { prisma } from '@/lib/prisma';
import { startDpSequenceOnLead } from '@/lib/dp-outreach/dp-followup';
import { requireRole } from '@/lib/auth-utils';

const create = prisma.dPLead.create as jest.Mock;
const findUnique = prisma.dPLead.findUnique as jest.Mock;
const update = prisma.dPLead.update as jest.Mock;
const findMany = prisma.dPLead.findMany as jest.Mock;
const deleteMock = prisma.dPLead.delete as jest.Mock;
const startSeq = startDpSequenceOnLead as jest.Mock;
const roleMock = requireRole as jest.Mock;

const TOKEN = 'unguessable-form-token';

const leadReq = (body: unknown) =>
  new NextRequest('http://localhost/api/lead/dp', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

const validBody = {
  k: TOKEN,
  name: 'Maria Gonzalez',
  email: 'Maria@Hospital.org',
  hospital: 'Cleveland Clinic',
  department: 'Case Management',
  interestLevel: 'HOT',
  notes: 'Met on 7/15 call',
  consent: true,
  company: '', // honeypot empty
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env.LEAD_CAPTURE_TOKEN = TOKEN;
  process.env.ALLOW_DEV_ENDPOINTS = '1'; // bypass rate limit in tests
  create.mockResolvedValue({ id: 'lead-1' } as never);
  update.mockResolvedValue({ id: 'lead-1', status: 'replied' } as never);
  deleteMock.mockResolvedValue({ id: 'lead-1' } as never);
  startSeq.mockResolvedValue(undefined as never);
  roleMock.mockResolvedValue({ id: 'admin', role: 'ADMIN' } as never);
});

// --------------------------------------------------------- POST /api/lead/dp
describe('POST /api/lead/dp', () => {
  it('creates the lead and fires Touch 1 on a valid submission', async () => {
    const res = await leadPost(leadReq(validBody));
    expect(res.status).toBe(201);
    expect(create).toHaveBeenCalledTimes(1);
    const data = (create.mock.calls[0][0] as any).data;
    expect(data.email).toBe('maria@hospital.org'); // lowercased
    expect(data.consent).toBe(true);
    expect(data.source).toBe('anita_form');
    expect(startSeq).toHaveBeenCalledWith({ leadId: 'lead-1' });
  });

  it('rejects a wrong shared-secret token with 403 and writes nothing', async () => {
    const res = await leadPost(leadReq({ ...validBody, k: 'wrong' }));
    expect(res.status).toBe(403);
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects when the honeypot is filled', async () => {
    const res = await leadPost(leadReq({ ...validBody, company: 'spammer' }));
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects when consent is not given', async () => {
    const res = await leadPost(leadReq({ ...validBody, consent: false }));
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects a malformed email', async () => {
    const res = await leadPost(leadReq({ ...validBody, email: 'not-an-email' }));
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });
});

// -------------------------------------------------- PATCH /api/admin/dp-leads/[id]
describe('PATCH /api/admin/dp-leads/[id]', () => {
  const patchReq = (body: unknown) =>
    new NextRequest('http://localhost/api/admin/dp-leads/lead-1', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  it('marks replied → halts the sequence (status + nextTouchAt null)', async () => {
    findUnique.mockResolvedValue({ id: 'lead-1', createdAt: new Date(), touchStep: 2 } as never);
    const res = await adminPatch(patchReq({ action: 'replied' }), { params: { id: 'lead-1' } });
    expect(res.status).toBe(200);
    const data = (update.mock.calls[0][0] as any).data;
    expect(data).toMatchObject({ status: 'replied', stoppedReason: 'replied', nextTouchAt: null });
  });

  it('reactivate reschedules the next unsent touch', async () => {
    findUnique.mockResolvedValue({ id: 'lead-1', createdAt: new Date('2026-07-15T12:00:00Z'), touchStep: 1 } as never);
    const res = await adminPatch(patchReq({ action: 'reactivate' }), { params: { id: 'lead-1' } });
    expect(res.status).toBe(200);
    const data = (update.mock.calls[0][0] as any).data;
    expect(data.status).toBe('active');
    // next unsent = touch 2 → +3d
    expect(new Date(data.nextTouchAt).toISOString()).toBe(new Date('2026-07-18T12:00:00Z').toISOString());
  });

  it('rejects an unknown action', async () => {
    const res = await adminPatch(patchReq({ action: 'nonsense' }), { params: { id: 'lead-1' } });
    expect(res.status).toBe(400);
  });

  it('returns 403 for a non-admin', async () => {
    const err: any = new Error('Forbidden'); err.name = 'UnauthorizedError';
    roleMock.mockRejectedValue(err);
    const res = await adminPatch(patchReq({ action: 'stop' }), { params: { id: 'lead-1' } });
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------- GET /api/admin/dp-leads
describe('GET /api/admin/dp-leads', () => {
  it('returns leads for an admin', async () => {
    findMany.mockResolvedValue([{ id: 'lead-1', name: 'Maria' }] as never);
    const res = await adminGet(new NextRequest('http://localhost/api/admin/dp-leads?status=active'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.leads).toHaveLength(1);
    expect((findMany.mock.calls[0][0] as any).where).toEqual({ status: 'active' });
  });

  it('returns 401 when unauthenticated', async () => {
    const err: any = new Error('Unauthorized'); err.name = 'UnauthenticatedError';
    roleMock.mockRejectedValue(err);
    const res = await adminGet(new NextRequest('http://localhost/api/admin/dp-leads'));
    expect(res.status).toBe(401);
  });
});

// ------------------------------------------------- DELETE /api/admin/dp-leads/[id]
describe('DELETE /api/admin/dp-leads/[id]', () => {
  const delReq = () => new NextRequest('http://localhost/api/admin/dp-leads/lead-1', { method: 'DELETE' });

  it('deletes an existing lead for an admin', async () => {
    findUnique.mockResolvedValue({ id: 'lead-1' } as never);
    const res = await adminDelete(delReq(), { params: { id: 'lead-1' } });
    expect(res.status).toBe(200);
    expect(deleteMock).toHaveBeenCalledWith({ where: { id: 'lead-1' } });
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, deleted: 'lead-1' });
  });

  it('returns 404 for a missing lead (and deletes nothing)', async () => {
    findUnique.mockResolvedValue(null as never);
    const res = await adminDelete(delReq(), { params: { id: 'nope' } });
    expect(res.status).toBe(404);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it('returns 403 for a non-admin (and deletes nothing)', async () => {
    const err: any = new Error('Forbidden'); err.name = 'UnauthorizedError';
    roleMock.mockRejectedValue(err);
    const res = await adminDelete(delReq(), { params: { id: 'lead-1' } });
    expect(res.status).toBe(403);
    expect(deleteMock).not.toHaveBeenCalled();
  });
});
