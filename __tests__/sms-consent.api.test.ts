/**
 * OL-184 — every route behind an SMS phone field stores the 10DLC opt-in on
 * LeadConsent (with consentAt / version / phone / refs) when the box was
 * checked, and stores nothing when it was not. Account routes also expose the
 * saved state and record a revocation when a prior opt-in is unchecked.
 */

import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';

const session = jest.fn<() => Promise<unknown>>();
jest.mock('next-auth', () => ({ getServerSession: () => session() }));
jest.mock('next-auth/next', () => ({ getServerSession: () => session() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/rbac', () => ({
  requireOperatorOrAdmin: async () => ({ session: await session(), error: null }),
  requireAnyRole: async () => ({ session: await session(), error: null }),
}));
jest.mock('@/lib/audit', () => ({ createAuditLogFromRequest: jest.fn(async () => undefined) }));
jest.mock('@/lib/events/record-event', () => ({ recordEvent: jest.fn(async () => undefined) }));
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));
jest.mock('@/lib/hooks/inquiry-hooks', () => ({ afterInquiryCreated: jest.fn(async () => undefined) }));
jest.mock('@/lib/sms/sms-service', () => ({ smsService: { sendNewInquiryAlert: jest.fn(async () => undefined) } }));
jest.mock('@/lib/claim-engine/inquiry-claim-notification', () => ({
  notifyUnclaimedHomeInquiry: jest.fn(async () => undefined),
  isUnclaimedHome: jest.fn(() => false),
}));
jest.mock('@/lib/leads/web-inquiry-lead', () => ({ routeUnclaimedInquiry: jest.fn(async () => undefined) }));
jest.mock('@/lib/concierge/tour-coordination', () => ({ coordinateConciergeInquiry: jest.fn(async () => undefined) }));
jest.mock('@/lib/email', () => ({
  sendNewLeadOperatorEmail: jest.fn(async () => undefined),
  sendVerificationEmail: jest.fn(async () => true),
}));
jest.mock('@/lib/email/transactional', () => ({ sendEmail: jest.fn(async () => ({ success: true })), escapeHtml: (v: unknown) => String(v ?? '') }));
jest.mock('@/lib/rate-limit', () => ({ rateLimit: () => ({ check: async () => undefined }) }));
jest.mock('@/lib/concierge/intake', () => {
  class FreeLaneRefused extends Error {}
  return {
    FreeLaneRefused,
    mayRequestConcierge: () => true,
    createConciergePageRequest: jest.fn(async () => ({ id: 'ps-1' })),
  };
});
jest.mock('@/lib/concierge/orders', () => {
  class CheckoutUnavailable extends Error {}
  return {
    CheckoutUnavailable,
    capStatus: jest.fn(async () => ({ checkoutEnabled: true, capReached: false, cap: 4, committed: 0, mode: 'checkout' })),
    createOrder: jest.fn(async () => ({ id: 'ord-1', status: 'REQUESTED_UNPAID' })),
    createCheckoutSession: jest.fn(async () => ({ id: 'cs_1', url: 'https://checkout.example/cs_1' })),
  };
});
jest.mock('bcryptjs', () => ({ hash: async () => 'hashed' }));
jest.mock('@/lib/claim-token', () => ({ verifyClaimToken: () => null }));
jest.mock('@/lib/prisma', () => {
  const p: any = {
    inquiry: { create: jest.fn() },
    family: { findUnique: jest.fn(), upsert: jest.fn(), create: jest.fn(), update: jest.fn() },
    leadConsent: { create: jest.fn(), findFirst: jest.fn() },
    user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    operator: { findUnique: jest.fn(), update: jest.fn() },
    provider: { findUnique: jest.fn(), update: jest.fn() },
    conciergeOrder: { update: jest.fn() },
    auditLog: { create: jest.fn() },
    address: { findFirst: jest.fn(), findMany: jest.fn() },
  };
  p.$transaction = jest.fn(async (arg: unknown) => (typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(p) : Promise.all(arg as Promise<unknown>[])));
  return { prisma: p };
});

