/**
 * Demo-safe inquiries. An inquiry on a demo/tutorial listing (home.isDemo) must never
 * reach an operator or a facility: no operator SMS, no operator email, no claim drip,
 * no automated family follow-ups. It goes to the admin inbound queue and an admin email
 * marked "[TEST]". Claimed and unclaimed (non-demo) homes behave exactly as before.
 */
import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';

jest.mock('next-auth', () => ({ getServerSession: async () => null }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));
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
jest.mock('@/lib/prisma', () => ({
  prisma: { inquiry: { create: (a: any) => inquiryCreate(a) }, family: { findUnique: jest.fn(async () => null) } },
}));

import { POST } from '@/app/api/inquiries/route';
import { adminAlertContent, webInquiryReason } from '@/lib/leads/web-inquiry-lead';

const OP_USER = { firstName: 'Olivia', phone: '+12165550199', email: 'operator+seed@example.test' };
const SENTINEL = { firstName: 'Directory', phone: null, email: 'directory-unclaimed@carelinkai.system' };
const inquiry = (home: { isDemo: boolean; user: typeof OP_USER | typeof SENTINEL }) => ({
  id: 'inq-1', homeId: 'home-1', contactName: 'TEST Inquiry – Chris', contactEmail: 'profyt7+cltest@gmail.com', contactPhone: null,
  careRecipientName: null, payerSource: null, additionalInfo: 'Move-in timeframe: 30–60 days', tourDate: null, createdAt: new Date(), family: null,
  home: { id: 'home-1', name: 'Sunrise Villa', isDemo: home.isDemo, operator: { id: 'op-1', companyName: 'Demo', user: home.user } },
});
const post = () => new NextRequest('http://localhost/api/inquiries', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ homeId: 'home-1', contactName: 'TEST Inquiry – Chris', contactEmail: 'profyt7+cltest@gmail.com', careNeeds: [] }),
});

beforeEach(() => {
  [afterInquiryCreated, sendNewInquiryAlert, notifyUnclaimedHomeInquiry, routeUnclaimedInquiry, sendNewLeadOperatorEmail, inquiryCreate].forEach((m) => m.mockClear());
});

describe('POST /api/inquiries on a demo listing', () => {
  it('reaches no operator or facility; goes to the admin queue as a demo listing', async () => {
    inquiryCreate.mockResolvedValue(inquiry({ isDemo: true, user: OP_USER }));
    const res = await POST(post());
    expect(res.status).toBe(201);
    expect(sendNewInquiryAlert).not.toHaveBeenCalled();
    expect(sendNewLeadOperatorEmail).not.toHaveBeenCalled();
    expect(notifyUnclaimedHomeInquiry).not.toHaveBeenCalled();
    expect(afterInquiryCreated).not.toHaveBeenCalled();
    expect(routeUnclaimedInquiry).toHaveBeenCalledTimes(1);
    expect(routeUnclaimedInquiry.mock.calls[0][0]).toMatchObject({ listingKind: 'demo', inquiryId: 'inq-1', homeName: 'Sunrise Villa' });
  });

  it('also when the demo home is owned by the directory sentinel (unclaimed demo)', async () => {
    inquiryCreate.mockResolvedValue(inquiry({ isDemo: true, user: SENTINEL }));
    await POST(post());
    expect(notifyUnclaimedHomeInquiry).not.toHaveBeenCalled();
    expect(routeUnclaimedInquiry.mock.calls[0][0]).toMatchObject({ listingKind: 'demo' });
  });
});

describe('non-demo listings are unchanged', () => {
  it('claimed home: operator SMS + email, claim engine hook, follow-ups; no admin queue', async () => {
    inquiryCreate.mockResolvedValue(inquiry({ isDemo: false, user: OP_USER }));
    await POST(post());
    expect(sendNewInquiryAlert).toHaveBeenCalledTimes(1);
    expect(sendNewLeadOperatorEmail).toHaveBeenCalledWith(expect.objectContaining({ toEmail: OP_USER.email }));
    expect(notifyUnclaimedHomeInquiry).toHaveBeenCalledTimes(1);
    expect(afterInquiryCreated).toHaveBeenCalledTimes(1);
    expect(routeUnclaimedInquiry).not.toHaveBeenCalled();
  });

  it('unclaimed home: admin queue as "unclaimed", claim engine hook; no operator alerts', async () => {
    inquiryCreate.mockResolvedValue(inquiry({ isDemo: false, user: SENTINEL }));
    await POST(post());
    expect(sendNewInquiryAlert).not.toHaveBeenCalled();
    expect(sendNewLeadOperatorEmail).not.toHaveBeenCalled();
    expect(notifyUnclaimedHomeInquiry).toHaveBeenCalledTimes(1);
    expect(routeUnclaimedInquiry.mock.calls[0][0]).toMatchObject({ listingKind: 'unclaimed' });
  });
});

describe('admin alert wording', () => {
  const base = {
    inquiryId: 'inq-1', homeId: 'home-1', homeName: 'Sunrise Villa', contactName: 'TEST Inquiry – Chris',
    contactEmail: 'profyt7+cltest@gmail.com', contactPhone: null, payerSource: null, additionalInfo: 'Move-in timeframe: 30–60 days',
  };
  it('demo: "[TEST]" subject, says nobody else was notified, queue reason marked', () => {
    const c = adminAlertContent({ ...base, listingKind: 'demo' });
    expect(c.subject.startsWith('[TEST] ')).toBe(true);
    expect(c.subject).toContain('(demo listing)');
    expect(c.text).toContain('no operator or facility was notified');
    expect(c.html).toContain('[TEST] Family inquiry on a demo listing');
    expect(webInquiryReason({ ...base, listingKind: 'demo' }).startsWith('[TEST] Web inquiry on demo listing')).toBe(true);
  });
  it('unclaimed (default): wording unchanged', () => {
    const c = adminAlertContent(base);
    expect(c.subject).toBe('📝 Family inquiry (unclaimed listing): TEST Inquiry – Chris → Sunrise Villa');
    expect(c.html).toContain('<strong>Family inquiry on an unclaimed listing</strong> — no one else received this.');
    expect(webInquiryReason(base).startsWith('Web inquiry on unclaimed listing: Sunrise Villa')).toBe(true);
  });
});
