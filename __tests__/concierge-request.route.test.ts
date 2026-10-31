/**
 * Sprint W4 0a + W5-3 — POST /api/concierge/request + createConciergePageRequest:
 *  - a private-pay submit lands in the EXISTING DP concierge queue
 *    (PlacementSearch isConcierge / SUBMITTED) tagged source=concierge_page,
 *    carrying the screener answer (payerSource), contact kept in patientInfo,
 *    PLUS a ConciergeOrder REQUESTED_UNPAID (flag unset = today's behaviour);
 *  - monthly cap reached → queue row + order are WAITLIST;
 *  - the system user is created once and reused;
 *  - Medicaid / Medicare / VA answers are refused (400) — never a queue row;
 *    "not sure" is allowed (the family pays, never a home);
 *  - honeypot stores nothing; validation 400; no Stripe import in this route.
 */

import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';

jest.mock('@/lib/prisma', () => {
  // Sprint W5-1: writes now commit alongside an EntityEvent row inside
  // prisma.$transaction(callback); the mock runs the callback against itself.
  const p: any = {
    user: { findUnique: jest.fn(), create: jest.fn() },
    placementSearch: { create: jest.fn() },
    conciergeOrder: { create: jest.fn(), count: jest.fn() },
    entityEvent: { create: jest.fn().mockResolvedValue({ id: 'evt' }), findMany: jest.fn().mockResolvedValue([]) },
  };
  p.$transaction = jest.fn(async (arg: unknown) => (typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(p) : Promise.all(arg as Promise<unknown>[])));
  return { prisma: p };
});
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));
jest.mock('@/lib/email', () => ({ sendConciergeRequestNotification: jest.fn(async () => true), sendConciergePaidNotification: jest.fn(async () => true), sendConciergeFamilyEmail: jest.fn(async () => true) }));
jest.mock('next-auth', () => ({ getServerSession: jest.fn(async () => null) }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));

import { POST } from '@/app/api/concierge/request/route';
import { prisma } from '@/lib/prisma';
import { sendConciergeFamilyEmail, sendConciergeRequestNotification } from '@/lib/email';
import { CONCIERGE_PAGE_SOURCE, CONCIERGE_PAGE_USER_EMAIL, createConciergePageRequest } from '@/lib/concierge/intake';

const userFind = prisma.user.findUnique as jest.Mock;
const userCreate = prisma.user.create as jest.Mock;
const psCreate = prisma.placementSearch.create as jest.Mock;
const orderCreate = (prisma as any).conciergeOrder.create as jest.Mock;
const orderCount = (prisma as any).conciergeOrder.count as jest.Mock;

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
  orderCreate.mockImplementation(async (args: any) => ({ id: 'ord-1', status: args.data.status }));
  orderCount.mockResolvedValue(0 as never);
  delete process.env['CONCIERGE_CHECKOUT_ENABLED'];
  delete process.env['CONCIERGE_MONTHLY_CAP'];
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

  it('allows "not sure" (the family pays) but refuses every free-lane payer without touching the queue', async () => {
    await createConciergePageRequest({ ...base, payerSource: 'NOT_SURE' });
    expect(psCreate).toHaveBeenCalledTimes(1);
    psCreate.mockClear();
    for (const v of ['MEDICAID_WAIVER', 'MEDICARE_ADVANTAGE', 'VA_BENEFITS'] as const) {
      await expect(createConciergePageRequest({ ...base, payerSource: v })).rejects.toThrow(/private-pay only/);
    }
    expect(psCreate).not.toHaveBeenCalled();
  });

  it('a PENDING_PAYMENT row does not alert the admin (the paid webhook does); WAITLIST does', async () => {
    await createConciergePageRequest(base as any, { queueStatus: 'PENDING_PAYMENT' });
    expect((psCreate.mock.calls[0] as any)[0].data.conciergeStatus).toBe('PENDING_PAYMENT');
    expect(sendConciergeRequestNotification).not.toHaveBeenCalled();
    await createConciergePageRequest(base as any, { queueStatus: 'WAITLIST' });
    expect(sendConciergeRequestNotification).toHaveBeenCalledWith(expect.objectContaining({ dpName: expect.stringMatching(/WAITLIST/) }));
  });
});

describe('POST /api/concierge/request', () => {
  it('201 with the queue id + a REQUESTED_UNPAID order for a private-pay family (flag unset)', async () => {
    const res = await POST(req(base));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true, id: 'ps-1', source: 'concierge_page', status: 'SUBMITTED', orderId: 'ord-1', orderStatus: 'REQUESTED_UNPAID' });
    expect(orderCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ placementSearchId: 'ps-1', email: 'dana@example.com', status: 'REQUESTED_UNPAID', amountCents: 39900 }) }));
  });

  it('pay when ready: emails the family the terms, next steps and our phone number — never their case details', async () => {
    const send = sendConciergeFamilyEmail as jest.Mock;
    send.mockClear();
    await POST(req(base));
    expect(send).toHaveBeenCalledTimes(1);
    const arg = send.mock.calls[0][0] as any;
    expect(String(arg.toEmail).toLowerCase()).toBe('dana@example.com');
    expect(arg.kind).toBe('confirmation');
    const blob = `${arg.email.subject}\n${arg.email.text}\n${arg.email.html}`;
    expect(arg.email.text).toContain("When your shortlist is ready, we'll send you a secure payment link");
    expect(arg.email.text).toContain('What happens next');
    expect(arg.email.text).toContain('(216) 245-9482');
    for (const leak of ['memory care', 'medication', 'Westlake', 'Dana', '216-555-0101', 'urgent']) expect(blob).not.toContain(leak);
  });

  it('the waitlist confirmation says so and still carries the terms', async () => {
    const send = sendConciergeFamilyEmail as jest.Mock;
    send.mockClear();
    orderCount.mockResolvedValue(4 as never);
    await POST(req(base));
    const arg = send.mock.calls[0][0] as any;
    expect(arg.email.subject).toMatch(/waitlist/i);
    expect(arg.email.text).toContain('Nothing has been charged.');
    expect(arg.email.text).toContain('secure payment link');
  });

  it('monthly cap reached → WAITLIST queue row + WAITLIST order', async () => {
    orderCount.mockResolvedValue(4 as never);
    const res = await POST(req(base));
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ status: 'WAITLIST', orderStatus: 'WAITLIST' });
    expect((psCreate.mock.calls[0] as any)[0].data.conciergeStatus).toBe('WAITLIST');
  });

  it('400 for a free-lane answer (points at free help), nothing stored', async () => {
    const res = await POST(req({ ...base, payerSource: 'MEDICAID_WAIVER' }));
    expect(res.status).toBe(400);
    // Medicaid lands on the waiver-filtered directory (sprint W5-2).
    expect((await res.json()).freeHelp).toBe('/cleveland/assisted-living?waiver=1');
    expect(psCreate).not.toHaveBeenCalled();
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it('400 on validation, 201/no-store on honeypot', async () => {
    expect((await POST(req({ ...base, contactEmail: 'nope' }))).status).toBe(400);
    expect((await POST(req({ ...base, careNeeds: 'x' }))).status).toBe(400);
    const hp = await POST(req({ ...base, company_url: 'http://spam' }));
    expect(hp.status).toBe(201);
    expect(psCreate).not.toHaveBeenCalled();
    expect(orderCreate).not.toHaveBeenCalled();
  });
});
