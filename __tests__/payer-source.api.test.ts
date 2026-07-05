/**
 * API-level tests for payer-source persistence (OL-114): the family inquiry
 * and the DP concierge intake persist the tag when present, normalize
 * blank/garbage to null, and NEVER fail a submission over the optional field.
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
  sendConciergeRequestNotification: jest.fn(async () => undefined),
}));
jest.mock('@/lib/concierge/tour-coordination', () => ({
  coordinateConciergeInquiry: jest.fn(async () => undefined),
}));
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));
jest.mock('@/lib/auth-utils', () => ({
  requireRole: jest.fn(async () => ({ id: 'dp-user-1', role: 'DISCHARGE_PLANNER' })),
}));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    inquiry: { create: jest.fn() },
    family: { findUnique: jest.fn() },
    leadConsent: { create: jest.fn() },
    placementSearch: { findUnique: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn() },
  },
}));

import { getServerSession } from 'next-auth';
import { POST as postInquiry } from '@/app/api/inquiries/route';
import { POST as postConcierge } from '@/app/api/discharge-planner/concierge/route';
import { prisma } from '@/lib/prisma';

const mockedSession = getServerSession as jest.Mock;
const mockedInquiryCreate = prisma.inquiry.create as jest.Mock;
const mockedSearchFind = prisma.placementSearch.findUnique as jest.Mock;
const mockedSearchUpdate = prisma.placementSearch.update as jest.Mock;
const mockedUserFind = prisma.user.findUnique as jest.Mock;

const createdInquiry = {
  id: 'inq-1',
  homeId: 'home-1',
  contactName: 'Jane Doe',
  careRecipientName: null,
  family: null,
  home: { id: 'home-1', name: 'Maple Grove', operator: { id: 'op-1', companyName: 'X', user: { firstName: 'Op', phone: null, email: 'unclaimed@carelinkai.system' } } },
};

const inquiryBody = (payerSource: unknown) => ({
  homeId: 'home-1',
  contactName: 'Jane Doe',
  contactEmail: 'jane@example.com',
  careNeeds: [],
  ...(payerSource === undefined ? {} : { payerSource }),
});

const makeReq = (url: string, body: unknown) =>
  new NextRequest(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  mockedSession.mockResolvedValue(null as never);
  mockedInquiryCreate.mockResolvedValue(createdInquiry as never);
  (prisma.leadConsent.create as jest.Mock).mockResolvedValue({ id: 'c1' } as never);
  mockedSearchFind.mockResolvedValue({ id: 'search-1', userId: 'dp-user-1' } as never);
  mockedSearchUpdate.mockResolvedValue({} as never);
  mockedUserFind.mockResolvedValue({ firstName: 'Dana', lastName: 'P', dischargePlannerProfile: null } as never);
});
afterEach(() => jest.clearAllMocks());

describe('POST /api/inquiries payerSource persistence', () => {
  it('persists a valid payer source on the inquiry', async () => {
    const res = await postInquiry(makeReq('http://localhost/api/inquiries', inquiryBody('MEDICAID_WAIVER')));
    expect(res.status).toBe(201);
    expect((mockedInquiryCreate.mock.calls[0][0] as any).data.payerSource).toBe('MEDICAID_WAIVER');
  });

  it('submits fine with the field blank — persists null', async () => {
    const res = await postInquiry(makeReq('http://localhost/api/inquiries', inquiryBody(undefined)));
    expect(res.status).toBe(201);
    expect((mockedInquiryCreate.mock.calls[0][0] as any).data.payerSource).toBeNull();
  });

  it('normalizes empty-string and garbage values to null without a 400', async () => {
    for (const bad of ['', 'private', 42, { nope: true }]) {
      jest.clearAllMocks();
      mockedSession.mockResolvedValue(null as never);
      mockedInquiryCreate.mockResolvedValue(createdInquiry as never);
      (prisma.leadConsent.create as jest.Mock).mockResolvedValue({ id: 'c1' } as never);
      const res = await postInquiry(makeReq('http://localhost/api/inquiries', inquiryBody(bad)));
      expect(res.status).toBe(201);
      expect((mockedInquiryCreate.mock.calls[0][0] as any).data.payerSource).toBeNull();
    }
  });
});

describe('POST /api/discharge-planner/concierge payerSource persistence', () => {
  const conciergeBody = (payerSource: unknown) => ({
    searchId: 'search-1',
    patientInfo: { medicalNeeds: 'Memory care after discharge' },
    ...(payerSource === undefined ? {} : { payerSource }),
  });

  it('persists a valid payer source on the placement search', async () => {
    const res = await postConcierge(
      makeReq('http://localhost/api/discharge-planner/concierge', conciergeBody('NOT_SURE')),
    );
    expect(res.status).toBe(200);
    expect((mockedSearchUpdate.mock.calls[0][0] as any).data.payerSource).toBe('NOT_SURE');
  });

  it('submits fine with the field absent — persists null', async () => {
    const res = await postConcierge(
      makeReq('http://localhost/api/discharge-planner/concierge', conciergeBody(undefined)),
    );
    expect(res.status).toBe(200);
    expect((mockedSearchUpdate.mock.calls[0][0] as any).data.payerSource).toBeNull();
  });

  it('normalizes a legacy/garbage value to null without failing the intake', async () => {
    const res = await postConcierge(
      makeReq('http://localhost/api/discharge-planner/concierge', conciergeBody('private')),
    );
    expect(res.status).toBe(200);
    expect((mockedSearchUpdate.mock.calls[0][0] as any).data.payerSource).toBeNull();
  });
});