import { prisma } from '@/lib/prisma';
import { CURRENT_SMS_CONSENT_VERSION } from '@/lib/consent/sms-consent';
import { POST as postInquiry } from '@/app/api/inquiries/route';
import { POST as postConciergeRequest } from '@/app/api/concierge/request/route';
import { POST as postConciergeCheckout } from '@/app/api/concierge/checkout/route';
import { POST as postRegister } from '@/app/api/auth/register/route';
import { GET as getOperatorProfile, PATCH as patchOperatorProfile } from '@/app/api/operator/profile/route';
import { PATCH as patchProfile } from '@/app/api/profile/route';
import { GET as getFamilyProfile, PATCH as patchFamilyProfile } from '@/app/api/family/profile/route';

const db = prisma as any;
const consentCreate = db.leadConsent.create as jest.Mock;
const consentFind = db.leadConsent.findFirst as jest.Mock;
const CHECKED = { given: true, textVersion: CURRENT_SMS_CONSENT_VERSION };
const UNCHECKED = { given: false, textVersion: CURRENT_SMS_CONSENT_VERSION };

const req = (url: string, body: unknown, method = 'POST') =>
  new NextRequest(`http://localhost${url}`, {
    method,
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.9', 'user-agent': 'jest' },
    body: JSON.stringify(body),
  });

/** The SMS rows written (lead-consent TCPA rows use non-"sms-" versions). */
const smsRows = () =>
  consentCreate.mock.calls.map((c: any) => c[0].data).filter((d: any) => String(d.consentTextVersion).startsWith('sms-'));

beforeEach(() => {
  session.mockResolvedValue(null);
  consentCreate.mockResolvedValue({ id: 'lc-1' } as never);
  consentFind.mockResolvedValue(null as never);
  db.inquiry.create.mockResolvedValue({
    id: 'inq-1', homeId: 'home-1', contactName: 'Jane Doe', contactPhone: '216-555-0100', careRecipientName: null, family: null,
    home: { id: 'home-1', name: 'Maple Grove', operator: { id: 'op-1', companyName: 'X', user: { firstName: 'Op', phone: null, email: 'op@example.com' } } },
  } as never);
  db.user.findUnique.mockResolvedValue(null as never);
  db.user.create.mockResolvedValue({ id: 'new-user', email: 'pat@example.com', firstName: 'Pat', lastName: 'Lee', role: 'FAMILY' } as never);
  db.user.update.mockResolvedValue({ id: 'u-1', firstName: 'A', lastName: 'B', phone: '216-555-0123', role: 'STAFF' } as never);
  db.operator.findUnique.mockResolvedValue({ id: 'op-1', companyName: 'Acme' } as never);
  db.family.upsert.mockResolvedValue({ id: 'fam-1', phone: '216-555-0177' } as never);
  db.family.findUnique.mockResolvedValue({ id: 'fam-1', phone: '216-555-0177' } as never);
  db.provider.findUnique.mockResolvedValue({ contactPhone: '216-555-0188' } as never);
  db.provider.update.mockResolvedValue({ id: 'prov-1' } as never);
  db.auditLog.create.mockResolvedValue({ id: 'al' } as never);
});
afterEach(() => jest.clearAllMocks());

describe('POST /api/inquiries (listing Send Inquiry)', () => {
  const body = (smsConsent?: unknown) => ({
    homeId: 'home-1', contactName: 'Jane Doe', contactEmail: 'jane@example.com', contactPhone: '216-555-0100', careNeeds: [],
    ...(smsConsent === undefined ? {} : { smsConsent }),
  });

  it('checked → an SMS consent row tied to the inquiry', async () => {
    const res = await postInquiry(req('/api/inquiries', body(CHECKED)));
    expect(res.status).toBe(201);
    expect(smsRows()).toEqual([
      expect.objectContaining({ consentGiven: true, consentTextVersion: CURRENT_SMS_CONSENT_VERSION, sourceForm: 'sms_home_inquiry', contactPhone: '216-555-0100', inquiryId: 'inq-1', ip: '203.0.113.9' }),
    ]);
  });

  it('unchecked or absent → no SMS row (the TCPA lead-consent row is unaffected)', async () => {
    await postInquiry(req('/api/inquiries', body(UNCHECKED)));
    await postInquiry(req('/api/inquiries', body()));
    expect(smsRows()).toEqual([]);
    expect(consentCreate).toHaveBeenCalledTimes(2); // the two lead-consent rows
  });
});

