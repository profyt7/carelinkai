/**
 * OL-190 — featured listing as a standalone purchase.
 *  - POST /api/operator/homes/[id]/featured: flag off → 503; not the owner → 403;
 *    no active subscription → one-off Checkout (inline price_data + metadata),
 *    nothing featured yet; ACTIVE subscriber → invoice item + featured now.
 *  - Stripe webhook checkout.session.completed (type FEATURED_LISTING): features
 *    the home for 30 days and records a COMPLETED payment, once per session.
 * Stripe and Prisma are mocked.
 */

import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';

const getServerSession = jest.fn<(...a: any[]) => Promise<any>>();
jest.mock('next-auth/next', () => ({ getServerSession: (...a: unknown[]) => getServerSession(...a) }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));
jest.mock('@/lib/logger', () => {
  const l = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
  return { logger: l, bindRequestLogger: () => l };
});

const stripeMock = {
  invoiceItems: { create: jest.fn<(...a: any[]) => Promise<any>>() },
  customers: { create: jest.fn<(...a: any[]) => Promise<any>>() },
  checkout: { sessions: { create: jest.fn<(...a: any[]) => Promise<any>>() } },
  webhooks: { constructEvent: jest.fn() },
};
jest.mock('@/lib/stripe', () => ({ stripe: stripeMock }));

const tx = {
  assistedLivingHome: { findUnique: jest.fn<(...a: any[]) => Promise<any>>(), update: jest.fn<(...a: any[]) => Promise<any>>() },
  payment: { create: jest.fn<(...a: any[]) => Promise<any>>() },
};
const prisma: any = {
  assistedLivingHome: { findUnique: jest.fn<(...a: any[]) => Promise<any>>(), update: jest.fn<(...a: any[]) => Promise<any>>() },
  operator: { update: jest.fn<(...a: any[]) => Promise<any>>() },
  payment: { create: jest.fn<(...a: any[]) => Promise<any>>(), findUnique: jest.fn<(...a: any[]) => Promise<any>>() },
  $transaction: jest.fn(async (fn: any) => fn(tx)),
};
jest.mock('@/lib/prisma', () => ({ prisma }));

import { POST as featuredPOST } from '@/app/api/operator/homes/[id]/featured/route';
import { POST as webhookPOST } from '@/app/api/webhooks/stripe/route';
import { extendFeaturedUntil, isFeaturedActive, billsFeaturedOnInvoice } from '@/lib/billing/featured-listing';
import { featuredListingFeeCents } from '@/lib/billing/fees';

const ENV = { ...process.env };
const DAY = 86_400_000;

function enable() {
  return featuredPOST(
    new NextRequest('http://localhost/api/operator/homes/h1/featured', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'enable' }),
    }),
    { params: { id: 'h1' } },
  );
}

function homeRow(op: Partial<Record<string, any>> = {}, extra: Record<string, any> = {}) {
  return {
    id: 'h1',
    name: 'Maple House',
    isFeatured: false,
    featuredUntil: null,
    ...extra,
    operator: {
      id: 'op1',
      userId: 'u1',
      companyName: 'Maple LLC',
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscriptionStatus: null,
      user: { email: 'op@example.com', firstName: 'Pat', lastName: 'Lee' },
      ...op,
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...ENV, FEATURED_LISTING_ENABLED: '1', NEXT_PUBLIC_APP_URL: 'https://app.test' };
  delete process.env['FEATURED_LISTING_FEE_CENTS'];
  delete process.env['FEATURED_LISTING_DAYS'];
  delete process.env['STRIPE_WEBHOOK_SECRET'];
  getServerSession.mockResolvedValue({ user: { id: 'u1', role: 'OPERATOR' } });
  stripeMock.customers.create.mockResolvedValue({ id: 'cus_new' });
  stripeMock.checkout.sessions.create.mockResolvedValue({ id: 'cs_1', url: 'https://checkout.stripe.test/cs_1' });
  stripeMock.invoiceItems.create.mockResolvedValue({ id: 'ii_1' });
  prisma.payment.create.mockResolvedValue({ id: 'pay_1' });
  prisma.payment.findUnique.mockResolvedValue(null);
  tx.payment.create.mockResolvedValue({ id: 'pay_cs' });
  tx.assistedLivingHome.update.mockResolvedValue({});
});
afterAll(() => {
  process.env = ENV;
});

