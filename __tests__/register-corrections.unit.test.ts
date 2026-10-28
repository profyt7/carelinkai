/**
 * OL-187 — corrections from context/REVENUE_REGISTER.md:
 *   - the Stripe webhook maps STRIPE_PRICE_AGENCY back to the AGENCY plan;
 *   - MARKETPLACE_HIRE_FEE_CENTS has one default ($99), read in one place;
 *   - PLACEMENT_FEE_CENTS defaults to $2,500 (value still set by the founder);
 *   - the discharge-planner billing code and its Stripe price refs are gone.
 */

import fs from 'fs';
import path from 'path';
import { jest } from '@jest/globals';
import type { NextRequest } from 'next/server';

const operatorUpdate = jest.fn<(...a: any[]) => Promise<any>>();
const operatorFind = jest.fn<(...a: any[]) => Promise<any>>();
jest.mock('@/lib/stripe', () => ({ stripe: { webhooks: { constructEvent: jest.fn() } } }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    operator: { findUnique: (...a: unknown[]) => operatorFind(...a), update: (...a: unknown[]) => operatorUpdate(...a) },
  },
}));

import { planForPriceId } from '@/lib/operator-plans';
import {
  DEFAULT_MARKETPLACE_HIRE_FEE_CENTS,
  DEFAULT_PLACEMENT_FEE_CENTS,
  marketplaceHireFeeCents,
  placementFeeCents,
} from '@/lib/billing/fees';
import { POST as stripeWebhook } from '@/app/api/webhooks/stripe/route';

const root = path.join(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

const ENV = { ...process.env };
beforeEach(() => {
  jest.clearAllMocks();
  process.env = {
    ...ENV,
    STRIPE_PRICE_STARTER: 'price_starter',
    STRIPE_PRICE_PROFESSIONAL: 'price_pro',
    STRIPE_PRICE_GROWTH: 'price_growth',
    STRIPE_PRICE_AGENCY: 'price_agency',
  };
  delete process.env['STRIPE_WEBHOOK_SECRET'];
  delete process.env['MARKETPLACE_HIRE_FEE_CENTS'];
  delete process.env['PLACEMENT_FEE_CENTS'];
});
afterAll(() => {
  process.env = ENV;
});

describe('planForPriceId (reverse of priceIdForPlan)', () => {
  it('maps every operator price, AGENCY included', () => {
    expect(planForPriceId('price_starter')).toBe('STARTER');
    expect(planForPriceId('price_pro')).toBe('PROFESSIONAL');
    expect(planForPriceId('price_growth')).toBe('GROWTH');
    expect(planForPriceId('price_agency')).toBe('AGENCY');
  });

  it('unknown, empty or missing ids map to nothing (an unset env never matches)', () => {
    delete process.env['STRIPE_PRICE_AGENCY'];
    expect(planForPriceId('price_agency')).toBeUndefined();
    expect(planForPriceId('price_other')).toBeUndefined();
    expect(planForPriceId('')).toBeUndefined();
    expect(planForPriceId(null)).toBeUndefined();
    expect(planForPriceId(undefined)).toBeUndefined();
  });
});

describe('Stripe webhook: subscription on the Agency price', () => {
  function subEvent(priceId: string, metadata: Record<string, string> = {}) {
    const body = JSON.stringify({
      id: 'evt_1',
      type: 'customer.subscription.updated',
      data: { object: { id: 'sub_1', customer: 'cus_1', status: 'active', metadata, items: { data: [{ price: { id: priceId } }] } } },
    });
    return { text: async () => body, headers: { get: () => null } } as unknown as NextRequest;
  }

  it('no plan in metadata + STRIPE_PRICE_AGENCY → operator saved as AGENCY', async () => {
    operatorFind.mockResolvedValue({ id: 'op_1' });
    operatorUpdate.mockResolvedValue({});
    const res = await stripeWebhook(subEvent('price_agency'));
    expect(res.status).toBe(200);
    expect(operatorUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'op_1' }, data: expect.objectContaining({ subscriptionPlan: 'AGENCY', subscriptionStatus: 'ACTIVE' }) }));
  });

  it('an unknown price leaves the stored plan untouched', async () => {
    operatorFind.mockResolvedValue({ id: 'op_1' });
    operatorUpdate.mockResolvedValue({});
    await stripeWebhook(subEvent('price_unknown'));
    expect(operatorUpdate.mock.calls[0]![0].data).not.toHaveProperty('subscriptionPlan');
  });

  it('metadata.plan still wins over the price lookup', async () => {
    operatorFind.mockResolvedValue({ id: 'op_1' });
    operatorUpdate.mockResolvedValue({});
    await stripeWebhook(subEvent('price_agency', { plan: 'growth' }));
    expect(operatorUpdate.mock.calls[0]![0].data.subscriptionPlan).toBe('GROWTH');
  });
});

