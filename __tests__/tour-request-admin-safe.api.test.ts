/**
 * Family tour requests get the same demo/test-safe handling and admin visibility as listing inquiries:
 * demo listing or +cltest@ family → no operator SMS/email, no claim engine, admin queue with [TEST];
 * claimed real home → operator alerted AND admin copy ("claimed listing"); unclaimed → unchanged.
 */
import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

jest.mock('next-auth', () => ({ getServerSession: async () => ({ user: { id: 'u-fam', role: 'FAMILY' } }) }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/permissions', () => ({ PERMISSIONS: { TOURS_REQUEST: 'tours.request' }, hasPermission: () => true }));
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));
jest.mock('@/lib/notifications/tour-notifications', () => ({ sendTourConfirmationEmail: jest.fn(async () => undefined) }));
const sendTourBookedAlert = jest.fn(async () => undefined);
jest.mock('@/lib/sms/sms-service', () => ({ smsService: { sendTourBookedAlert: (...a: unknown[]) => sendTourBookedAlert(...(a as [])) } }));
const notifyUnclaimedHomeInquiry = jest.fn(async () => undefined);
jest.mock('@/lib/claim-engine/inquiry-claim-notification', () => ({
  notifyUnclaimedHomeInquiry: (...a: unknown[]) => notifyUnclaimedHomeInquiry(...(a as [])),
  isUnclaimedHome: (email: string | null | undefined) => email === 'directory-unclaimed@carelinkai.system',
}));
jest.mock('@/lib/consent/lead-consent', () => ({ recordLeadConsent: jest.fn(async () => undefined) }));
const sendNewLeadOperatorEmail = jest.fn(async () => true);
jest.mock('@/lib/email', () => ({ sendNewLeadOperatorEmail: (...a: unknown[]) => sendNewLeadOperatorEmail(...(a as [])) }));
const routeUnclaimedInquiry = jest.fn(async (_i: any) => undefined);
const sendClaimedInquiryAdminCopy = jest.fn(async (_i: any) => 'sent');
jest.mock('@/lib/leads/web-inquiry-lead', () => ({
  routeUnclaimedInquiry: (i: any) => routeUnclaimedInquiry(i),
  sendClaimedInquiryAdminCopy: (i: any) => sendClaimedInquiryAdminCopy(i),
}));

const OP_USER = { firstName: 'Olivia', phone: '+12165550199', email: 'operator@example.com' };
const SENTINEL = { firstName: 'Directory', phone: null, email: 'directory-unclaimed@carelinkai.system' };
const state = { familyEmail: 'jordan@example.com', isDemo: false, opUser: OP_USER as typeof OP_USER | typeof SENTINEL };
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(async () => [1]),
    family: { findUnique: jest.fn(async () => ({ id: 'fam-1', user: { id: 'u-fam', firstName: 'Jordan', lastName: 'Rivera', email: state.familyEmail, phone: null } })) },
    assistedLivingHome: { findFirst: jest.fn(async () => ({ id: 'home-1', name: 'Sunrise Villa', status: 'ACTIVE', operatorId: 'op-1', isDemo: state.isDemo, operator: { user: state.opUser }, address: null })) },
    tourRequest: {
      create: jest.fn(async () => ({
        id: 'tour-1', homeId: 'home-1', familyId: 'fam-1', status: 'PENDING', requestedTimes: ['2026-12-01T15:00:00.000Z'], familyNotes: null, createdAt: new Date(),
        family: { user: { id: 'u-fam', firstName: 'Jordan', lastName: 'Rivera', email: state.familyEmail, phone: null } },
        home: { id: 'home-1', name: 'Sunrise Villa', isDemo: state.isDemo, address: null },
        operator: { user: state.opUser },
      })),
    },
    inquiry: { findFirst: jest.fn(async () => null) },
    placementSearch: { findFirst: jest.fn(async () => null) },
  },
}));

import { POST } from '@/app/api/family/tours/request/route';

const post = () => POST(new NextRequest('http://localhost/api/family/tours/request', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ homeId: 'home-1', requestedTimes: ['2026-12-01T15:00:00.000Z'] }),
}));

beforeEach(() => {
  [sendTourBookedAlert, notifyUnclaimedHomeInquiry, sendNewLeadOperatorEmail, routeUnclaimedInquiry, sendClaimedInquiryAdminCopy].forEach((m) => m.mockClear());
  Object.assign(state, { familyEmail: 'jordan@example.com', isDemo: false, opUser: OP_USER });
});

const noOperatorContact = () => {
  expect(sendTourBookedAlert).not.toHaveBeenCalled();
  expect(sendNewLeadOperatorEmail).not.toHaveBeenCalled();
  expect(notifyUnclaimedHomeInquiry).not.toHaveBeenCalled();
  expect(sendClaimedInquiryAdminCopy).not.toHaveBeenCalled();
};

describe('POST /api/family/tours/request', () => {
  it('claimed real home: operator SMS + email + claim hook, AND an admin copy; no queue row', async () => {
    expect((await post()).status).toBe(200);
    expect(sendTourBookedAlert).toHaveBeenCalledTimes(1);
    expect(sendNewLeadOperatorEmail).toHaveBeenCalledTimes(1);
    expect(notifyUnclaimedHomeInquiry).toHaveBeenCalledTimes(1);
    expect(routeUnclaimedInquiry).not.toHaveBeenCalled();
    expect(sendClaimedInquiryAdminCopy.mock.calls[0][0]).toMatchObject({ tourRequestId: 'tour-1', inquiryId: null, homeName: 'Sunrise Villa' });
  });

  it('demo listing: no operator or facility contact; admin queue as demo', async () => {
    state.isDemo = true;
    await post();
    noOperatorContact();
    expect(routeUnclaimedInquiry.mock.calls[0][0]).toMatchObject({ listingKind: 'demo', tourRequestId: 'tour-1' });
  });

  it('test family (+cltest@) on a claimed home: no operator contact; admin queue as claimed + isTest', async () => {
    state.familyEmail = 'profyt7+cltest@gmail.com';
    await post();
    noOperatorContact();
    expect(routeUnclaimedInquiry.mock.calls[0][0]).toMatchObject({ listingKind: 'claimed', isTest: true });
  });

  it('unclaimed real home: unchanged (admin queue as unclaimed, claim hook still called)', async () => {
    state.opUser = SENTINEL;
    await post();
    expect(notifyUnclaimedHomeInquiry).toHaveBeenCalledTimes(1);
    expect(sendNewLeadOperatorEmail).not.toHaveBeenCalled();
    expect(routeUnclaimedInquiry.mock.calls[0][0]).toMatchObject({ listingKind: 'unclaimed', isTest: false });
  });

  it("operator tours queue excludes test families' tour requests", () => {
    const src = readFileSync(join(__dirname, '../src/app/api/operator/tours/route.ts'), 'utf8');
    expect(src).toMatch(/whereClause\.operatorId = operator\.id;\s*\/\/[^\n]*\n\s*whereClause\.family = \{ user: REAL_FAMILY_USER \};/);
  });
});
