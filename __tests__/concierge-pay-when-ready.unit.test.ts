/**
 * Family Concierge, pay when ready — phase 1 admin actions + phase 2 automation (OL-248).
 *  - "send payment link" uses CONCIERGE_PAYMENT_LINK_URL with ?client_reference_id&prefilled_email (no paste);
 *    the pasted link is only a fallback when the env var is unset; history rows never carry the URL or email.
 *  - webhook checkout.session.completed with a matching client_reference_id → PAID (session id stored),
 *    shortlist released, family emailed their private link, admin emailed "Paid"; a duplicate event is a
 *    no-op; a wrong or missing client_reference_id is ignored (falls through).
 *  - the shortlist stays hidden from the family before payment.
 *  - sweep: ONE reminder at 3 days; EXPIRED at 14 days + admin email (no more family emails); reopen works.
 */
jest.mock('@/lib/prisma', () => {
  const p: any = {
    conciergeOrder: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}), findMany: jest.fn().mockResolvedValue([]), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    entityEvent: { create: jest.fn().mockResolvedValue({ id: 'evt' }) },
    stripeWebhookEvent: { create: jest.fn().mockResolvedValue({}) },
    user: { findMany: jest.fn().mockResolvedValue([{ id: 'admin-1' }]) },
  };
  p.$transaction = jest.fn(async (fn: any) => fn(p));
  return { prisma: p };
});
jest.mock('@/lib/email', () => ({
  sendConciergeFamilyEmail: jest.fn().mockResolvedValue(true),
  sendConciergePaidNotification: jest.fn().mockResolvedValue(true),
  sendConciergeAdminNotice: jest.fn().mockResolvedValue(true),
}));
jest.mock('@/lib/services/notifications', () => ({ createInAppNotification: jest.fn().mockResolvedValue({ success: true }) }));
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { sendConciergeAdminNotice, sendConciergeFamilyEmail, sendConciergePaidNotification } from '@/lib/email';
import {
  configuredPaymentLink, handlePaymentLinkCheckoutCompleted, isFullDiscountTestSession, isStripePaymentLinkUrl, markPaid, paymentLinkFor, releaseShortlist,
  reopenOrder, runConciergeOrderSweep, sendPaymentLink,
} from '@/lib/concierge/pay-when-ready';
import { isShortlistVisibleToFamily, signShortlistToken, verifyShortlistToken } from '@/lib/concierge/shortlist-token';
import { conciergeConfirmationEmail, conciergePaymentLinkEmail, conciergePaymentReminderEmail, conciergeShortlistReleasedEmail } from '@/lib/concierge/family-emails';
import { CONCIERGE_OFFER } from '@/lib/concierge/offer';

const P = prisma as any;
const send = sendConciergeFamilyEmail as jest.Mock;
const actor = { userId: 'admin-1', role: 'ADMIN' };
const ENV_LINK = 'https://buy.stripe.com/live_ENVLINK';
const PASTED = 'https://buy.stripe.com/test_abc123';
const flush = () => new Promise((r) => setImmediate(r));

const order = (over: Record<string, unknown> = {}) => ({
  id: 'ordabc12345', status: 'REQUESTED_UNPAID', email: 'fam@example.com', amountCents: 39900,
  paymentLinkUrl: null, paymentLinkSentAt: null, shortlistReleasedAt: null, paymentReminderSentAt: null, expiredAt: null,
  placementSearch: { id: 'ps-1', conciergeStatus: 'SHORTLIST_READY', curatedHomes: [{ homeId: 'h1' }, { homeId: 'h2' }] },
  ...over,
});
const completed = (id: string, over: Record<string, unknown> = {}) =>
  ({ id, type: 'checkout.session.completed', data: { object: { id: 'cs_pl_1', payment_intent: 'pi_1', amount_total: 39900, payment_status: 'paid', client_reference_id: 'ordabc12345', metadata: {}, ...over } } }) as any;