describe('fee amounts: one default, read in one place', () => {
  it('hire fee defaults to $99', () => {
    expect(DEFAULT_MARKETPLACE_HIRE_FEE_CENTS).toBe(9900);
    expect(marketplaceHireFeeCents()).toBe(9900);
  });

  it('placement fee defaults to $2,500', () => {
    expect(DEFAULT_PLACEMENT_FEE_CENTS).toBe(250000);
    expect(placementFeeCents()).toBe(250000);
  });

  it('a valid env value overrides the default (0 allowed)', () => {
    process.env['MARKETPLACE_HIRE_FEE_CENTS'] = '12500';
    process.env['PLACEMENT_FEE_CENTS'] = ' 150000 ';
    expect(marketplaceHireFeeCents()).toBe(12500);
    expect(placementFeeCents()).toBe(150000);
    process.env['MARKETPLACE_HIRE_FEE_CENTS'] = '0';
    expect(marketplaceHireFeeCents()).toBe(0);
  });

  it.each(['', '   ', 'abc', '-500', '99.5', '1e', 'NaN'])('invalid value %p falls back to the default', (v) => {
    process.env['MARKETPLACE_HIRE_FEE_CENTS'] = v;
    process.env['PLACEMENT_FEE_CENTS'] = v;
    expect(marketplaceHireFeeCents()).toBe(9900);
    expect(placementFeeCents()).toBe(250000);
  });

  it('no caller parses the fee envs itself', () => {
    for (const f of [
      'src/lib/services/marketplace-hire-fee.ts',
      'src/app/api/operator/caregivers/[id]/hire/route.ts',
      'src/app/api/marketplace/applications/[id]/route.ts',
      'src/lib/services/inquiry-conversion.ts',
    ]) {
      const src = read(f);
      expect({ f, inline: /process\.env\.?\[?['"]?(MARKETPLACE_HIRE_FEE_CENTS|PLACEMENT_FEE_CENTS)/.test(src) }).toEqual({ f, inline: false });
      expect({ f, helper: src.includes("from '@/lib/billing/fees'") }).toEqual({ f, helper: true });
    }
  });
});

describe('discharge-planner billing is removed', () => {
  it('the DP billing API routes and DP Stripe scripts are deleted', () => {
    for (const p of [
      'src/app/api/discharge-planner/billing/subscribe/route.ts',
      'src/app/api/discharge-planner/billing/subscription/route.ts',
      'scripts/archive-dp-stripe-prices.ts',
      'scripts/report-dp-subscriptions.ts',
    ]) {
      expect({ p, exists: fs.existsSync(path.join(root, p)) }).toEqual({ p, exists: false });
    }
  });

  it('no code, script or .env.example names a DP Stripe price, and the webhook no longer syncs DP subscriptions', () => {
    expect(read('.env.example')).not.toMatch(/STRIPE_PRICE_DISCHARGE_PLANNER/);
    expect(read('src/app/api/webhooks/stripe/route.ts')).not.toMatch(/dischargePlannerProfile/);
    const walk = (dir: string): string[] =>
      fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((d) =>
        d.isDirectory() ? walk(path.join(dir, d.name)) : /\.(ts|tsx|js|mjs)$/.test(d.name) ? [path.join(dir, d.name)] : [],
      );
    const hits = [...walk('src'), ...walk('scripts')].filter((f) => read(f).includes('STRIPE_PRICE_DISCHARGE_PLANNER'));
    expect(hits).toEqual([]);
  });

  it('the old /discharge-planner/billing page still just redirects to the free dashboard', () => {
    expect(read('src/app/discharge-planner/billing/page.tsx')).toMatch(/redirect\('\/discharge-planner'\)/);
  });
});
