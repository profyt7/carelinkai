/**
 * Tests for the FOUNDER_20 founder-code flow (feat/stripe-golive-prep):
 * resolveFounderPromo validation + the subscribe route's checkout shaping
 * (valid code → 180-day trial + discount; invalid code → clean 400 before any
 * checkout; no code → standard 14-day trial, promo codes stay disabled).
 */

import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';

const mockStripe = {
  promotionCodes: { list: jest.fn() },
  customers: { create: jest.fn() },
  checkout: { sessions: { create: jest.fn() } },
};

jest.mock('@/lib/stripe', () => ({ stripe: mockStripe }));
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    operator: { findUnique: jest.fn(), update: jest.fn() },
  },
}));

import Stripe from 'stripe';
import { getServerSession } from 'next-auth';
import { FOUNDER_COUPON_ID, FOUNDER_TRIAL_DAYS, resolveFounderPromo } from '@/lib/billing/founder-code';
import { POST as postSubscribe } from '@/app/api/operator/billing/subscribe/route';
import { prisma } from '@/lib/prisma';

const mockedSession = getServerSession as jest.Mock;
const mockedList = mockStripe.promotionCodes.list as jest.Mock;
const mockedCheckout = mockStripe.checkout.sessions.create as jest.Mock;

const founderPromo = {
  id: 'promo_123',
  code: 'FOUNDER20',
  active: true,
  coupon: { id: FOUNDER_COUPON_ID },
};

beforeEach(() => {
  process.env.STRIPE_PRICE_STARTER = 'price_starter_test';
  mockedSession.mockResolvedValue({ user: { email: 'op@example.com' } } as never);
  (prisma.user.findUnique as jest.Mock).mockResolvedValue({
    id: 'user-1', email: 'op@example.com', role: 'OPERATOR', firstName: 'Op', lastName: 'Erator',
  } as never);
  (prisma.operator.findUnique as jest.Mock).mockResolvedValue({
    id: 'op-1', userId: 'user-1', companyName: 'Acme Care', stripeCustomerId: 'cus_existing',
  } as never);
  mockedCheckout.mockResolvedValue({ url: 'https://checkout.stripe.com/x' } as never);
  mockedList.mockResolvedValue({ data: [founderPromo] } as never);
});
afterEach(() => {
  jest.clearAllMocks();
  delete process.env.STRIPE_PRICE_STARTER;
});

describe('resolveFounderPromo', () => {
  const s = mockStripe as unknown as Stripe;

  it('resolves an active code on the FOUNDER_20 coupon (case/whitespace-insensitive)', async () => {
    const res = await resolveFounderPromo(s, '  founder20 ');
    expect(res).toEqual({ promotionCodeId: 'promo_123', code: 'FOUNDER20' });
    expect(mockedList).toHaveBeenCalledWith({ code: 'FOUNDER20', active: true, limit: 1 });
  });

  it('rejects codes belonging to a different coupon (e.g. legacy FOUNDERS49)', async () => {
    mockedList.mockResolvedValue({
      data: [{ id: 'promo_old', code: 'FOUNDERS49', active: true, coupon: { id: 'carelinkai_founders_rate' } }],
    } as never);
    expect(await resolveFounderPromo(s, 'FOUNDERS49')).toBeNull();
  });

  it('rejects unknown/exhausted codes (active filter returns nothing)', async () => {
    mockedList.mockResolvedValue({ data: [] } as never);
    expect(await resolveFounderPromo(s, 'NOPE123')).toBeNull();
  });

  it('rejects non-string, empty, and absurdly long input without calling Stripe', async () => {
    for (const bad of [null, undefined, 42, {}, '', 'X'.repeat(41)]) {
      expect(await resolveFounderPromo(s, bad)).toBeNull();
    }
    expect(mockedList).not.toHaveBeenCalled();
  });
});

describe('POST /api/operator/billing/subscribe — founder-code checkout shaping', () => {
  const req = (body: unknown) =>
    new NextRequest('http://localhost/api/operator/billing/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  it('valid founder code → 180-day trial + discount, promo-code entry disabled', async () => {
    const res = await postSubscribe(req({ plan: 'STARTER', founderCode: 'FOUNDER20' }));
    expect(res.status).toBe(200);
    const params = mockedCheckout.mock.calls[0][0] as any;
    expect(params.subscription_data.trial_period_days).toBe(FOUNDER_TRIAL_DAYS);
    expect(params.discounts).toEqual([{ promotion_code: 'promo_123' }]);
    expect(params.allow_promotion_codes).toBeUndefined(); // mutually exclusive with discounts
    expect(params.subscription_data.metadata.founderCode).toBe('FOUNDER20');
  });

  it('invalid founder code → 400 BEFORE any checkout session is created', async () => {
    mockedList.mockResolvedValue({ data: [] } as never);
    const res = await postSubscribe(req({ plan: 'STARTER', founderCode: 'TYPO99' }));
    expect(res.status).toBe(400);
    expect(mockedCheckout).not.toHaveBeenCalled();
  });

  it('no founder code → standard 14-day trial, promo codes disabled', async () => {
    const res = await postSubscribe(req({ plan: 'STARTER' }));
    expect(res.status).toBe(200);
    const params = mockedCheckout.mock.calls[0][0] as any;
    expect(params.subscription_data.trial_period_days).toBe(14);
    expect(params.allow_promotion_codes).toBe(false);
    expect(params.discounts).toBeUndefined();
    expect(mockedList).not.toHaveBeenCalled();
  });

  it('empty-string founder code is treated as no code (no validation round-trip)', async () => {
    const res = await postSubscribe(req({ plan: 'STARTER', founderCode: '' }));
    expect(res.status).toBe(200);
    expect(mockedList).not.toHaveBeenCalled();
    expect((mockedCheckout.mock.calls[0][0] as any).subscription_data.trial_period_days).toBe(14);
  });
});
