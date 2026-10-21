/**
 * Family Concierge orders + Stripe webhooks (sprint W5-3, G1):
 *  - checkout.session.completed → order PAID, queue row SUBMITTED, admin notified
 *    (in-app + ONE email, admin address only), EntityEvents source STRIPE;
 *  - idempotent on the Stripe event id — a redelivery changes nothing;
 *  - charge.refunded → REFUNDED (+ event); a refund for a non-concierge charge is
 *    left to the other handlers;
 *  - capStatus: cap reached → waitlist; flag unset → request.
 */

jest.mock('@/lib/prisma', () => {
  const p: any = {
    conciergeOrder: { count: jest.fn(), create: jest.fn(), update: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn() },
    placementSearch: { findUnique: jest.fn(), update: jest.fn() },
    stripeWebhookEvent: { create: jest.fn() },
    entityEvent: { create: jest.fn().mockResolvedValue({ id: 'evt' }), findMany: jest.fn().mockResolvedValue([]) },
    user: { findMany: jest.fn() },
  };
  p.$transaction = jest.fn(async (arg: unknown) => (typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(p) : Promise.all(arg as Promise<unknown>[])));
  return { prisma: p };
});
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));
jest.mock('@/lib/email', () => ({ sendConciergePaidNotification: jest.fn().mockResolvedValue(true) }));
jest.mock('@/lib/services/notifications', () => ({ createInAppNotification: jest.fn().mockResolvedValue({ success: true, id: 'n1' }) }));
jest.mock('@/lib/stripe', () => ({ stripe: { checkout: { sessions: { create: jest.fn() } } } }));

import { prisma } from '@/lib/prisma';
import { sendConciergePaidNotification } from '@/lib/email';
import { createInAppNotification } from '@/lib/services/notifications';
import { stripe } from '@/lib/stripe';
import { handleConciergeStripeEvent, isConciergeStripeEvent, capStatus, createOrder, createCheckoutSession } from '@/lib/concierge/orders';

const P = prisma as any;
const flush = () => new Promise((r) => setImmediate(r));

function completed(id: string, over: Record<string, unknown> = {}) {
  return {
    id,
    type: 'checkout.session.completed',
    data: { object: { id: 'cs_1', payment_intent: 'pi_1', amount_total: 39900, client_reference_id: 'ord_1', metadata: { type: 'FAMILY_CONCIERGE', orderId: 'ord_1', placementSearchId: 'ps_1' }, ...over } },
  } as any;
}
function refunded(id: string, over: Record<string, unknown> = {}) {
  return { id, type: 'charge.refunded', data: { object: { id: 'ch_1', payment_intent: 'pi_1', amount_refunded: 39900, metadata: {}, ...over } } } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  P.stripeWebhookEvent.create.mockResolvedValue({});
  P.conciergeOrder.findUnique.mockResolvedValue({ id: 'ord_1', status: 'PENDING_PAYMENT', placementSearchId: 'ps_1', familyUserId: null });
  P.conciergeOrder.update.mockResolvedValue({});
  P.placementSearch.findUnique.mockResolvedValue({ conciergeStatus: 'PENDING_PAYMENT' });
  P.placementSearch.update.mockResolvedValue({});
  P.user.findMany.mockResolvedValue([{ id: 'admin_1' }, { id: 'admin_2' }]);
  delete process.env['CONCIERGE_CHECKOUT_ENABLED'];
  delete process.env['CONCIERGE_MONTHLY_CAP'];
});

describe('isConciergeStripeEvent', () => {
  it('claims only concierge checkout sessions and refunds with a payment intent', () => {
    expect(isConciergeStripeEvent(completed('evt_a'))).toBe(true);
    expect(isConciergeStripeEvent(completed('evt_b', { metadata: { type: 'RIDE_PAYMENT' } }))).toBe(false);
    expect(isConciergeStripeEvent(refunded('evt_c'))).toBe(true);
    expect(isConciergeStripeEvent({ id: 'x', type: 'invoice.paid', data: { object: {} } } as any)).toBe(false);
  });
});

