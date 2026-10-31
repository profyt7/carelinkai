/**
 * Concierge outbound safety (fix/concierge-outbound-safety). An acceptance test emailed a real facility when
 * the shortlist was saved. Now:
 *  - a TEST request/order never contacts a facility, across every concierge action ("suppressed (test)");
 *  - on a real request, homes are emailed ONLY when the admin confirmed them (notifyHomeIds);
 *  - an update never re-emails a home that was already notified;
 *  - isTest is set from "+…test…" email tags / "TEST…" names, can be toggled, and is excluded from the monthly cap.
 * Facility senders are mocked; everything else runs the real code.
 */
import { NextRequest } from 'next/server';

const db: { search: any; homes: any[]; responses: Map<string, any>; order: any } = { search: null, homes: [], responses: new Map(), order: null };

const facilityEmail = jest.fn(async () => 'sent');
const operatorLeadEmail = jest.fn(async () => true);
const claimDrip = jest.fn(async () => undefined);

jest.mock('@/lib/auth-utils', () => ({ requireRole: jest.fn(async () => ({ id: 'admin-1', role: 'ADMIN' })) }));
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('@/lib/services/notifications', () => ({ createInAppNotification: jest.fn().mockResolvedValue({ success: true }) }));
jest.mock('@/lib/claim-engine/claim-drip', () => ({ startClaimDripOnLead: (...a: unknown[]) => claimDrip(...(a as [])) }));
jest.mock('@/lib/email', () => ({
  sendFacilityResponseRequestEmail: (...a: unknown[]) => facilityEmail(...(a as [])),
  sendNewLeadOperatorEmail: (...a: unknown[]) => operatorLeadEmail(...(a as [])),
  sendConciergeTourNotification: jest.fn(async () => true),
  sendConciergeShortlistReadyEmail: jest.fn(async () => true),
  sendConciergeFamilyEmail: jest.fn().mockResolvedValue(true),
  sendConciergePaidNotification: jest.fn().mockResolvedValue(true),
  sendConciergeAdminNotice: jest.fn().mockResolvedValue(true),
}));
jest.mock('@/lib/prisma', () => {
  const p: any = {
    placementSearch: {
      findUnique: jest.fn(async () => db.search),
      update: jest.fn(async ({ data }: any) => { db.search = { ...db.search, ...data }; return db.search; }),
    },
    assistedLivingHome: {
      findMany: jest.fn(async ({ where }: any) => db.homes.filter((h) => !where?.id?.in || where.id.in.includes(h.id))),
      findUnique: jest.fn(async ({ where }: any) => db.homes.find((h) => h.id === where.id) ?? null),
    },
    facilityResponse: {
      findUnique: jest.fn(async ({ where }: any) => db.responses.get(where.searchId_homeId.homeId) ?? null),
      create: jest.fn(async ({ data }: any) => { const row = { id: `fr-${data.homeId}`, ...data }; db.responses.set(data.homeId, row); return row; }),
      update: jest.fn(async ({ where, data }: any) => { const row = [...db.responses.values()].find((r) => r.id === where.id); Object.assign(row, data); return row; }),
    },
    conciergeOrder: {
      findUnique: jest.fn(async () => (db.order ? { ...db.order, placementSearch: { id: db.search.id, conciergeStatus: db.search.conciergeStatus, curatedHomes: db.search.curatedHomes } } : null)),
      findMany: jest.fn(async () => []),
      update: jest.fn(async ({ data }: any) => { db.order = { ...db.order, ...data }; return db.order; }),
      updateMany: jest.fn(async ({ data }: any) => { db.order = { ...db.order, ...data }; return { count: 1 }; }),
      count: jest.fn(async () => 0),
    },
    stripeWebhookEvent: { create: jest.fn().mockResolvedValue({}) },
    entityEvent: { create: jest.fn().mockResolvedValue({ id: 'evt' }) },
    user: { findMany: jest.fn().mockResolvedValue([{ id: 'admin-1' }]) },
  };
  p.$transaction = jest.fn(async (fn: any) => fn(p));
  return { prisma: p };
});

import { prisma } from '@/lib/prisma';
import { PATCH } from '@/app/api/admin/concierge/[id]/route';
import { POST as requestTour } from '@/app/api/discharge-planner/concierge/[id]/tour/route';
import { handlePaymentLinkCheckoutCompleted, markPaid, releaseShortlist, reopenOrder, runConciergeOrderSweep, sendPaymentLink } from '@/lib/concierge/pay-when-ready';
import { isTestContact, SUPPRESSED_TEST } from '@/lib/concierge/test-orders';
import { createOrder, monthlyCommittedCount } from '@/lib/concierge/orders';

