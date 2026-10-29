/**
 * OL-186 — paid-feature kill switches. Every flag defaults OFF: the API answers
 * 503 with the feature's plain message. With the flag on the request goes past
 * the switch (here it then stops at the mocked auth / lookup — never 503).
 * Webhooks, refunds, cancellations and the billing portal are not gated.
 */

import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';

const getServerSession = jest.fn<(...a: any[]) => Promise<any>>();
jest.mock('next-auth', () => ({ getServerSession: (...a: unknown[]) => getServerSession(...a) }));
jest.mock('next-auth/next', () => ({ getServerSession: (...a: unknown[]) => getServerSession(...a) }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));
jest.mock('@/lib/sms/sms-service', () => ({ SMSService: jest.fn().mockImplementation(() => ({ isConfigured: () => false, sendSMS: jest.fn() })) }));
jest.mock('@/lib/email/transactional', () => ({ escapeHtml: (s: string) => s, sendEmail: jest.fn(async () => ({ success: true })) }));
jest.mock('@/lib/checkr', () => ({ CHECKR_PACKAGES: {}, createCandidate: jest.fn(), createReport: jest.fn(), createInvitation: jest.fn() }));
jest.mock('@/lib/services/family', () => ({ checkFamilyMembership: jest.fn() }));
jest.mock('@/lib/rbac', () => ({
  requireAnyRole: jest.fn(async () => {
    const { NextResponse } = await import('next/server');
    return { session: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }),
}));

const triggerMarketplaceHireFee = jest.fn<(...a: any[]) => Promise<void>>(async () => undefined);
jest.mock('@/lib/services/marketplace-hire-fee', () => ({ triggerMarketplaceHireFee: (...a: unknown[]) => triggerMarketplaceHireFee(...a) }));

const invoiceItemsCreate = jest.fn<(...a: any[]) => Promise<any>>(async () => ({ id: 'ii_1' }));
jest.mock('@/lib/stripe', () => ({
  stripe: {
    invoiceItems: { create: (...a: unknown[]) => invoiceItemsCreate(...a) },
    paymentIntents: { create: jest.fn(), retrieve: jest.fn() },
    checkout: { sessions: { create: jest.fn() } },
    customers: { create: jest.fn() },
    subscriptions: { retrieve: jest.fn(), update: jest.fn() },
  },
}));
jest.mock('stripe', () => jest.fn().mockImplementation(() => ({ checkout: { sessions: { create: jest.fn() } } })));

const prisma: any = {
  provider: { findUnique: jest.fn(async () => null) },
  assistedLivingHome: { findUnique: jest.fn(async () => null), update: jest.fn() },
  operator: { findFirst: jest.fn(), findUnique: jest.fn() },
  caregiver: { findUnique: jest.fn() },
  caregiverEmployment: { findFirst: jest.fn(async () => null), create: jest.fn(async () => ({})), update: jest.fn() },
  marketplaceHire: { create: jest.fn(async () => ({ id: 'hire_1' })) },
  notification: { create: jest.fn(async () => ({})) },
  payment: { create: jest.fn(async () => ({ id: 'pay_1' })), update: jest.fn(async () => ({})) },
  marketplaceApplication: { findUnique: jest.fn(), update: jest.fn() },
  caregiverShift: { findFirst: jest.fn(), update: jest.fn(() => 'shift-update') },
  shiftBid: { findFirst: jest.fn(), update: jest.fn(() => 'bid-update'), updateMany: jest.fn(() => 'bids-update') },
  $transaction: jest.fn(async () => [{ id: 'shift_1' }, { id: 'hire_1' }]),
};
jest.mock('@/lib/prisma', () => ({ prisma }));

import {
  PAID_FEATURES,
  PAID_FEATURE_KEYS,
  isPaidFeatureEnabled,
  paidFeatureFlags,
  paidFeatureStatus,
  paidFeatureDisabledResponse,
  type PaidFeatureKey,
} from '@/lib/billing/paid-features';

const ALL_ENVS = Object.values(PAID_FEATURES).map((f) => f.env);
const ENV = { ...process.env };
beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...ENV };
  for (const e of ALL_ENVS) delete process.env[e];
  getServerSession.mockResolvedValue(null);
});
afterAll(() => {
  process.env = ENV;
});