describe('checkout.session.completed → PAID', () => {
  it('marks the order PAID, promotes the queue row to SUBMITTED, records STRIPE events, notifies admins once', async () => {
    const r = await handleConciergeStripeEvent(completed('evt_1'));
    expect(r).toMatchObject({ handled: true, orderId: 'ord_1', status: 'PAID' });
    expect(P.stripeWebhookEvent.create).toHaveBeenCalledWith({ data: { id: 'evt_1', type: 'checkout.session.completed' } });
    expect(P.conciergeOrder.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'ord_1' }, data: expect.objectContaining({ status: 'PAID', stripePaymentIntentId: 'pi_1', stripeCheckoutSessionId: 'cs_1', amountCents: 39900 }) }));
    expect(P.placementSearch.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'ps_1' }, data: expect.objectContaining({ conciergeStatus: 'SUBMITTED' }) }));
    const events = P.entityEvent.create.mock.calls.map((c: any) => c[0].data);
    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({ entityType: 'CONCIERGE_ORDER', eventType: 'order.paid', source: 'STRIPE' }),
      expect.objectContaining({ entityType: 'PLACEMENT_SEARCH', eventType: 'status.changed', source: 'STRIPE' }),
    ]));
    await flush();
    expect(createInAppNotification).toHaveBeenCalledTimes(2); // one per admin
    expect(createInAppNotification).toHaveBeenCalledWith(expect.objectContaining({ userId: 'admin_1', type: 'PAYMENT', link: '/admin/concierge/ps_1' }));
    expect(sendConciergePaidNotification).toHaveBeenCalledTimes(1);
    expect(sendConciergePaidNotification).toHaveBeenCalledWith({ requestId: 'ps_1', orderId: 'ord_1', amountCents: 39900 });
    // The notification payload never carries family details.
    expect(JSON.stringify((createInAppNotification as jest.Mock).mock.calls)).not.toMatch(/@|contact|patient/i);
  });

  it('is idempotent on the event id: a redelivery writes nothing and notifies nobody', async () => {
    P.stripeWebhookEvent.create.mockRejectedValueOnce({ code: 'P2002' });
    const r = await handleConciergeStripeEvent(completed('evt_1'));
    expect(r).toMatchObject({ handled: true, duplicate: true, orderId: 'ord_1' });
    expect(P.conciergeOrder.update).not.toHaveBeenCalled();
    expect(P.placementSearch.update).not.toHaveBeenCalled();
    expect(P.entityEvent.create).not.toHaveBeenCalled();
    await flush();
    expect(createInAppNotification).not.toHaveBeenCalled();
    expect(sendConciergePaidNotification).not.toHaveBeenCalled();
  });

  it('a second, distinct completed event for an already-PAID order is a no-op', async () => {
    P.conciergeOrder.findUnique.mockResolvedValue({ id: 'ord_1', status: 'PAID', placementSearchId: 'ps_1', familyUserId: null });
    const r = await handleConciergeStripeEvent(completed('evt_2'));
    expect(r).toMatchObject({ handled: true, status: 'PAID' });
    expect(P.conciergeOrder.update).not.toHaveBeenCalled();
    await flush();
    expect(sendConciergePaidNotification).not.toHaveBeenCalled();
  });

  it('checkout.session.expired → CANCELED', async () => {
    const r = await handleConciergeStripeEvent({ ...completed('evt_3'), type: 'checkout.session.expired' });
    expect(r).toMatchObject({ handled: true, status: 'CANCELED' });
    expect(P.conciergeOrder.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'CANCELED' } }));
  });
});

describe('charge.refunded → REFUNDED', () => {
  it('finds the order by payment intent, marks it REFUNDED with a STRIPE event', async () => {
    P.conciergeOrder.findFirst.mockResolvedValue({ id: 'ord_1', status: 'PAID' });
    const r = await handleConciergeStripeEvent(refunded('evt_r1'));
    expect(r).toMatchObject({ handled: true, orderId: 'ord_1', status: 'REFUNDED' });
    expect(P.conciergeOrder.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { stripePaymentIntentId: 'pi_1' } }));
    expect(P.conciergeOrder.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'ord_1' }, data: expect.objectContaining({ status: 'REFUNDED', refundedAt: expect.any(Date) }) }));
    expect(P.entityEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ eventType: 'order.refunded', source: 'STRIPE', newValue: expect.objectContaining({ status: 'REFUNDED', amountCents: 39900 }) }) }));
  });
  it('a refund that is not a concierge order is left alone (handled: false)', async () => {
    P.conciergeOrder.findFirst.mockResolvedValue(null);
    expect(await handleConciergeStripeEvent(refunded('evt_r2'))).toEqual({ handled: false });
    expect(P.stripeWebhookEvent.create).not.toHaveBeenCalled();
  });
  it('a redelivered refund is a no-op', async () => {
    P.conciergeOrder.findFirst.mockResolvedValue({ id: 'ord_1', status: 'REFUNDED' });
    P.stripeWebhookEvent.create.mockRejectedValueOnce({ code: 'P2002' });
    const r = await handleConciergeStripeEvent(refunded('evt_r1'));
    expect(r).toMatchObject({ handled: true, duplicate: true });
    expect(P.conciergeOrder.update).not.toHaveBeenCalled();
  });
});