const P = prisma as any;
const actor = { userId: 'admin-1', role: 'ADMIN' };
const home = (id: string, name: string, email: string) => ({ id, name, contactEmail: email, outreachEmail: null, availabilityCount: null, availabilityVerifiedAt: null, availabilitySource: null, address: { street: '1 Main', city: 'Lyndhurst', state: 'OH', zipCode: '44124' }, operator: { user: { email: 'directory-unclaimed@carelinkai.system', firstName: null } } });
const patch = (body: unknown) => PATCH(new NextRequest('http://localhost/api/admin/concierge/ps-1', { method: 'PATCH', body: JSON.stringify(body) }), { params: { id: 'ps-1' } });
const respond = (homeIds: string[], notifyHomeIds?: string[]) => patch({ action: 'respond', curatedHomes: homeIds.map((homeId) => ({ homeId })), ...(notifyHomeIds ? { notifyHomeIds } : {}) });
const suppressedEvents = () => P.entityEvent.create.mock.calls.map((c: any) => c[0].data).filter((d: any) => d.eventType === 'facility.contact_suppressed');

beforeEach(() => {
  jest.clearAllMocks();
  process.env.NEXTAUTH_SECRET = 'outbound-safety-secret';
  process.env.COMPANY_POSTAL_ADDRESS = '123 Test St, Cleveland, OH 44114'; // real sends would go out
  process.env.CONCIERGE_PAYMENT_LINK_URL = 'https://buy.stripe.com/test_safety';
  db.homes = [home('h-heritage', 'Heritage of Lyndhurst', 'info@heritage.example'), home('h-maple', 'Maple Grove', 'admissions@maple.example')];
  db.responses = new Map();
  db.search = {
    id: 'ps-1', isConcierge: true, isTest: false, userId: 'sys', source: 'concierge_page', user: { email: null, dischargePlannerProfile: null },
    queryText: 'Family concierge request', parsedCriteria: {}, payerSource: 'PRIVATE_PAY', patientInfo: { contactName: 'Pat', contactEmail: 'pat@example.test' },
    searchResults: { matches: [] }, conciergeStatus: 'SUBMITTED', curatedHomes: null,
  };
  db.order = { id: 'ordsafety01', status: 'REQUESTED_UNPAID', email: 'pat@example.test', amountCents: 39900, paymentLinkUrl: null, paymentLinkSentAt: null, shortlistReleasedAt: null, paymentReminderSentAt: null, expiredAt: null, isTest: false };
});

describe('a TEST order never contacts a facility, across every action', () => {
  beforeEach(() => {
    db.search.isTest = true;
    db.order.isTest = true;
  });

  it('save / update shortlist (even with homes "confirmed"), mark matching, toggle: zero facility emails, each home logged "suppressed (test)"', async () => {
    expect((await respond(['h-heritage', 'h-maple'], ['h-heritage', 'h-maple'])).status).toBe(200);
    expect((await respond(['h-maple'], ['h-maple'])).status).toBe(200);
    expect((await patch({ action: 'matching' })).status).toBe(200);
    expect(facilityEmail).not.toHaveBeenCalled();
    expect(P.facilityResponse.create).not.toHaveBeenCalled();
    expect(suppressedEvents().map((e: any) => [e.newValue.homeId, e.newValue.reason])).toEqual([
      ['h-heritage', SUPPRESSED_TEST], ['h-maple', SUPPRESSED_TEST], ['h-maple', SUPPRESSED_TEST],
    ]);
  });

  it('payment link, webhook paid, release, reminder, expiry, reopen, mark paid: zero facility emails', async () => {
    await respond(['h-heritage']);
    expect((await sendPaymentLink({ orderId: 'ordsafety01', actor })).ok).toBe(true);
    await handlePaymentLinkCheckoutCompleted({ id: 'evt_t1', type: 'checkout.session.completed', data: { object: { id: 'cs_t', payment_intent: null, amount_total: 0, amount_subtotal: 39900, total_details: { amount_discount: 39900 }, payment_status: 'no_payment_required', client_reference_id: 'ordsafety01' } } } as any);
    await releaseShortlist({ orderId: 'ordsafety01', actor });
    await runConciergeOrderSweep(new Date(Date.now() + 20 * 24 * 3600 * 1000));
    db.order.status = 'EXPIRED';
    await reopenOrder({ orderId: 'ordsafety01', actor });
    await markPaid({ orderId: 'ordsafety01', actor });
    expect(facilityEmail).not.toHaveBeenCalled();
    expect(operatorLeadEmail).not.toHaveBeenCalled();
    expect(claimDrip).not.toHaveBeenCalled();
  });

  it('DP tour request on a TEST request: no operator email, no claim drip', async () => {
    db.search = { ...db.search, source: 'dp', conciergeStatus: 'SHORTLIST_READY', curatedHomes: [{ homeId: 'h-heritage' }, { homeId: 'h-maple' }], userId: 'admin-1' };
    db.homes[0]!.operator = { user: { email: 'owner@heritage.example', firstName: 'Ann' } }; // claimed
    const call = (homeId: string) => requestTour(new NextRequest('http://localhost/x', { method: 'POST', body: JSON.stringify({ homeId }) }), { params: { id: 'ps-1' } } as any);
    expect((await call('h-heritage')).status).toBe(200);
    expect((await call('h-maple')).status).toBe(200);
    expect(operatorLeadEmail).not.toHaveBeenCalled();
    expect(claimDrip).not.toHaveBeenCalled();
  });
});