describe('concierge form (/api/concierge/request + /checkout)', () => {
  const body = (smsConsent?: unknown) => ({
    payerSource: 'PRIVATE_FUNDS', contactName: 'Dana Family', contactEmail: 'dana@example.com', contactPhone: '216-555-0101',
    careNeeds: 'Mom needs memory care', ...(smsConsent === undefined ? {} : { smsConsent }),
  });

  it('request: checked → row keyed to the PlacementSearch; unchecked → none', async () => {
    expect((await postConciergeRequest(req('/api/concierge/request', body(CHECKED)))).status).toBe(201);
    expect(smsRows()).toEqual([expect.objectContaining({ consentGiven: true, sourceForm: 'sms_concierge_request', contactPhone: '216-555-0101', leadId: 'ps-1' })]);
    consentCreate.mockClear();
    await postConciergeRequest(req('/api/concierge/request', body(UNCHECKED)));
    expect(smsRows()).toEqual([]);
  });

  it('checkout: checked → row; unchecked → none', async () => {
    expect((await postConciergeCheckout(req('/api/concierge/checkout', body(CHECKED)))).status).toBe(201);
    expect(smsRows()).toEqual([expect.objectContaining({ consentGiven: true, sourceForm: 'sms_concierge_request', leadId: 'ps-1' })]);
    consentCreate.mockClear();
    await postConciergeCheckout(req('/api/concierge/checkout', body()));
    expect(smsRows()).toEqual([]);
  });
});

describe('POST /api/auth/register (caregiver / any role signup)', () => {
  const body = (smsConsent?: unknown) => ({
    email: 'pat@example.com', password: 'Str0ng!Pass', firstName: 'Pat', lastName: 'Lee', phone: '(216) 555-0142',
    role: 'FAMILY', agreeToTerms: true, ...(smsConsent === undefined ? {} : { smsConsent }),
  });

  it('checked → row for the new user', async () => {
    const res = await postRegister(req('/api/auth/register', body(CHECKED)));
    expect(res.status).toBe(201);
    expect(smsRows()).toEqual([expect.objectContaining({ consentGiven: true, sourceForm: 'sms_register', userId: 'new-user', contactPhone: '(216) 555-0142', contactEmail: 'pat@example.com' })]);
  });

  it('unchecked → none', async () => {
    await postRegister(req('/api/auth/register', body(UNCHECKED)));
    expect(smsRows()).toEqual([]);
  });
});