beforeEach(() => {
  jest.clearAllMocks();
  process.env.NEXTAUTH_SECRET = 'test-secret-pay-when-ready';
  delete process.env.CONCIERGE_PAYMENT_LINK_URL;
  P.stripeWebhookEvent.create.mockResolvedValue({});
  P.conciergeOrder.updateMany.mockResolvedValue({ count: 1 });
  P.conciergeOrder.findMany.mockResolvedValue([]);
});

describe('payment link URL', () => {
  it('accepts buy.stripe.com links only', () => {
    expect(isStripePaymentLinkUrl(PASTED)).toBe(true);
    for (const bad of ['http://buy.stripe.com/x', 'https://evil.com/buy.stripe.com', 'https://buy.stripe.com.evil.com/x', 'https://buy.stripe.com/', 'https://u:p@buy.stripe.com/x', 'javascript:alert(1)', 'not a url'])
      expect(isStripePaymentLinkUrl(bad)).toBe(false);
  });
  it('CONCIERGE_PAYMENT_LINK_URL is used only when it is a Stripe Payment Link', () => {
    expect(configuredPaymentLink({})).toBeNull();
    expect(configuredPaymentLink({ CONCIERGE_PAYMENT_LINK_URL: 'https://example.com/x' } as any)).toBeNull();
    expect(configuredPaymentLink({ CONCIERGE_PAYMENT_LINK_URL: ENV_LINK } as any)).toBe(ENV_LINK);
  });
  it('{URL}?client_reference_id={orderId}&prefilled_email={email}, encoded', () => {
    const u = new URL(paymentLinkFor(ENV_LINK, 'ordabc12345', 'fam+x@example.com'));
    expect(u.origin + u.pathname).toBe(ENV_LINK);
    expect(u.searchParams.get('client_reference_id')).toBe('ordabc12345');
    expect(u.searchParams.get('prefilled_email')).toBe('fam+x@example.com');
  });
});

describe('"Shortlist ready — send payment link"', () => {
  it('uses CONCIERGE_PAYMENT_LINK_URL automatically (no paste), records a URL-free history row and emails it', async () => {
    process.env.CONCIERGE_PAYMENT_LINK_URL = ENV_LINK;
    P.conciergeOrder.findUnique.mockResolvedValue(order());
    expect(await sendPaymentLink({ orderId: 'ordabc12345', actor })).toEqual({ ok: true, status: 'REQUESTED_UNPAID', emailed: true });
    const data = P.conciergeOrder.update.mock.calls[0][0].data;
    expect(data.paymentLinkUrl).toBe(`${ENV_LINK}?client_reference_id=ordabc12345&prefilled_email=fam%40example.com`);
    expect(data.paymentLinkSentAt).toBeInstanceOf(Date);
    const ev = P.entityEvent.create.mock.calls[0][0].data;
    expect(ev.eventType).toBe('order.payment_link_sent');
    expect(JSON.stringify(ev)).not.toMatch(/stripe\.com|fam@example/);
    expect(send.mock.calls[0][0]).toMatchObject({ toEmail: 'fam@example.com', kind: 'payment_link' });
    expect(send.mock.calls[0][0].email.text).toContain('client_reference_id=ordabc12345');
  });
  it('the env link wins over anything pasted; the pasted link is only a fallback when the env var is unset', async () => {
    process.env.CONCIERGE_PAYMENT_LINK_URL = ENV_LINK;
    P.conciergeOrder.findUnique.mockResolvedValue(order());
    await sendPaymentLink({ orderId: 'ordabc12345', paymentLinkUrl: PASTED, actor });
    expect(P.conciergeOrder.update.mock.calls[0][0].data.paymentLinkUrl).toContain(ENV_LINK);
    delete process.env.CONCIERGE_PAYMENT_LINK_URL;
    P.conciergeOrder.update.mockClear();
    await sendPaymentLink({ orderId: 'ordabc12345', paymentLinkUrl: PASTED, actor });
    expect(P.conciergeOrder.update.mock.calls[0][0].data.paymentLinkUrl).toBe(`${PASTED}?client_reference_id=ordabc12345&prefilled_email=fam%40example.com`);
  });
  it('refuses with no link at all, before the shortlist is saved, and for a paid order', async () => {
    P.conciergeOrder.findUnique.mockResolvedValue(order());
    expect(await sendPaymentLink({ orderId: 'ordabc12345', actor })).toMatchObject({ ok: false, code: 400 });
    expect(await sendPaymentLink({ orderId: 'ordabc12345', paymentLinkUrl: 'https://example.com/pay', actor })).toMatchObject({ ok: false, code: 400 });
    P.conciergeOrder.findUnique.mockResolvedValue(order({ placementSearch: { id: 'ps-1', conciergeStatus: 'MATCHING', curatedHomes: null } }));
    expect(await sendPaymentLink({ orderId: 'ordabc12345', paymentLinkUrl: PASTED, actor })).toMatchObject({ ok: false, code: 409 });
    P.conciergeOrder.findUnique.mockResolvedValue(order({ status: 'PAID' }));
    expect(await sendPaymentLink({ orderId: 'ordabc12345', paymentLinkUrl: PASTED, actor })).toMatchObject({ ok: false, code: 409 });
    expect(send).not.toHaveBeenCalled();
  });
});