describe('real orders: homes are emailed only after confirmation, never twice', () => {
  it('Save without notifying homes (no notifyHomeIds) sends nothing', async () => {
    expect((await respond(['h-heritage', 'h-maple'])).status).toBe(200);
    expect(db.search.conciergeStatus).toBe('SHORTLIST_READY');
    expect(facilityEmail).not.toHaveBeenCalled();
    expect(P.facilityResponse.create).not.toHaveBeenCalled();
  });

  it('Send emails exactly the confirmed homes on the shortlist (an id not on the shortlist is ignored)', async () => {
    await respond(['h-heritage', 'h-maple'], ['h-maple', 'h-not-on-shortlist']);
    expect(facilityEmail).toHaveBeenCalledTimes(1);
    expect(facilityEmail).toHaveBeenCalledWith(expect.objectContaining({ toEmail: 'admissions@maple.example', facilityName: 'Maple Grove' }));
  });

  it('an update never re-emails a home that was already notified (any status), only newly confirmed homes', async () => {
    await respond(['h-maple'], ['h-maple']);
    expect(facilityEmail).toHaveBeenCalledTimes(1);
    for (const status of ['SENT', 'OPENED', 'PENDING']) {
      db.responses.get('h-maple').status = status;
      await respond(['h-maple'], ['h-maple']);
    }
    expect(facilityEmail).toHaveBeenCalledTimes(1);
    await respond(['h-maple', 'h-heritage'], ['h-maple', 'h-heritage']);
    expect(facilityEmail).toHaveBeenCalledTimes(2);
    expect((facilityEmail.mock.calls as any[])[1][0]).toMatchObject({ toEmail: 'info@heritage.example' });
  });
});

describe('the test flag', () => {
  it('auto: "+test" in the family email, or a name starting with TEST', () => {
    expect(isTestContact({ email: 'profyt7+cl-test-a@gmail.com' })).toBe(true);
    expect(isTestContact({ email: 'family+test@example.com' })).toBe(true);
    expect(isTestContact({ name: 'TEST ORDER A' })).toBe(true);
    expect(isTestContact({ name: 'test order b' })).toBe(true);
    expect(isTestContact({ email: 'pat@example.com', name: 'Testa Rossi' })).toBe(false);
    expect(isTestContact({ email: 'contest@example.com', name: 'Pat' })).toBe(false);
    expect(isTestContact({ email: 'pat+family@example.com', name: 'Pat' })).toBe(false);
    expect(isTestContact({ email: 'pat@testing.example', name: 'Pat' })).toBe(false); // only the +tag counts
  });

  it('createOrder stores it; the monthly cap excludes test orders', async () => {
    P.conciergeOrder.create = jest.fn(async ({ data }: any) => ({ id: 'o-1', status: data.status, isTest: data.isTest }));
    await createOrder({ placementSearchId: 'ps-1', email: 'profyt7+cl-test-b@gmail.com', status: 'REQUESTED_UNPAID' });
    expect(P.conciergeOrder.create.mock.calls[0][0].data.isTest).toBe(true);
    await createOrder({ placementSearchId: 'ps-1', email: 'pat@example.com', status: 'REQUESTED_UNPAID' });
    expect(P.conciergeOrder.create.mock.calls[1][0].data.isTest).toBe(false);
    await monthlyCommittedCount(new Date('2026-11-15T12:00:00Z'));
    expect(P.conciergeOrder.count.mock.calls[0][0].where.isTest).toBe(false);
  });

  it('an admin can toggle it; the request and its orders follow', async () => {
    expect(await (await patch({ action: 'set_test', isTest: true })).json()).toEqual({ ok: true, isTest: true });
    expect(db.search.isTest).toBe(true);
    expect(P.conciergeOrder.updateMany).toHaveBeenCalledWith({ where: { placementSearchId: 'ps-1' }, data: { isTest: true } });
  });
});
