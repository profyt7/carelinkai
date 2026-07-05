/**
 * API-level tests for lead-consent capture (feat/lead-consent-capture):
 * POST /api/inquiries (public lead form) and POST /api/demo-request write a
 * LeadConsent evidence row for BOTH consent states, stamp the text version,
 * and never fail or block the submission because of the consent payload.
 */

import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/hooks/inquiry-hooks', () => ({
  afterInquiryCreated: jest.fn(async () => undefined),
}));
jest.mock('@/lib/sms/sms-service', () => ({
  smsService: { sendNewInquiryAlert: jest.fn(async () => undefined) },
}));
jest.mock('@/lib/claim-engine/inquiry-claim-notification', () => ({
  notifyUnclaimedHomeInquiry: jest.fn(async () => undefined),
  isUnclaimedHome: jest.fn(() => true),
}));
jest.mock('@/lib/email', () => ({
  sendNewLeadOperatorEmail: jest.fn(async () => undefined),
}));
jest.mock('@/lib/concierge/tour-coordination', () => ({
  coordinateConciergeInquiry: jest.fn(async () => undefined),
}));
jest.mock('@/lib/email-service', () => ({
  __esModule: true,
  default: { sendEmail: jest.fn(async () => undefined) },
}));
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    inquiry: { create: jest.fn() },
    family: { findUnique: jest.fn() },
    demoRequest: { create: jest.fn() },
    leadConsent: { create: jest.fn() },
  },
}));

import { getServerSession } from 'next-auth';
import { POST as postInquiry } from '@/app/api/inquiries/route';
import { POST as postDemoRequest } from '@/app/api/demo-request/route';
import { CURRENT_LEAD_CONSENT_VERSION } from '@/lib/consent/lead-consent-text';
import { prisma } from '@/lib/prisma';

const mockedSession = getServerSession as jest.Mock;
const mockedInquiryCreate = prisma.inquiry.create as jest.Mock;
const mockedDemoCreate = prisma.demoRequest.create as jest.Mock;
const mockedConsentCreate = prisma.leadConsent.create as jest.Mock;

const createdInquiry = {
  id: 'inq-1',
  homeId: 'home-1',
  contactName: 'Jane Doe',
  careRecipientName: null,
  family: null,
  home: { id: 'home-1', name: 'Maple Grove', operator: { id: 'op-1', companyName: 'X', user: { firstName: 'Op', phone: null, email: 'unclaimed@carelinkai.system' } } },
};

const inquiryBody = (consent: unknown) => ({
  homeId: 'home-1',
  contactName: 'Jane Doe',
  contactEmail: 'jane@example.com',
  contactPhone: '555-0100',
  careNeeds: ['Assisted Living'],
  ...(consent === undefined ? {} : { consent }),
});

const makeReq = (url: string, body: unknown) =>
  new NextRequest(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.7' },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  mockedSession.mockResolvedValue(null as never); // anonymous public submission
  mockedInquiryCreate.mockResolvedValue(createdInquiry as never);
  mockedDemoCreate.mockResolvedValue({ id: 'demo-1' } as never);
  mockedConsentCreate.mockResolvedValue({ id: 'consent-1' } as never);
});
afterEach(() => jest.clearAllMocks());

describe('POST /api/inquiries consent capture', () => {
  it('creates the inquiry and a GRANTED consent record with the text version stamped', async () => {
    const res = await postInquiry(
      makeReq('http://localhost/api/inquiries', inquiryBody({ given: true, textVersion: CURRENT_LEAD_CONSENT_VERSION })),
    );
    expect(res.status).toBe(201);
    expect(mockedConsentCreate).toHaveBeenCalledTimes(1);
    const data = (mockedConsentCreate.mock.calls[0][0] as any).data;
    expect(data).toMatchObject({
      consentGiven: true,
      consentTextVersion: CURRENT_LEAD_CONSENT_VERSION,
      sourceForm: 'home_inquiry',
      contactEmail: 'jane@example.com',
      inquiryId: 'inq-1',
      ip: '203.0.113.7',
    });
  });

  it('still creates the inquiry when consent is DECLINED, recording consentGiven=false', async () => {
    const res = await postInquiry(
      makeReq('http://localhost/api/inquiries', inquiryBody({ given: false, textVersion: CURRENT_LEAD_CONSENT_VERSION })),
    );
    expect(res.status).toBe(201);
    expect(mockedInquiryCreate).toHaveBeenCalledTimes(1);
    expect((mockedConsentCreate.mock.calls[0][0] as any).data.consentGiven).toBe(false);
  });

  it('accepts a submission with NO consent payload (legacy clients) — records false, never 400s', async () => {
    const res = await postInquiry(makeReq('http://localhost/api/inquiries', inquiryBody(undefined)));
    expect(res.status).toBe(201);
    expect((mockedConsentCreate.mock.calls[0][0] as any).data.consentGiven).toBe(false);
  });

  it('a malformed consent payload never fails validation and normalizes to false', async () => {
    const res = await postInquiry(
      makeReq('http://localhost/api/inquiries', inquiryBody('i-agree-string')),
    );
    expect(res.status).toBe(201);
    expect((mockedConsentCreate.mock.calls[0][0] as any).data.consentGiven).toBe(false);
  });

  it('the inquiry still succeeds if the consent write itself blows up', async () => {
    mockedConsentCreate.mockRejectedValue(new Error('db hiccup') as never);
    const res = await postInquiry(
      makeReq('http://localhost/api/inquiries', inquiryBody({ given: true, textVersion: CURRENT_LEAD_CONSENT_VERSION })),
    );
    expect(res.status).toBe(201);
  });
});

describe('POST /api/demo-request consent capture', () => {
  const demoBody = (consent: unknown) => ({
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '555-0100',
    ...(consent === undefined ? {} : { consent }),
  });

  it('records granted consent linked to the demo request', async () => {
    const res = await postDemoRequest(
      makeReq('http://localhost/api/demo-request', demoBody({ given: true, textVersion: CURRENT_LEAD_CONSENT_VERSION })),
    );
    expect(res.status).toBe(200);
    const data = (mockedConsentCreate.mock.calls[0][0] as any).data;
    expect(data).toMatchObject({
      consentGiven: true,
      sourceForm: 'demo_request',
      demoRequestId: 'demo-1',
      contactEmail: 'jane@example.com',
    });
    // consent must not leak into the DemoRequest row itself
    expect((mockedDemoCreate.mock.calls[0][0] as any).data.consent).toBeUndefined();
  });

  it('records consentGiven=false when the box was left unchecked', async () => {
    const res = await postDemoRequest(
      makeReq('http://localhost/api/demo-request', demoBody({ given: false, textVersion: CURRENT_LEAD_CONSENT_VERSION })),
    );
    expect(res.status).toBe(200);
    expect((mockedConsentCreate.mock.calls[0][0] as any).data.consentGiven).toBe(false);
  });
});