describe('helpers', () => {
  it('fee defaults to $79 and reads FEATURED_LISTING_FEE_CENTS', () => {
    expect(featuredListingFeeCents()).toBe(7900);
    process.env['FEATURED_LISTING_FEE_CENTS'] = '9900';
    expect(featuredListingFeeCents()).toBe(9900);
    process.env['FEATURED_LISTING_FEE_CENTS'] = 'abc';
    expect(featuredListingFeeCents()).toBe(7900);
  });

  it('extends from the later of now and the current expiry', () => {
    const now = new Date('2026-10-25T00:00:00Z');
    expect(extendFeaturedUntil(null, now).getTime()).toBe(now.getTime() + 30 * DAY);
    const past = new Date(now.getTime() - 5 * DAY);
    expect(extendFeaturedUntil(past, now).getTime()).toBe(now.getTime() + 30 * DAY);
    const future = new Date(now.getTime() + 10 * DAY);
    expect(extendFeaturedUntil(future, now).getTime()).toBe(now.getTime() + 40 * DAY);
  });

  it('an expired window is not featured', () => {
    const now = new Date('2026-10-25T00:00:00Z');
    expect(isFeaturedActive({ isFeatured: true, featuredUntil: new Date(now.getTime() - 1) }, now)).toBe(false);
    expect(isFeaturedActive({ isFeatured: true, featuredUntil: new Date(now.getTime() + DAY) }, now)).toBe(true);
    expect(isFeaturedActive({ isFeatured: false, featuredUntil: null }, now)).toBe(false);
  });

  it('only an ACTIVE subscription bills on the invoice (a trialing founder pays at Checkout)', () => {
    const base = { stripeCustomerId: 'cus_1', stripeSubscriptionId: 'sub_1' };
    expect(billsFeaturedOnInvoice({ ...base, subscriptionStatus: 'ACTIVE' })).toBe(true);
    for (const s of ['TRIALING', 'PAST_DUE', 'CANCELED', null]) {
      expect(billsFeaturedOnInvoice({ ...base, subscriptionStatus: s })).toBe(false);
    }
    expect(billsFeaturedOnInvoice({ stripeCustomerId: null, stripeSubscriptionId: null, subscriptionStatus: null })).toBe(false);
  });
});

describe('POST /api/operator/homes/[id]/featured (enable)', () => {
  it('flag off → 503 before any lookup or Stripe call', async () => {
    delete process.env['FEATURED_LISTING_ENABLED'];
    const res = await enable();
    expect(res.status).toBe(503);
    expect(prisma.assistedLivingHome.findUnique).not.toHaveBeenCalled();
    expect(stripeMock.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it('not the owner → 403, no Stripe call', async () => {
    prisma.assistedLivingHome.findUnique.mockResolvedValue(homeRow({ userId: 'someone-else' }));
    const res = await enable();
    expect(res.status).toBe(403);
    expect(stripeMock.checkout.sessions.create).not.toHaveBeenCalled();
    expect(stripeMock.invoiceItems.create).not.toHaveBeenCalled();
  });

  it('no subscription → creates a customer and a one-off Checkout; nothing featured, no payment row yet', async () => {
    prisma.assistedLivingHome.findUnique.mockResolvedValue(homeRow());
    const res = await enable();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, billing: 'checkout', url: 'https://checkout.stripe.test/cs_1' });

    expect(stripeMock.customers.create).toHaveBeenCalledWith(expect.objectContaining({ email: 'op@example.com', metadata: { operatorId: 'op1', userId: 'u1' } }));
    expect(prisma.operator.update).toHaveBeenCalledWith({ where: { id: 'op1' }, data: { stripeCustomerId: 'cus_new' } });
    const args = stripeMock.checkout.sessions.create.mock.calls[0]![0] as any;
    expect(args).toMatchObject({
      customer: 'cus_new',
      mode: 'payment',
      success_url: 'https://app.test/operator/homes/h1/edit?featured=success',
      cancel_url: 'https://app.test/operator/homes/h1/edit?featured=canceled',
      metadata: { type: 'FEATURED_LISTING', homeId: 'h1', operatorId: 'op1' },
    });
    expect(args.line_items).toEqual([
      { price_data: { currency: 'usd', product_data: expect.objectContaining({ name: 'Featured listing — Maple House' }), unit_amount: 7900 }, quantity: 1 },
    ]);
    expect(prisma.assistedLivingHome.update).not.toHaveBeenCalled();
    expect(prisma.payment.create).not.toHaveBeenCalled();
    expect(stripeMock.invoiceItems.create).not.toHaveBeenCalled();
  });

  it('trialing founder with an existing customer → Checkout reuses the customer', async () => {
    prisma.assistedLivingHome.findUnique.mockResolvedValue(homeRow({ stripeCustomerId: 'cus_old', stripeSubscriptionId: 'sub_1', subscriptionStatus: 'TRIALING' }));
    const res = await enable();
    expect((await res.json()).billing).toBe('checkout');
    expect(stripeMock.customers.create).not.toHaveBeenCalled();
    expect((stripeMock.checkout.sessions.create.mock.calls[0]![0] as any).customer).toBe('cus_old');
  });

  it('Checkout failure → 502, nothing featured', async () => {
    prisma.assistedLivingHome.findUnique.mockResolvedValue(homeRow({ stripeCustomerId: 'cus_old' }));
    stripeMock.checkout.sessions.create.mockRejectedValue(new Error('stripe down'));
    const res = await enable();
    expect(res.status).toBe(502);
    expect(prisma.assistedLivingHome.update).not.toHaveBeenCalled();
  });

  it('ACTIVE subscriber → invoice item for the fee, featured for 30 days now', async () => {
    prisma.assistedLivingHome.findUnique.mockResolvedValue(homeRow({ stripeCustomerId: 'cus_sub', stripeSubscriptionId: 'sub_1', subscriptionStatus: 'ACTIVE' }));
    const res = await enable();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.billing).toBe('invoice');
    expect(body.isFeatured).toBe(true);
    expect(stripeMock.checkout.sessions.create).not.toHaveBeenCalled();
    expect(stripeMock.invoiceItems.create).toHaveBeenCalledWith(expect.objectContaining({ customer: 'cus_sub', amount: 7900 }));
    const upd = prisma.assistedLivingHome.update.mock.calls[0]![0] as any;
    expect(upd.data.isFeatured).toBe(true);
    expect(Math.round((upd.data.featuredUntil.getTime() - Date.now()) / DAY)).toBe(30);
    expect(prisma.payment.create).toHaveBeenCalledWith({ data: expect.objectContaining({ status: 'PROCESSING', type: 'FEATURED_LISTING_FEE', stripePaymentId: 'ii_1', amount: 79 }) });
  });
});