describe('Stripe webhook: checkout.session.completed from the Payment Link', () => {
  it('marks PAID (session id stored), releases the shortlist, emails the family their private link and the admin "Paid"', async () => {
    P.conciergeOrder.findUnique.mockResolvedValue(order({ paymentLinkSentAt: new Date() }));
    const r = await handlePaymentLinkCheckoutCompleted(completed('evt_1'));
    expect(r).toEqual({ handled: true, orderId: 'ordabc12345', status: 'PAID', released: true });
    expect(P.conciergeOrder.update).toHaveBeenCalledWith({ where: { id: 'ordabc12345' }, data: expect.objectContaining({ status: 'PAID', stripeCheckoutSessionId: 'cs_pl_1', stripePaymentIntentId: 'pi_1', amountCents: 39900, paidAt: expect.any(Date) }) });
    expect(P.conciergeOrder.update).toHaveBeenCalledWith({ where: { id: 'ordabc12345' }, data: { shortlistReleasedAt: expect.any(Date) } });
    const fam = send.mock.calls.find((c) => c[0].kind === 'shortlist_released')![0];
    const token = decodeURIComponent(fam.email.text.match(/\/concierge\/shortlist\/(\S+)/)[1]);
    expect(verifyShortlistToken(token, 'test-secret-pay-when-ready')?.orderId).toBe('ordabc12345');
    await flush();
    expect(sendConciergePaidNotification).toHaveBeenCalledWith({ requestId: 'ps-1', orderId: 'ordabc12345', amountCents: 39900 });
    const events = P.entityEvent.create.mock.calls.map((c: any) => c[0].data.eventType);
    expect(events).toEqual(['order.paid', 'order.shortlist_released']);
  });

  it('a duplicate event changes nothing', async () => {
    P.conciergeOrder.findUnique.mockResolvedValue(order());
    P.stripeWebhookEvent.create.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 'P2002' }));
    expect(await handlePaymentLinkCheckoutCompleted(completed('evt_1'))).toMatchObject({ handled: true, duplicate: true });
    expect(P.conciergeOrder.update).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
    // …and a second distinct event for an already-PAID order is a no-op too.
    P.conciergeOrder.findUnique.mockResolvedValue(order({ status: 'PAID' }));
    expect(await handlePaymentLinkCheckoutCompleted(completed('evt_2'))).toMatchObject({ handled: true, status: 'PAID', duplicate: true });
    expect(P.conciergeOrder.update).not.toHaveBeenCalled();
  });

  it('a wrong or missing client_reference_id is ignored (falls through to the other handlers)', async () => {
    P.conciergeOrder.findUnique.mockResolvedValue(null);
    expect(await handlePaymentLinkCheckoutCompleted(completed('evt_3', { client_reference_id: 'nosuchorder123' }))).toEqual({ handled: false });
    expect(await handlePaymentLinkCheckoutCompleted(completed('evt_4', { client_reference_id: null }))).toEqual({ handled: false });
    expect(await handlePaymentLinkCheckoutCompleted(completed('evt_5', { client_reference_id: "x' OR 1=1" }))).toEqual({ handled: false });
    expect(await handlePaymentLinkCheckoutCompleted({ ...completed('evt_6'), type: 'invoice.paid' })).toEqual({ handled: false });
    expect(P.stripeWebhookEvent.create).not.toHaveBeenCalled();
    expect(P.conciergeOrder.update).not.toHaveBeenCalled();
  });

  it('a late payment on an EXPIRED order still marks it paid and releases', async () => {
    P.conciergeOrder.findUnique.mockResolvedValue(order({ status: 'EXPIRED' }));
    expect(await handlePaymentLinkCheckoutCompleted(completed('evt_7'))).toMatchObject({ handled: true, status: 'PAID', released: true });
  });
});