const on = (key: PaidFeatureKey) => { process.env[PAID_FEATURES[key].env] = '1'; };
const post = (url: string, body?: unknown) =>
  new NextRequest(`http://localhost${url}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body ?? {}) });

describe('registry', () => {
  it('has exactly the eleven switches (Family Plus retired OL-189; Provider Boost + the commission stub added 10/29), each with its env name', () => {
    expect(PAID_FEATURE_KEYS.map((k) => PAID_FEATURES[k].env).sort()).toEqual([
      'BACKGROUND_CHECKS_ENABLED',
      'CAREGIVER_PRO_ENABLED',
      'CARE_WALLET_ENABLED',
      'COMPLIANCE_KITS_ENABLED',
      'FEATURED_LISTING_ENABLED',
      'MARKETPLACE_HIRE_FEE_ENABLED',
      'OPERATOR_PLANS_ENABLED',
      'PROVIDER_BOOST_ENABLED',
      'PROVIDER_COMMISSION_ENABLED',
      'PROVIDER_LISTING_ENABLED',
      'RIDES_PAYMENTS_ENABLED',
    ]);
  });

  it('every flag defaults OFF', () => {
    expect(Object.values(paidFeatureFlags()).every((v) => v === false)).toBe(true);
  });

  it.each(['1', 'true', 'TRUE', 'yes', 'on', ' 1 '])('"%s" turns a flag on', (v) => {
    expect(isPaidFeatureEnabled('CARE_WALLET', { CARE_WALLET_ENABLED: v } as NodeJS.ProcessEnv)).toBe(true);
  });

  it.each(['', '0', 'false', 'no', 'off', 'enabled?'])('"%s" leaves a flag off', (v) => {
    expect(isPaidFeatureEnabled('CARE_WALLET', { CARE_WALLET_ENABLED: v } as NodeJS.ProcessEnv)).toBe(false);
  });

  it('the 503 helper: off → 503 + plain message; on → null', async () => {
    const res = paidFeatureDisabledResponse('CAREGIVER_PRO')!;
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'Caregiver Pro is not available yet.', feature: 'CAREGIVER_PRO', enabled: false });
    on('CAREGIVER_PRO');
    expect(paidFeatureDisabledResponse('CAREGIVER_PRO')).toBeNull();
  });

  it('status rows carry names and on/off only — never a value', () => {
    process.env['RIDES_PAYMENTS_ENABLED'] = 'yes';
    const rows = paidFeatureStatus();
    expect(rows).toHaveLength(11);
    expect(rows.find((r) => r.key === 'RIDES_PAYMENTS')).toEqual({ key: 'RIDES_PAYMENTS', env: 'RIDES_PAYMENTS_ENABLED', label: PAID_FEATURES.RIDES_PAYMENTS.label, enabled: true });
    expect(JSON.stringify(rows)).not.toContain('"yes"');
  });
});

describe('GET /api/paid-features', () => {
  it('returns booleans for every flag', async () => {
    const { GET } = await import('@/app/api/paid-features/route');
    on('COMPLIANCE_KITS');
    const body = await (await GET()).json();
    expect(body.COMPLIANCE_KITS).toBe(true);
    expect(body.CARE_WALLET).toBe(false);
    expect(Object.keys(body).sort()).toEqual([...PAID_FEATURE_KEYS].sort());
  });
});

// Routes whose switch is the first thing they check: off → 503, on → falls through to auth (401).
type Gated = { name: string; key: PaidFeatureKey; call: () => Promise<Response> };
const gated: Gated[] = [
  { name: 'POST /api/rides/[id]/pay', key: 'RIDES_PAYMENTS', call: async () => (await import('@/app/api/rides/[id]/pay/route')).POST(post('/api/rides/r1/pay'), { params: { id: 'r1' } }) },
  { name: 'POST /api/billing/deposit', key: 'CARE_WALLET', call: async () => (await import('@/app/api/billing/deposit/route')).POST(post('/api/billing/deposit', { amountCents: 1000 })) },
  { name: 'POST /api/payments/deposit-intent', key: 'CARE_WALLET', call: async () => (await import('@/app/api/payments/deposit-intent/route')).POST(post('/api/payments/deposit-intent', { amount: 10 })) },
  { name: 'POST /api/billing/pay-from-wallet', key: 'CARE_WALLET', call: async () => (await import('@/app/api/billing/pay-from-wallet/route')).POST(post('/api/billing/pay-from-wallet', {})) },
  { name: 'POST /api/operator/compliance-kits', key: 'COMPLIANCE_KITS', call: async () => (await import('@/app/api/operator/compliance-kits/route')).POST(post('/api/operator/compliance-kits', { kitId: 'x' })) },
  { name: 'POST /api/background-checks', key: 'BACKGROUND_CHECKS', call: async () => (await import('@/app/api/background-checks/route')).POST(post('/api/background-checks', {})) },
  { name: 'POST /api/family/background-checks/order/[caregiverId]', key: 'BACKGROUND_CHECKS', call: async () => (await import('@/app/api/family/background-checks/order/[caregiverId]/route')).POST(post('/x', { packageType: 'BASIC' }), { params: { caregiverId: 'c1' } }) },
  { name: 'POST /api/family/background-checks/order-provider/[providerId]', key: 'BACKGROUND_CHECKS', call: async () => (await import('@/app/api/family/background-checks/order-provider/[providerId]/route')).POST(post('/x', { packageType: 'BASIC' }), { params: { providerId: 'p1' } }) },
  { name: 'POST /api/operator/billing/subscribe', key: 'OPERATOR_PLANS', call: async () => (await import('@/app/api/operator/billing/subscribe/route')).POST(post('/x', { plan: 'STARTER' })) },
  { name: 'POST /api/operator/billing/switch-plan', key: 'OPERATOR_PLANS', call: async () => (await import('@/app/api/operator/billing/switch-plan/route')).POST(post('/x', { plan: 'GROWTH' })) },
  { name: 'POST /api/caregiver/billing/subscribe', key: 'CAREGIVER_PRO', call: async () => (await import('@/app/api/caregiver/billing/subscribe/route')).POST(post('/x')) },
  { name: 'POST /api/provider/billing/subscribe (Boost)', key: 'PROVIDER_BOOST', call: async () => (await import('@/app/api/provider/billing/subscribe/route')).POST(post('/x')) },
  { name: 'POST /api/provider/boost/founder', key: 'PROVIDER_BOOST', call: async () => (await import('@/app/api/provider/boost/founder/route')).POST() },
];

describe.each(gated)('$name ($key)', ({ key, call }) => {
  it('off (default) → 503 with the plain message, before any auth or Stripe call', async () => {
    const res = await call();
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: PAID_FEATURES[key].message, feature: key });
    expect(getServerSession).not.toHaveBeenCalled();
  });

  it('on → past the switch (stops at auth, not 503)', async () => {
    on(key);
    const res = await call();
    expect(res.status).not.toBe(503);
    expect(res.status).toBe(401);
  });
});

describe('POST /api/rides — only instant book (payment up front) is gated', () => {
  const ride = (instantBook: boolean) => ({
    providerId: 'p1',
    pickupAddress: '1 Main St',
    dropoffAddress: '2 Oak Ave',
    scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
    instantBook,
  });
  beforeEach(() => getServerSession.mockResolvedValue({ user: { id: 'u1', role: 'FAMILY' } }));

  it('instant book, off → 503', async () => {
    const { POST } = await import('@/app/api/rides/route');
    const res = await POST(post('/api/rides', ride(true)));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe(PAID_FEATURES.RIDES_PAYMENTS.message);
    expect(prisma.provider.findUnique).not.toHaveBeenCalled();
  });

  it('plain request, off → still accepted (proceeds to provider lookup)', async () => {
    const { POST } = await import('@/app/api/rides/route');
    const res = await POST(post('/api/rides', ride(false)));
    expect(res.status).toBe(404); // mocked provider not found — past the switch
    expect(prisma.provider.findUnique).toHaveBeenCalled();
  });

  it('instant book, on → proceeds', async () => {
    on('RIDES_PAYMENTS');
    const { POST } = await import('@/app/api/rides/route');
    const res = await POST(post('/api/rides', ride(true)));
    expect(res.status).toBe(404);
  });
});

describe('POST /api/operator/homes/[id]/featured — enable is gated, disable never is', () => {
  const call = async (action: string) =>
    (await import('@/app/api/operator/homes/[id]/featured/route')).POST(post('/x', { action }), { params: { id: 'h1' } });
  beforeEach(() => getServerSession.mockResolvedValue({ user: { id: 'u1', role: 'OPERATOR' } }));

  it('enable, off → 503', async () => {
    const res = await call('enable');
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe(PAID_FEATURES.FEATURED_LISTING.message);
    expect(prisma.assistedLivingHome.findUnique).not.toHaveBeenCalled();
  });

  it('disable, off → allowed (like a cancellation)', async () => {
    const res = await call('disable');
    expect(res.status).toBe(404); // mocked home not found — past the switch
  });

  it('enable, on → proceeds', async () => {
    on('FEATURED_LISTING');
    expect((await call('enable')).status).toBe(404);
  });
});

describe('marketplace hire fee — hiring always works; the fee is queued only when on', () => {
  const flush = () => new Promise((r) => setTimeout(r, 0));

  describe('POST /api/operator/caregivers/[id]/hire (Starter plan)', () => {
    beforeEach(() => {
      getServerSession.mockResolvedValue({ user: { id: 'u1', role: 'OPERATOR' } });
      prisma.operator.findFirst.mockResolvedValue({ id: 'op1', userId: 'u1', stripeCustomerId: 'cus_1', subscriptionPlan: 'STARTER' });
      prisma.caregiver.findUnique.mockResolvedValue({ id: 'c1', user: { id: 'cu1', firstName: 'Ann', lastName: 'Lee', email: 'a@x.test' } });
    });
    const hire = async () => (await import('@/app/api/operator/caregivers/[id]/hire/route')).POST(post('/x', { position: 'CNA' }) as unknown as Request, { params: { id: 'c1' } });

    it('off → hire succeeds, no Payment row, no invoice item', async () => {
      const res = await hire();
      await flush();
      expect(res.status).toBe(200);
      expect(prisma.caregiverEmployment.create).toHaveBeenCalled();
      expect(prisma.payment.create).not.toHaveBeenCalled();
      expect(invoiceItemsCreate).not.toHaveBeenCalled();
    });

    it('on → hire succeeds and the fee is queued', async () => {
      on('MARKETPLACE_HIRE_FEE');
      const res = await hire();
      await flush();
      expect(res.status).toBe(200);
      expect(prisma.payment.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ type: 'MARKETPLACE_HIRE_FEE' }) }));
      expect(invoiceItemsCreate).toHaveBeenCalled();
    });
  });

  describe('PATCH /api/marketplace/applications/[id] action=HIRE (Starter plan)', () => {
    beforeEach(() => {
      getServerSession.mockResolvedValue({ user: { id: 'u1', role: 'OPERATOR' } });
      prisma.marketplaceApplication.findUnique.mockResolvedValue({ id: 'a1', listing: { id: 'l1', title: 'Night CNA', postedByUserId: 'u1' }, caregiver: { id: 'c1', userId: 'cu1' } });
      prisma.marketplaceApplication.update.mockResolvedValue({ caregiver: { user: { id: 'cu1', firstName: 'Ann', lastName: 'Lee', email: 'a@x.test', phone: null } }, listing: { postedByUserId: 'u1' } });
      prisma.operator.findFirst.mockResolvedValue({ id: 'op1', userId: 'u1', stripeCustomerId: 'cus_1', subscriptionPlan: 'STARTER' });
    });
    const patch = async () =>
      (await import('@/app/api/marketplace/applications/[id]/route')).PATCH(
        new Request('http://localhost/x', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'HIRE' }) }),
        { params: { id: 'a1' } },
      );

    it('off → hired, no fee', async () => {
      const res = await patch();
      await flush();
      expect(res.status).toBe(200);
      expect(prisma.payment.create).not.toHaveBeenCalled();
      expect(invoiceItemsCreate).not.toHaveBeenCalled();
    });

    it('on → hired and the fee is queued', async () => {
      on('MARKETPLACE_HIRE_FEE');
      const res = await patch();
      await flush();
      expect(res.status).toBe(200);
      expect(prisma.payment.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ type: 'MARKETPLACE_HIRE_FEE' }) }));
    });
  });

  describe('POST /api/operator/shifts/[id]/bids/[bidId] action=accept', () => {
    beforeEach(() => {
      getServerSession.mockResolvedValue({ user: { id: 'u1', role: 'OPERATOR' } });
      prisma.operator.findUnique.mockResolvedValue({ id: 'op1' });
      prisma.caregiverShift.findFirst.mockResolvedValue({ id: 's1', caregiverId: null });
      prisma.shiftBid.findFirst.mockResolvedValue({ id: 'b1', caregiverId: 'c1' });
      prisma.caregiver.findUnique.mockResolvedValue({ id: 'c1', user: { firstName: 'Ann', lastName: 'Lee' } });
    });
    const accept = async () =>
      (await import('@/app/api/operator/shifts/[id]/bids/[bidId]/route')).POST(post('/x', { action: 'accept' }), { params: { id: 's1', bidId: 'b1' } });

    it('off → bid accepted, no fee queued', async () => {
      const res = await accept();
      expect(res.status).toBe(200);
      expect(triggerMarketplaceHireFee).not.toHaveBeenCalled();
    });

    it('on → bid accepted and the fee is queued', async () => {
      on('MARKETPLACE_HIRE_FEE');
      const res = await accept();
      expect(res.status).toBe(200);
      expect(triggerMarketplaceHireFee).toHaveBeenCalledWith('hire_1', 's1', 'Ann Lee');
    });
  });
});

describe('GET /api/operator/billing/plans', () => {
  it('off → nothing purchasable, enabled:false (the wizard then finishes without a plan)', async () => {
    process.env['STRIPE_PRICE_STARTER'] = 'price_test1';
    const { GET } = await import('@/app/api/operator/billing/plans/route');
    expect(await (await GET()).json()).toEqual({ available: [], enabled: false });
  });

  it('on → the configured tiers, enabled:true', async () => {
    process.env['STRIPE_PRICE_STARTER'] = 'price_test1';
    on('OPERATOR_PLANS');
    const { GET } = await import('@/app/api/operator/billing/plans/route');
    const body = await (await GET()).json();
    expect(body.enabled).toBe(true);
    expect(body.available).toContain('STARTER');
  });
});

describe('never gated: webhooks and billing portals stay free of the switches', () => {
  it('no paid-feature guard in the Stripe webhook or any billing portal route', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const root = path.join(__dirname, '..');
    for (const f of [
      'src/app/api/webhooks/stripe/route.ts',
      'src/app/api/operator/billing/portal/route.ts',
      'src/app/api/caregiver/billing/portal/route.ts',
      'src/app/api/provider/billing/portal/route.ts',
    ]) {
      expect({ f, gated: fs.readFileSync(path.join(root, f), 'utf8').includes('paid-features') }).toEqual({ f, gated: false });
    }
  });
});
