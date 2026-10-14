/**
 * Sprint W4 0a — POST /api/concierge/request + createConciergePageRequest:
 *  - a private-pay submit lands in the EXISTING DP concierge queue
 *    (PlacementSearch isConcierge / SUBMITTED) tagged source=concierge_page,
 *    carrying the screener answer (payerSource), contact kept in patientInfo;
 *  - the system user is created once and reused;
 *  - free-lane / not-sure answers are refused (400) — never a queue row;
 *  - honeypot stores nothing; validation 400; no Stripe import anywhere.
 */

import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn(), create: jest.fn() },
    placementSearch: { create: jest.fn() },
  },
}));
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));
jest.mock('@/lib/email', () => ({ sendConciergeRequestNotification: jest.fn(async () => true) }));

import { POST } from '@/app/api/concierge/request/route';
import { prisma } from '@/lib/prisma';
import { sendConciergeRequestNotification } from '@/lib/email';
import { CONCIERGE_PAGE_SOURCE, CONCIERGE_PAGE_USER_EMAIL, createConciergePageRequest } from '@/lib/concierge/intake';

const userFind = prisma.user.findUnique as jest.Mock;
const userCreate = prisma.user.create as jest.Mock;
const psCreate = prisma.placementSearch.create as jest.Mock;

let ip = 0;
const req = (body: unknown) =>
  new NextRequest('http://localhost/api/concierge/request', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.1.0.${++ip}` },
    body: JSON.stringify(body),
  });

const base = {
  payerSource: 'PRIVATE_FUNDS',
  contactName: 'Dana Family',
  contactEmail: 'Dana@Example.com',
  contactPhone: '216-555-0101',
  location: 'Westlake',
  careNeeds: 'Mom needs memory care with medication help',
  timeline: 'urgent',
};

beforeEach(() => {
  userFind.mockResolvedValue({ id: 'sys-user' } as never);
  psCreate.mockImplementation(async (args: any) => ({ id: 'ps-1', ...args.data }));
});
afterEach(() => jest.clearAllMocks());

describe('createConciergePageRequest', () => {
  it('creates a SUBMITTED concierge row tagged concierge_page with the payer lane and contact in patientInfo', async () => {
    const row = await createConciergePageRequest({ ...base, payerSource: 'PRIVATE_FUNDS' });
    expect(row.id).toBe('ps-1');
    const data = (psCreate.mock.calls[0] as any)[0].data;
    expect(data).toMatchObject({
      userId: 'sys-user',
      isConcierge: true,
      conciergeStatus: 'SUBMITTED',
      payerSource: 'PRIVATE_FUNDS',
      source: CONCIERGE_PAGE_SOURCE,
      patientInfo: { contactName: 'Dana Family', contactEmail: 'dana@example.com', medicalNeeds: 'Mom needs memory care with medication help', timeline: 'urgent', source: 'concierge_page' },
    });
    expect(data.conciergeSubmittedAt).toBeInstanceOf(Date);
    expect(data.queryText).toMatch(/private pay/);
    expect(sendConciergeRequestNotification).toHaveBeenCalledWith(expect.objectContaining({ requestId: 'ps-1' }));
  });

  it('creates the system user once when missing', async () => {
    userFind.mockResolvedValue(null as never);
    userCreate.mockResolvedValue({ id: 'sys-new' } as never);
    await createConciergePageRequest({ ...base, payerSource: 'LTC_INSURANCE' });
    expect(userCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ email: CONCIERGE_PAGE_USER_EMAIL, role: 'FAMILY' }) }));
    expect((psCreate.mock.calls[0] as any)[0].data.userId).toBe('sys-new');
  });

  it('refuses every non-private-pay lane without touching the queue', async () => {
    for (const v of ['MEDICAID_WAIVER', 'MEDICARE_ADVANTAGE', 'VA_BENEFITS', 'NOT_SURE'] as const) {
      await expect(createConciergePageRequest({ ...base, payerSource: v })).rejects.toThrow(/private-pay only/);
    }
    expect(psCreate).not.toHaveBeenCalled();
  });
});

describe('POST /api/concierge/request', () => {
  it('201 with the queue id + source for a private-pay family', async () => {
    const res = await POST(req(base));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true, id: 'ps-1', source: 'concierge_page', status: 'SUBMITTED' });
  });

  it('400 for a free-lane answer (points at free help), nothing stored', async () => {
    const res = await POST(req({ ...base, payerSource: 'MEDICAID_WAIVER' }));
    expect(res.status).toBe(400);
    expect((await res.json()).freeHelp).toBe('/cleveland');
    expect(psCreate).not.toHaveBeenCalled();
  });

  it('400 on validation, 201/no-store on honeypot', async () => {
    expect((await POST(req({ ...base, contactEmail: 'nope' }))).status).toBe(400);
    expect((await POST(req({ ...base, careNeeds: 'x' }))).status).toBe(400);
    expect((await POST(req({ ...base, payerSource: 'BITCOIN' }))).status).toBe(400);
    const hp = await POST(req({ ...base, company_url: 'http://spam' }));
    expect(hp.status).toBe(201);
    expect((await hp.json()).id).toBeNull();
    expect(psCreate).not.toHaveBeenCalled();
  });
});