describe('$0 acceptance test: a one-time 100%-off promo code', () => {
  const zero = (id: string, over: Record<string, unknown> = {}) =>
    completed(id, { amount_total: 0, amount_subtotal: 39900, total_details: { amount_discount: 39900, amount_shipping: 0, amount_tax: 0 }, payment_status: 'no_payment_required', payment_intent: null, ...over });

  it('a full discount pays the order at $0, releases the shortlist, and is logged as a test', async () => {
    P.conciergeOrder.findUnique.mockResolvedValue(order({ paymentLinkSentAt: new Date() }));
    expect(await handlePaymentLinkCheckoutCompleted(zero('evt_z1'))).toEqual({ handled: true, orderId: 'ordabc12345', status: 'PAID', released: true });
    expect(P.conciergeOrder.update).toHaveBeenCalledWith({ where: { id: 'ordabc12345' }, data: expect.objectContaining({ status: 'PAID', amountCents: 0, stripePaymentIntentId: null }) });
    const paid = P.entityEvent.create.mock.calls.find((c: any) => c[0].data.eventType === 'order.paid')[0].data;
    expect(paid.newValue).toMatchObject({ amountCents: 0, source: 'payment_link_test' });
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('test checkout'), expect.objectContaining({ orderId: 'ordabc12345' }));
    expect(send.mock.calls.filter((c) => c[0].kind === 'shortlist_released')).toHaveLength(1);
    await flush();
    expect(sendConciergePaidNotification).toHaveBeenCalledTimes(1);
  });

  it('a partial discount, or $0 with no discount, is not paid', async () => {
    P.conciergeOrder.findUnique.mockResolvedValue(order({ paymentLinkSentAt: new Date() }));
    const partial = zero('evt_z2', { total_details: { amount_discount: 20000 } });
    expect(await handlePaymentLinkCheckoutCompleted(partial)).toEqual({ handled: true, orderId: 'ordabc12345', status: 'REQUESTED_UNPAID' });
    expect(await handlePaymentLinkCheckoutCompleted(zero('evt_z3', { total_details: { amount_discount: 0 } }))).toMatchObject({ status: 'REQUESTED_UNPAID' });
    expect(await handlePaymentLinkCheckoutCompleted(zero('evt_z4', { amount_subtotal: 0, total_details: { amount_discount: 0 } }))).toMatchObject({ status: 'REQUESTED_UNPAID' });
    expect(await handlePaymentLinkCheckoutCompleted(zero('evt_z5', { payment_status: 'unpaid' }))).toMatchObject({ status: 'REQUESTED_UNPAID' });
    expect(P.conciergeOrder.update).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('the same $0 event delivered again changes nothing', async () => {
    P.conciergeOrder.findUnique.mockResolvedValue(order({ status: 'PAID' }));
    P.stripeWebhookEvent.create.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 'P2002' }));
    expect(await handlePaymentLinkCheckoutCompleted(zero('evt_z1'))).toMatchObject({ handled: true, duplicate: true });
    expect(P.conciergeOrder.update).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('isFullDiscountTestSession', () => {
    expect(isFullDiscountTestSession(zero('e').data.object)).toBe(true);
    expect(isFullDiscountTestSession(completed('e').data.object)).toBe(false);
  });
});