describe('/api/operator/profile (operator settings + onboarding)', () => {
  beforeEach(() => session.mockResolvedValue({ user: { id: 'op-user', role: 'OPERATOR' } }));

  it('PATCH checked → row; onboarding source is recorded as such', async () => {
    await patchOperatorProfile(req('/api/operator/profile', { phone: '216-555-0150', smsConsent: CHECKED }, 'PATCH'));
    await patchOperatorProfile(req('/api/operator/profile', { phone: '216-555-0150', smsConsent: CHECKED, smsConsentSource: 'onboarding' }, 'PATCH'));
    expect(smsRows().map((r: any) => [r.sourceForm, r.userId, r.contactPhone, r.consentGiven])).toEqual([
      ['sms_operator_settings', 'op-user', '216-555-0150', true],
      ['sms_operator_onboarding', 'op-user', '216-555-0150', true],
    ]);
  });

  it('PATCH unchecked with no prior opt-in → none; after an opt-in → revocation row', async () => {
    await patchOperatorProfile(req('/api/operator/profile', { phone: '216-555-0150', smsConsent: UNCHECKED }, 'PATCH'));
    expect(smsRows()).toEqual([]);
    consentFind.mockResolvedValue({ consentGiven: true, consentAt: new Date(), contactPhone: '216-555-0150' } as never);
    await patchOperatorProfile(req('/api/operator/profile', { phone: '216-555-0150', smsConsent: UNCHECKED }, 'PATCH'));
    expect(smsRows()).toEqual([expect.objectContaining({ consentGiven: false, userId: 'op-user' })]);
  });

  it('GET returns the saved opt-in so the checkbox can mirror it', async () => {
    db.user.findUnique.mockResolvedValue({ id: 'op-user', email: 'o@example.com', firstName: 'O', lastName: 'P', phone: '216-555-0150', role: 'OPERATOR' } as never);
    consentFind.mockResolvedValue({ consentGiven: true, consentAt: new Date('2026-10-25T00:00:00Z'), contactPhone: '216-555-0150' } as never);
    const json = await (await getOperatorProfile(req('/api/operator/profile', undefined, 'GET'))).json();
    expect(json.smsConsent.given).toBe(true);
  });
});

describe('PATCH /api/profile (staff / caregiver profile settings, provider settings)', () => {
  it('account phone: checked → row with the submitted phone; unchecked → none', async () => {
    session.mockResolvedValue({ user: { id: 'staff-1' } });
    db.user.findUnique.mockResolvedValue({ role: 'STAFF' } as never);
    await patchProfile(req('/api/profile', { phone: '216-555-0123', smsConsent: CHECKED, smsConsentSource: 'profile' }, 'PATCH'));
    expect(smsRows()).toEqual([expect.objectContaining({ sourceForm: 'sms_profile_settings', userId: 'staff-1', contactPhone: '216-555-0123', consentGiven: true })]);
    consentCreate.mockClear();
    await patchProfile(req('/api/profile', { phone: '216-555-0123', smsConsent: UNCHECKED, smsConsentSource: 'profile' }, 'PATCH'));
    expect(smsRows()).toEqual([]);
  });

  it('provider settings: the listing contact phone is the number opted in', async () => {
    session.mockResolvedValue({ user: { id: 'prov-user' } });
    db.user.findUnique.mockResolvedValue({ role: 'PROVIDER' } as never);
    await patchProfile(req('/api/profile', { contactPhone: '216-555-0188', smsConsent: CHECKED, smsConsentSource: 'provider' }, 'PATCH'));
    expect(smsRows()).toEqual([expect.objectContaining({ sourceForm: 'sms_provider_settings', userId: 'prov-user', contactPhone: '216-555-0188' })]);
  });
});

describe('/api/family/profile (family settings)', () => {
  beforeEach(() => session.mockResolvedValue({ user: { id: 'fam-user', role: 'FAMILY' } }));

  it('PATCH checked → row with the family phone; unchecked → none', async () => {
    await patchFamilyProfile(req('/api/family/profile', { phone: '216-555-0177', smsConsent: CHECKED }, 'PATCH'));
    expect(smsRows()).toEqual([expect.objectContaining({ sourceForm: 'sms_family_settings', userId: 'fam-user', contactPhone: '216-555-0177', consentGiven: true })]);
    consentCreate.mockClear();
    await patchFamilyProfile(req('/api/family/profile', { phone: '216-555-0177', smsConsent: UNCHECKED }, 'PATCH'));
    expect(smsRows()).toEqual([]);
  });

  it('GET returns the saved opt-in', async () => {
    consentFind.mockResolvedValue({ consentGiven: true, consentAt: new Date(), contactPhone: '216-555-0177' } as never);
    const json = await (await getFamilyProfile(req('/api/family/profile', undefined, 'GET'))).json();
    expect(json.smsConsent.given).toBe(true);
  });
});
