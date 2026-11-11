/**
 * Admin visibility on EVERY inquiry: ADMIN_NOTIFY_EMAIL gets a copy whether the home is claimed,
 * unclaimed, demo or the inquiry is a test — the subject says which. Operators of claimed homes still
 * get theirs. The admin copy carries only form contact fields (no care needs, no free-text message).
 */
import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';

jest.mock('next-auth', () => ({ getServerSession: async () => null }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));
jest.mock('@/lib/hooks/inquiry-hooks', () => ({ afterInquiryCreated: jest.fn(async () => undefined) }));
const sendNewInquiryAlert = jest.fn(async () => undefined);
jest.mock('@/lib/sms/sms-service', () => ({ smsService: { sendNewInquiryAlert: (...a: unknown[]) => sendNewInquiryAlert(...(a as [])) } }));
jest.mock('@/lib/claim-engine/inquiry-claim-notification', () => ({
  notifyUnclaimedHomeInquiry: jest.fn(async () => undefined),
  isUnclaimedHome: (email: string | null | undefined) => email === 'directory-unclaimed@carelinkai.system',
}));
const sendAdminLeadEmail = jest.fn(async (_m: any) => 'sent' as const);
jest.mock('@/lib/leads/inbound-alerts', () => ({
  ...(jest.requireActual('@/lib/leads/inbound-alerts') as object),
  sendAdminLeadEmail: (m: any) => sendAdminLeadEmail(m),
}));
jest.mock('@/lib/concierge/tour-coordination', () => ({ coordinateConciergeInquiry: jest.fn(async () => undefined) }));
const sendNewLeadOperatorEmail = jest.fn(async () => true);
jest.mock('@/lib/email', () => ({
  ...(jest.requireActual('@/lib/email') as object),
  sendNewLeadOperatorEmail: (...a: unknown[]) => sendNewLeadOperatorEmail(...(a as [])),
  guardedResendSend: jest.fn(async () => ({ data: { id: 'x' }, error: null })),
}));
jest.mock('@/lib/consent/lead-consent', () => ({ ...(jest.requireActual('@/lib/consent/lead-consent') as object), recordLeadConsent: jest.fn(async () => undefined) }));
jest.mock('@/lib/consent/sms-consent-server', () => ({ recordSmsConsent: jest.fn(async () => undefined) }));
const inquiryCreate = jest.fn<(a: any) => Promise<any>>();
const inboundCreate = jest.fn(async () => ({ id: 'lead-1' }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    inquiry: { create: (a: any) => inquiryCreate(a) },
    family: { findUnique: jest.fn(async () => null) },
    inboundLead: { findUnique: jest.fn(async () => null), create: (...a: unknown[]) => inboundCreate(...(a as [])) },
  },
}));

import { POST } from '@/app/api/inquiries/route';

const OP_USER = { firstName: 'Olivia', phone: '+12165550199', email: 'operator@example.test' };
const SENTINEL = { firstName: 'Directory', phone: null, email: 'directory-unclaimed@carelinkai.system' };
const SECRET_CARE = 'Uses oxygen at night';
const SECRET_MSG = 'Mom fell last week';
const inquiry = (o: { isDemo?: boolean; isTest?: boolean; user: typeof OP_USER | typeof SENTINEL }) => ({
  id: 'inq-1', homeId: 'home-1', isTest: o.isTest ?? false, contactName: 'Jordan Rivera', contactEmail: 'jordan@example.com', contactPhone: '(216) 555-0142',
  careRecipientName: 'Pat', careNeeds: [SECRET_CARE], message: SECRET_MSG, payerSource: null, additionalInfo: 'Move-in timeframe: 30–60 days',
  tourDate: null, createdAt: new Date(), family: null,
  home: { id: 'home-1', name: 'Sunrise Villa', isDemo: o.isDemo ?? false, operator: { id: 'op-1', companyName: 'Co', user: o.user } },
});
const post = () => new NextRequest('http://localhost/api/inquiries', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ homeId: 'home-1', contactName: 'Jordan Rivera', contactEmail: 'jordan@example.com', careNeeds: [SECRET_CARE], message: SECRET_MSG }),
});

const OLD_KEY = process.env.RESEND_API_KEY;
beforeAll(() => { process.env.RESEND_API_KEY = 're_test_dummy'; });
afterAll(() => { process.env.RESEND_API_KEY = OLD_KEY; });
beforeEach(() => { [sendNewInquiryAlert, sendAdminLeadEmail, sendNewLeadOperatorEmail, inquiryCreate, inboundCreate].forEach((m) => m.mockClear()); });

const adminMail = () => {
  expect(sendAdminLeadEmail).toHaveBeenCalledTimes(1);
  return sendAdminLeadEmail.mock.calls[0][0] as { subject: string; text: string; html: string };
};

describe('admin copy of every inquiry', () => {
  it('claimed home: operator still alerted (SMS + email) AND admin gets a "claimed listing" copy; no queue row', async () => {
    inquiryCreate.mockResolvedValue(inquiry({ user: OP_USER }));
    expect((await POST(post())).status).toBe(201);
    expect(sendNewInquiryAlert).toHaveBeenCalledTimes(1);
    expect(sendNewLeadOperatorEmail).toHaveBeenCalledTimes(1);
    const m = adminMail();
    expect(m.subject).toBe('📝 Family inquiry (claimed listing): Jordan Rivera → Sunrise Villa');
    expect(m.text).toContain('The operator was notified directly; this is your admin copy.');
    expect(m.text).toContain('/admin/inquiries/inq-1');
    expect(inboundCreate).not.toHaveBeenCalled();
  });

  it('unclaimed home: admin copy says "unclaimed listing" (unchanged path)', async () => {
    inquiryCreate.mockResolvedValue(inquiry({ user: SENTINEL }));
    await POST(post());
    expect(adminMail().subject).toBe('📝 Family inquiry (unclaimed listing): Jordan Rivera → Sunrise Villa');
    expect(sendNewLeadOperatorEmail).not.toHaveBeenCalled();
  });

  it('demo listing: admin copy marked [TEST] (demo listing)', async () => {
    inquiryCreate.mockResolvedValue(inquiry({ isDemo: true, user: OP_USER }));
    await POST(post());
    expect(adminMail().subject).toMatch(/^\[TEST\] .*\(demo listing\)/);
  });

  it('test inquiry on a claimed home: admin copy marked [TEST] (claimed listing); operator not alerted', async () => {
    inquiryCreate.mockResolvedValue(inquiry({ isTest: true, user: OP_USER }));
    await POST(post());
    expect(adminMail().subject).toMatch(/^\[TEST\] .*\(claimed listing\)/);
    expect(sendNewLeadOperatorEmail).not.toHaveBeenCalled();
    expect(sendNewInquiryAlert).not.toHaveBeenCalled();
  });

  it.each([['claimed', OP_USER], ['unclaimed', SENTINEL]] as const)('%s: no care needs, message or care-recipient name in the admin email', async (_k, user) => {
    inquiryCreate.mockResolvedValue(inquiry({ user }));
    await POST(post());
    const m = adminMail();
    for (const body of [m.subject, m.text, m.html]) {
      expect(body).not.toContain(SECRET_CARE);
      expect(body).not.toContain(SECRET_MSG);
      expect(body).not.toContain('Pat');
    }
  });
});