describe('the shortlist stays hidden from the family before payment', () => {
  it('visibility needs PAID and released', () => {
    expect(isShortlistVisibleToFamily(null)).toBe(false);
    expect(isShortlistVisibleToFamily({ status: 'REQUESTED_UNPAID', shortlistReleasedAt: new Date() })).toBe(false);
    expect(isShortlistVisibleToFamily({ status: 'EXPIRED', shortlistReleasedAt: null })).toBe(false);
    expect(isShortlistVisibleToFamily({ status: 'PAID', shortlistReleasedAt: null })).toBe(false);
    expect(isShortlistVisibleToFamily({ status: 'PAID', shortlistReleasedAt: new Date() })).toBe(true);
  });
  it('manual release refuses until the order is PAID; tokens cannot be forged or outlive their expiry', async () => {
    P.conciergeOrder.findUnique.mockResolvedValue(order());
    expect(await releaseShortlist({ orderId: 'ordabc12345', actor })).toMatchObject({ ok: false, code: 409 });
    const t = signShortlistToken('ordabc12345', 's1');
    expect(verifyShortlistToken(t, 's2')).toBeNull();
    expect(verifyShortlistToken(signShortlistToken('ordabc12345', 's1', { ttlDays: -1 }), 's1')).toBeNull();
  });
  it('manual fallbacks: mark paid (also from EXPIRED) then release', async () => {
    P.conciergeOrder.findUnique.mockResolvedValue(order({ status: 'EXPIRED' }));
    expect(await markPaid({ orderId: 'ordabc12345', actor })).toEqual({ ok: true, status: 'PAID' });
    P.conciergeOrder.findUnique.mockResolvedValue(order({ status: 'PAID' }));
    expect(await releaseShortlist({ orderId: 'ordabc12345', actor })).toEqual({ ok: true, status: 'PAID', emailed: true });
  });
});

