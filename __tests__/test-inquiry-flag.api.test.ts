/**
 * Test inquiries: a contact email matching TEST_EMAIL_PATTERN (+cltest@) is stored with isTest=true,
 * reaches no operator or facility (even on a claimed home), goes to the admin queue marked [TEST],
 * is excluded from operator queues and metrics, and only test inquiries can be deleted by an admin.
 */
import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

const session = { current: null as null | { user: { email: string } } };
jest.mock('next-auth', () => ({ getServerSession: async () => session.current }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));
jest.mock('@/lib/audit', () => ({ createAuditLogFromRequest: jest.fn(async () => undefined) }));
const afterInquiryCreated = jest.fn(async () => undefined);
jest.mock('@/lib/hooks/inquiry-hooks', () => ({ afterInquiryCreated: (...a: unknown[]) => afterInquiryCreated(...(a as [])) }));
const sendNewInquiryAlert = jest.fn(async () => undefined);
jest.mock('@/lib/sms/sms-service', () => ({ smsService: { sendNewInquiryAlert: (...a: unknown[]) => sendNewInquiryAlert(...(a as [])) } }));
const notifyUnclaimedHomeInquiry = jest.fn(async () => undefined);
jest.mock('@/lib/claim-engine/inquiry-claim-notification', () => ({
  notifyUnclaimedHomeInquiry: (...a: unknown[]) => notifyUnclaimedHomeInquiry(...(a as [])),
  isUnclaimedHome: (email: string | null | undefined) => email === 'directory-unclaimed@carelinkai.system',
}));
const routeUnclaimedInquiry = jest.fn(async (_i: any) => undefined);
jest.mock('@/lib/leads/web-inquiry-lead', () => ({ ...(jest.requireActual('@/lib/leads/web-inquiry-lead') as object), routeUnclaimedInquiry: (i: any) => routeUnclaimedInquiry(i) }));
jest.mock('@/lib/concierge/tour-coordination', () => ({ coordinateConciergeInquiry: jest.fn(async () => undefined) }));
const sendNewLeadOperatorEmail = jest.fn(async () => true);
jest.mock('@/lib/email', () => ({ sendNewLeadOperatorEmail: (...a: unknown[]) => sendNewLeadOperatorEmail(...(a as [])) }));
jest.mock('@/lib/consent/lead-consent', () => ({ ...(jest.requireActual('@/lib/consent/lead-consent') as object), recordLeadConsent: jest.fn(async () => undefined) }));
jest.mock('@/lib/consent/sms-consent-server', () => ({ recordSmsConsent: jest.fn(async () => undefined) }));
const inquiryCreate = jest.fn<(a: any) => Promise<any>>();
const inquiryFindUnique = jest.fn<(a: any) => Promise<any>>();
const inquiryDelete = jest.fn<(a: any) => any>(() => 'del-inquiry');
const inboundDeleteMany = jest.fn<(a: any) => any>(() => 'del-inbound');
const transaction = jest.fn<(ops: any[]) => Promise<any>>(async (ops) => ops);
jest.mock('@/lib/prisma', () => ({
  prisma: {
    inquiry: { create: (a: any) => inquiryCreate(a), findUnique: (a: any) => inquiryFindUnique(a), delete: (a: any) => inquiryDelete(a) },
    inboundLead: { deleteMany: (a: any) => inboundDeleteMany(a) },
    family: { findUnique: jest.fn(async () => null) },
    user: { findUnique: jest.fn(async () => ({ id: 'admin-1', role: 'ADMIN' })) },
    $transaction: (ops: any[]) => transaction(ops),
  },
}));

import { POST } from '@/app/api/inquiries/route';
import { DELETE } from '@/app/api/admin/inquiries/[id]/route';
import { isTestInquiryEmail, TEST_EMAIL_PATTERN } from '@/lib/inquiries/test-inquiry';
import { adminAlertContent } from '@/lib/leads/web-inquiry-lead';

const OP_USER = { firstName: 'Olivia', phone: '+12165550199', email: 'operator@example.test' };
const created = (isTest: boolean) => ({
  id: 'inq-1', homeId: 'home-1', isTest, contactName: 'TEST Inquiry – Chris', contactEmail: 'profyt7+cltest@gmail.com', contactPhone: null,
  careRecipientName: null, payerSource: null, additionalInfo: 'Move-in timeframe: 30–60 days', tourDate: null, createdAt: new Date(), family: null,
  home: { id: 'home-1', name: 'Sunrise Villa', isDemo: false, operator: { id: 'op-1', companyName: 'Real Co', user: OP_USER } },
});
const post = (contactEmail: string) => new NextRequest('http://localhost/api/inquiries', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ homeId: 'home-1', contactName: 'TEST Inquiry – Chris', contactEmail, careNeeds: [] }),
});
const del = () => DELETE(new NextRequest('http://localhost/api/admin/inquiries/inq-1', { method: 'DELETE' }), { params: Promise.resolve({ id: 'inq-1' }) });

beforeEach(() => {
  [afterInquiryCreated, sendNewInquiryAlert, notifyUnclaimedHomeInquiry, routeUnclaimedInquiry, sendNewLeadOperatorEmail,
    inquiryCreate, inquiryFindUnique, inquiryDelete, inboundDeleteMany, transaction].forEach((m) => m.mockClear());
  session.current = { user: { email: 'admin@example.test' } };
});

