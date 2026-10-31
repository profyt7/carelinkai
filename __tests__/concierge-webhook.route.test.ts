/**
 * OL-248 — the Stripe webhook route and the concierge cron route.
 *  - production: a bad stripe-signature is rejected (400) and nothing is processed; a verified
 *    checkout.session.completed reaches the Payment Link handler; an unmatched session falls through.
 *  - /api/cron/concierge-orders fails closed without CRON_SECRET and runs the sweep with it.
 */
jest.mock('@/lib/stripe', () => ({ stripe: { webhooks: { constructEvent: jest.fn() } } }));
jest.mock('@/lib/concierge/pay-when-ready', () => ({
  handlePaymentLinkCheckoutCompleted: jest.fn(),
  runConciergeOrderSweep: jest.fn().mockResolvedValue({ reminded: 1, expired: 0 }),
}));
jest.mock('@/lib/concierge/orders', () => ({ isConciergeStripeEvent: jest.fn(() => false), handleConciergeStripeEvent: jest.fn() }));
jest.mock('@/lib/prisma', () => ({ prisma: {} }));
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));

import { NextRequest } from 'next/server';
import { stripe } from '@/lib/stripe';
import { handlePaymentLinkCheckoutCompleted, runConciergeOrderSweep } from '@/lib/concierge/pay-when-ready';
import { POST as webhook } from '@/app/api/webhooks/stripe/route';
import { POST as cron } from '@/app/api/cron/concierge-orders/route';

const construct = (stripe as any).webhooks.constructEvent as jest.Mock;
const handle = handlePaymentLinkCheckoutCompleted as jest.Mock;
const env = process.env as Record<string, string | undefined>;
const ORIG_ENV = env.NODE_ENV;

const event = { id: 'evt_1', type: 'checkout.session.completed', data: { object: { id: 'cs_1', client_reference_id: 'ordabc12345', metadata: {} } } };
const post = (sig: string | null) =>
  webhook(new NextRequest('http://localhost/api/webhooks/stripe', { method: 'POST', headers: sig ? { 'stripe-signature': sig } : {}, body: JSON.stringify(event) }));

beforeEach(() => {
  jest.clearAllMocks();
  env.NODE_ENV = 'production';
  env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  construct.mockImplementation((_raw: string, sig: string) => {
    if (sig !== 't=1,v1=good') throw new Error('No signatures found matching the expected signature for payload');
    return event;
  });
});
afterAll(() => {
  env.NODE_ENV = ORIG_ENV;
  delete env.STRIPE_WEBHOOK_SECRET;
});

describe('POST /api/webhooks/stripe (production)', () => {
  it('a bad signature is rejected (400) and nothing is processed', async () => {
    const res = await post('t=1,v1=forged');
    expect(res.status).toBe(400);
    expect(construct).toHaveBeenCalledWith(expect.any(String), 't=1,v1=forged', 'whsec_test');
    expect(handle).not.toHaveBeenCalled();
  });
  it('a missing signature is rejected (400)', async () => {
    expect((await post(null)).status).toBe(400);
    expect(handle).not.toHaveBeenCalled();
  });
  it('a verified checkout.session.completed reaches the Payment Link handler (200, concierge)', async () => {
    handle.mockResolvedValue({ handled: true, orderId: 'ordabc12345', status: 'PAID', released: true });
    const res = await post('t=1,v1=good');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ received: true, concierge: true, duplicate: false });
    expect(handle).toHaveBeenCalledWith(event);
  });
  it('an unmatched session falls through to the existing handlers (no concierge flag)', async () => {
    handle.mockResolvedValue({ handled: false });
    const res = await post('t=1,v1=good');
    expect(res.status).toBe(200);
    expect((await res.json()).concierge).toBeUndefined();
  });
});

describe('POST /api/cron/concierge-orders', () => {
  const call = (headers: Record<string, string>) => cron(new NextRequest('http://localhost/api/cron/concierge-orders', { method: 'POST', headers }));
  it('fails closed without CRON_SECRET or with the wrong one', async () => {
    delete env.CRON_SECRET;
    expect((await call({ authorization: 'Bearer x' })).status).toBe(401);
    env.CRON_SECRET = 's3cret';
    expect((await call({ authorization: 'Bearer nope' })).status).toBe(401);
    expect(runConciergeOrderSweep).not.toHaveBeenCalled();
  });
  it('runs the sweep and returns counts only', async () => {
    env.CRON_SECRET = 's3cret';
    const res = await call({ 'x-cron-secret': 's3cret' });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, reminded: 1, expired: 0 });
  });
});