describe('sweep: one reminder at 3 days, expiry at 14 days, reopen', () => {
  const now = new Date('2026-11-20T12:00:00Z');
  const daysAgo = (d: number) => new Date(now.getTime() - d * 864e5);

  it('the reminder goes out once, 3+ days after the link, with the same payment link', async () => {
    P.conciergeOrder.findMany.mockImplementation(async (args: any) =>
      args.where.paymentReminderSentAt === null ? [{ id: 'ordabc12345', email: 'fam@example.com', paymentLinkUrl: `${ENV_LINK}?client_reference_id=ordabc12345` }] : [],
    );
    expect(await runConciergeOrderSweep(now)).toEqual({ reminded: 1, expired: 0 });
    const q = P.conciergeOrder.findMany.mock.calls.find((c: any) => c[0].where.paymentReminderSentAt === null)[0].where;
    expect(q.status).toBe('REQUESTED_UNPAID');
    expect(q.paymentLinkSentAt.lte).toEqual(daysAgo(3));
    expect(q.paymentLinkSentAt.gt).toEqual(daysAgo(14));
    // Claimed with a conditional update so a second (or concurrent) run can't send it again.
    expect(P.conciergeOrder.updateMany).toHaveBeenCalledWith({ where: { id: 'ordabc12345', status: 'REQUESTED_UNPAID', paymentReminderSentAt: null }, data: { paymentReminderSentAt: now } });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toMatchObject({ toEmail: 'fam@example.com', kind: 'payment_reminder' });
    expect(send.mock.calls[0][0].email.text).toContain('client_reference_id=ordabc12345');

    // Second run: the claim finds nothing to update → no second email.
    send.mockClear();
    P.conciergeOrder.updateMany.mockResolvedValue({ count: 0 });
    expect(await runConciergeOrderSweep(now)).toEqual({ reminded: 0, expired: 0 });
    expect(send).not.toHaveBeenCalled();
  });

  it('still unpaid at 14 days → EXPIRED + one admin email, never a family email', async () => {
    P.conciergeOrder.findMany.mockImplementation(async (args: any) => (args.where.paymentReminderSentAt === undefined ? [{ id: 'ordabc12345', placementSearchId: 'ps-1' }] : []));
    expect(await runConciergeOrderSweep(now)).toEqual({ reminded: 0, expired: 1 });
    const q = P.conciergeOrder.findMany.mock.calls[0][0].where;
    expect(q).toEqual({ status: 'REQUESTED_UNPAID', paymentLinkSentAt: { lte: daysAgo(14) } });
    expect(P.conciergeOrder.updateMany).toHaveBeenCalledWith({ where: { id: 'ordabc12345', status: 'REQUESTED_UNPAID' }, data: { status: 'EXPIRED', expiredAt: now } });
    await flush();
    expect(sendConciergeAdminNotice).toHaveBeenCalledTimes(1);
    expect((sendConciergeAdminNotice as jest.Mock).mock.calls[0][0]).toMatchObject({ requestId: 'ps-1' });
    expect(send).not.toHaveBeenCalled();
  });

  it('reopen: EXPIRED → REQUESTED_UNPAID, clears the expiry and the link clock (no instant re-expiry); refuses other statuses', async () => {
    P.conciergeOrder.findUnique.mockResolvedValue(order({ status: 'EXPIRED', expiredAt: daysAgo(1), paymentLinkSentAt: daysAgo(15) }));
    expect(await reopenOrder({ orderId: 'ordabc12345', actor })).toEqual({ ok: true, status: 'REQUESTED_UNPAID' });
    expect(P.conciergeOrder.update).toHaveBeenCalledWith({ where: { id: 'ordabc12345' }, data: { status: 'REQUESTED_UNPAID', expiredAt: null, paymentLinkSentAt: null } });
    expect(P.entityEvent.create.mock.calls[0][0].data.eventType).toBe('order.reopened');
    P.conciergeOrder.findUnique.mockResolvedValue(order({ status: 'PAID' }));
    expect(await reopenOrder({ orderId: 'ordabc12345', actor })).toMatchObject({ ok: false, code: 409 });
  });
});

describe('family emails', () => {
  const all = [
    conciergeConfirmationEmail({ waitlisted: false }),
    conciergeConfirmationEmail({ waitlisted: true }),
    conciergePaymentLinkEmail({ paymentLinkUrl: PASTED }),
    conciergePaymentReminderEmail({ paymentLinkUrl: PASTED }),
    conciergeShortlistReleasedEmail({ shortlistUrl: 'https://getcarelinkai.com/concierge/shortlist/x.y' }),
  ];
  it('the confirmation carries the #29 terms word for word, the next steps and our phone number', () => {
    expect(all[0]!.text).toContain(CONCIERGE_OFFER.terms);
    for (const s of CONCIERGE_OFFER.nextSteps) expect(all[0]!.text).toContain(s);
  });
  it('no email promises a turnaround; every one has the phone number; the reminder says it is the only one', () => {
    for (const e of all) {
      expect(`${e.subject}\n${e.text}\n${e.html}`).not.toMatch(/business day|within \d+ (hours?|days?)|full refund|or you pay nothing/i);
      expect(e.text).toContain('(216) 245-9482');
    }
    expect(all[3]!.text).toContain('This is our only reminder.');
  });
});