describe('TEST_EMAIL_PATTERN', () => {
  it('matches +cltest@ addresses only', () => {
    expect(TEST_EMAIL_PATTERN.source).toContain('cltest');
    expect(isTestInquiryEmail('profyt7+cltest@gmail.com')).toBe(true);
    expect(isTestInquiryEmail(' Someone+CLTEST@Example.com ')).toBe(true);
    expect(isTestInquiryEmail('profyt7@gmail.com')).toBe(false);
    expect(isTestInquiryEmail('cltest@gmail.com')).toBe(false);
    expect(isTestInquiryEmail(null)).toBe(false);
  });
});

describe('POST /api/inquiries with a test contact email', () => {
  it('stores isTest=true', async () => {
    inquiryCreate.mockResolvedValue(created(true));
    await POST(post('profyt7+cltest@gmail.com'));
    expect(inquiryCreate.mock.calls[0][0].data.isTest).toBe(true);
  });

  it('on a CLAIMED home: no operator SMS/email, no claim engine, no follow-ups; admin queue as claimed + test', async () => {
    inquiryCreate.mockResolvedValue(created(true));
    const res = await POST(post('profyt7+cltest@gmail.com'));
    expect(res.status).toBe(201);
    expect(sendNewInquiryAlert).not.toHaveBeenCalled();
    expect(sendNewLeadOperatorEmail).not.toHaveBeenCalled();
    expect(notifyUnclaimedHomeInquiry).not.toHaveBeenCalled();
    expect(afterInquiryCreated).not.toHaveBeenCalled();
    expect(routeUnclaimedInquiry.mock.calls[0][0]).toMatchObject({ listingKind: 'claimed', isTest: true, inquiryId: 'inq-1' });
  });

  it('a normal email stores isTest=false and the claimed-home flow is unchanged', async () => {
    inquiryCreate.mockResolvedValue(created(false));
    await POST(post('family@example.com'));
    expect(inquiryCreate.mock.calls[0][0].data.isTest).toBe(false);
    expect(sendNewInquiryAlert).toHaveBeenCalledTimes(1);
    expect(sendNewLeadOperatorEmail).toHaveBeenCalledTimes(1);
    expect(routeUnclaimedInquiry).not.toHaveBeenCalled();
  });

  it('admin alert for a test inquiry is marked [TEST] and says nobody else was notified', () => {
    const c = adminAlertContent({
      listingKind: 'claimed', isTest: true, inquiryId: 'inq-1', homeId: 'home-1', homeName: 'Sunrise Villa', contactName: 'TEST Inquiry – Chris',
      contactEmail: 'profyt7+cltest@gmail.com', contactPhone: null, payerSource: null, additionalInfo: null,
    });
    expect(c.subject.startsWith('[TEST] ')).toBe(true);
    expect(c.subject).toContain('(claimed listing)');
    expect(c.text).toContain('no operator or facility was notified');
  });
});

describe('operator queues and metrics exclude test inquiries', () => {
  const src = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8');
  it.each([
    'src/app/api/operator/inquiries/route.ts',
    'src/app/api/operator/inquiries/pipeline/route.ts',
    'src/app/api/operator/dashboard/route.ts',
    'src/app/api/operator/ask/route.ts',
    'src/lib/services/inquiry-conversion.ts',
    'src/lib/dashboard/scope.ts',
    'src/app/api/admin/analytics/route.ts',
    'src/lib/admin/stats.ts',
    'src/lib/services/reports.ts',
    'src/app/admin/analytics/funnel/page.tsx',
    'src/lib/claim-engine/claim-drip.ts',
    'src/app/api/homes/[id]/route.ts',
  ])('%s filters with REAL_INQUIRIES', (p) => {
    expect(src(p)).toMatch(/\.\.\.REAL_INQUIRIES|where: REAL_INQUIRIES|Object\.assign\(where, REAL_INQUIRIES\)/);
  });
  it('raw-SQL inquiry trend skips tests', () => {
    expect(src('src/app/api/admin/analytics/route.ts')).toContain('FROM "Inquiry" WHERE "createdAt" >= ${startDate} AND "isTest" = false');
  });
});

describe('DELETE /api/admin/inquiries/[id]', () => {
  it('deletes a test inquiry and its inbound-lead row', async () => {
    inquiryFindUnique.mockResolvedValue({ id: 'inq-1', isTest: true, convertedToResidentId: null, booking: null });
    const res = await del();
    expect(res.status).toBe(200);
    expect(inboundDeleteMany).toHaveBeenCalledWith({ where: { inquiryId: 'inq-1' } });
    expect(inquiryDelete).toHaveBeenCalledWith({ where: { id: 'inq-1' } });
    expect(transaction).toHaveBeenCalledTimes(1);
  });
  it('refuses a real inquiry (409) and deletes nothing', async () => {
    inquiryFindUnique.mockResolvedValue({ id: 'inq-1', isTest: false, convertedToResidentId: null, booking: null });
    const res = await del();
    expect(res.status).toBe(409);
    expect(inquiryDelete).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });
  it('refuses a test inquiry with a booking', async () => {
    inquiryFindUnique.mockResolvedValue({ id: 'inq-1', isTest: true, convertedToResidentId: null, booking: { id: 'b1' } });
    expect((await del()).status).toBe(409);
    expect(transaction).not.toHaveBeenCalled();
  });
  it('requires a session', async () => {
    session.current = null;
    expect((await del()).status).toBe(401);
  });
});