describe('capacity + orders', () => {
  it('counts PAID + REQUESTED_UNPAID this month; cap reached → waitlist', async () => {
    P.conciergeOrder.count.mockResolvedValue(4);
    const s = await capStatus(new Date('2026-10-17T00:00:00Z'));
    expect(P.conciergeOrder.count).toHaveBeenCalledWith({ where: { status: { in: ['PAID', 'REQUESTED_UNPAID'] }, createdAt: { gte: new Date('2026-10-01T00:00:00.000Z') } } });
    expect(s).toMatchObject({ cap: 4, committed: 4, capReached: true, checkoutEnabled: false, mode: 'waitlist' });
  });
  it('flag unset → request; flag set + preflight green and under cap → checkout; flag set but preflight red → request (OL-162)', async () => {
    P.conciergeOrder.count.mockResolvedValue(1);
    expect((await capStatus()).mode).toBe('request');
    process.env['CONCIERGE_CHECKOUT_ENABLED'] = '1';
    // The flag alone is not enough: the Stripe key / price / webhook / admin email must be in place.
    expect((await capStatus()).mode).toBe('request');
    Object.assign(process.env, { STRIPE_SECRET_KEY: 'sk_test_unit', STRIPE_PRICE_FAMILY_CONCIERGE: 'price_unit', STRIPE_WEBHOOK_SECRET: 'whsec_unit', ADMIN_NOTIFY_EMAIL: 'admin@example.com' });
    expect((await capStatus()).mode).toBe('checkout');
    for (const k of ['STRIPE_SECRET_KEY', 'STRIPE_PRICE_FAMILY_CONCIERGE', 'STRIPE_WEBHOOK_SECRET', 'ADMIN_NOTIFY_EMAIL']) delete process.env[k];
  });
  it('createOrder writes the order + order.created event (source FAMILY) in one transaction', async () => {
    P.conciergeOrder.create.mockResolvedValue({ id: 'ord_9', status: 'REQUESTED_UNPAID' });
    const o = await createOrder({ placementSearchId: 'ps_9', email: 'Fam@Example.com', status: 'REQUESTED_UNPAID' });
    expect(o).toEqual({ id: 'ord_9', status: 'REQUESTED_UNPAID' });
    expect(P.$transaction).toHaveBeenCalledTimes(1);
    expect(P.conciergeOrder.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ email: 'fam@example.com', status: 'REQUESTED_UNPAID', amountCents: 39900 }) }));
    expect(P.entityEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ entityType: 'CONCIERGE_ORDER', entityId: 'ord_9', eventType: 'order.created', source: 'FAMILY' }) }));
  });
  it('createCheckoutSession uses the existing Price and never creates products/prices', async () => {
    process.env['STRIPE_PRICE_FAMILY_CONCIERGE'] = 'price_test_399';
    (stripe.checkout.sessions.create as jest.Mock).mockResolvedValue({ id: 'cs_9', url: 'https://checkout.stripe.test/cs_9' });
    const s = await createCheckoutSession({ orderId: 'ord_9', placementSearchId: 'ps_9', email: 'fam@example.com' });
    expect(s).toEqual({ id: 'cs_9', url: 'https://checkout.stripe.test/cs_9' });
    const arg = (stripe.checkout.sessions.create as jest.Mock).mock.calls[0][0];
    expect(arg.mode).toBe('payment');
    expect(arg.line_items).toEqual([{ price: 'price_test_399', quantity: 1 }]);
    expect(arg.metadata).toMatchObject({ type: 'FAMILY_CONCIERGE', orderId: 'ord_9' });
    expect(arg.success_url).toContain('/concierge/thanks?order=ord_9');
    expect((stripe as any).products).toBeUndefined();
    expect((stripe as any).prices).toBeUndefined();
    delete process.env['STRIPE_PRICE_FAMILY_CONCIERGE'];
    await expect(createCheckoutSession({ orderId: 'o', placementSearchId: 'p', email: 'e@x.com' })).rejects.toThrow(/STRIPE_PRICE_FAMILY_CONCIERGE/);
  });
});