describe('Stripe webhook — checkout.session.completed (FEATURED_LISTING)', () => {
  function deliver(session: Record<string, any>) {
    const event = { id: 'evt_1', type: 'checkout.session.completed', data: { object: { id: 'cs_paid', object: 'checkout.session', payment_status: 'paid', amount_total: 7900, ...session } } };
    const req = { text: async () => JSON.stringify(event), headers: { get: () => null }, nextUrl: new URL('http://localhost/api/webhooks/stripe'), url: 'http://localhost/api/webhooks/stripe' } as unknown as NextRequest;
    return webhookPOST(req);
  }
  const META = { type: 'FEATURED_LISTING', homeId: 'h1', operatorId: 'op1' };

  it('paid → payment recorded and home featured for 30 days', async () => {
    tx.assistedLivingHome.findUnique.mockResolvedValue({ id: 'h1', name: 'Maple House', featuredUntil: null, operator: { id: 'op1', userId: 'u1' } });
    const res = await deliver({ metadata: META });
    expect(res.status).toBe(200);
    expect((await res.json()).featuredListing).toBe('fulfilled');
    expect(tx.payment.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: 'u1', amount: 79, status: 'COMPLETED', type: 'FEATURED_LISTING_FEE', stripePaymentId: 'cs_paid' }) });
    const upd = tx.assistedLivingHome.update.mock.calls[0]![0] as any;
    expect(upd.where).toEqual({ id: 'h1' });
    expect(upd.data.isFeatured).toBe(true);
    expect(Math.round((upd.data.featuredUntil.getTime() - Date.now()) / DAY)).toBe(30);
  });

  it('extends an open window rather than restarting it', async () => {
    const current = new Date(Date.now() + 10 * DAY);
    tx.assistedLivingHome.findUnique.mockResolvedValue({ id: 'h1', name: 'Maple House', featuredUntil: current, operator: { id: 'op1', userId: 'u1' } });
    await deliver({ metadata: META });
    const upd = tx.assistedLivingHome.update.mock.calls[0]![0] as any;
    expect(upd.data.featuredUntil.getTime()).toBe(current.getTime() + 30 * DAY);
  });

  it('replayed session → duplicate, nothing extended', async () => {
    prisma.payment.findUnique.mockResolvedValue({ id: 'pay_cs' });
    const res = await deliver({ metadata: META });
    expect((await res.json()).featuredListing).toBe('duplicate');
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.assistedLivingHome.update).not.toHaveBeenCalled();
  });

  it('concurrent delivery losing the unique payment insert → duplicate, not an error', async () => {
    tx.assistedLivingHome.findUnique.mockResolvedValue({ id: 'h1', name: 'Maple House', featuredUntil: null, operator: { id: 'op1', userId: 'u1' } });
    tx.payment.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' }));
    const res = await deliver({ metadata: META });
    expect(res.status).toBe(200);
    expect((await res.json()).featuredListing).toBe('duplicate');
    expect(tx.assistedLivingHome.update).not.toHaveBeenCalled();
  });

  it('unpaid session → nothing featured', async () => {
    const res = await deliver({ metadata: META, payment_status: 'unpaid' });
    expect((await res.json()).featuredListing).toBe('unpaid');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('home not owned by the operator in metadata → invalid, nothing written', async () => {
    tx.assistedLivingHome.findUnique.mockResolvedValue({ id: 'h1', name: 'Maple House', featuredUntil: null, operator: { id: 'op2', userId: 'u2' } });
    const res = await deliver({ metadata: META });
    expect((await res.json()).featuredListing).toBe('invalid');
    expect(tx.payment.create).not.toHaveBeenCalled();
    expect(tx.assistedLivingHome.update).not.toHaveBeenCalled();
  });

  it('other checkout types are untouched by the featured branch', async () => {
    const res = await deliver({ metadata: { purchaseId: '' } });
    expect((await res.json()).featuredListing).toBeUndefined();
    expect(prisma.payment.findUnique).not.toHaveBeenCalled();
  });
});
