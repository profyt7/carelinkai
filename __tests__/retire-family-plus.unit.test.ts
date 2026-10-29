/**
 * OL-189 — CareLinkAI Plus (the $19/mo family subscription) is retired.
 * Families are free; the isPlus / plusStatus columns stay as dead data.
 *   - no subscribe / portal route, no FAMILY_PLUS switch, no Stripe price env;
 *   - /settings/family/billing redirects to /settings/family;
 *   - no nav / settings / dashboard upsell;
 *   - a leftover family subscription event is acknowledged (200) and never
 *     written to the family row.
 */

import fs from 'fs';
import path from 'path';
import { jest } from '@jest/globals';
import type { NextRequest } from 'next/server';

const familyFind = jest.fn<(...a: any[]) => Promise<any>>();
const familyUpdate = jest.fn<(...a: any[]) => Promise<any>>();
const none = () => Promise.resolve(null);
jest.mock('@/lib/stripe', () => ({ stripe: { webhooks: { constructEvent: jest.fn() } } }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    operator: { findUnique: () => none(), update: jest.fn() },
    provider: { findUnique: () => none(), update: jest.fn() },
    caregiver: { findUnique: () => none(), update: jest.fn() },
    family: { findUnique: (...a: unknown[]) => familyFind(...a), update: (...a: unknown[]) => familyUpdate(...a) },
  },
}));
const redirect = jest.fn((to: string) => { throw new Error(`REDIRECT ${to}`); });
jest.mock('next/navigation', () => ({ redirect: (to: string) => redirect(to) }));

import { PAID_FEATURE_KEYS, PAID_FEATURES } from '@/lib/billing/paid-features';
import { POST as stripeWebhook } from '@/app/api/webhooks/stripe/route';
import FamilyBillingPage from '@/app/settings/family/billing/page';

const root = path.join(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p: string) => fs.existsSync(path.join(root, p));

const ENV = { ...process.env };
beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...ENV };
  delete process.env['STRIPE_WEBHOOK_SECRET'];
});
afterAll(() => {
  process.env = ENV;
});

function subEvent(type: string) {
  const body = JSON.stringify({
    id: 'evt_plus',
    type,
    data: { object: { id: 'sub_plus', customer: 'cus_family', status: 'active', metadata: {}, items: { data: [{ price: { id: 'price_family_plus' } }] } } },
  });
  return { text: async () => body, headers: { get: () => null } } as unknown as NextRequest;
}

describe('Stripe webhook: leftover Family Plus subscription events', () => {
  it.each(['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'])(
    '%s → 200, family row untouched',
    async (type) => {
      familyFind.mockResolvedValue({ id: 'fam_1' });
      const res = await stripeWebhook(subEvent(type));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ received: true });
      expect(familyFind).toHaveBeenCalledWith({ where: { stripeCustomerId: 'cus_family' } });
      expect(familyUpdate).not.toHaveBeenCalled();
    }
  );

  it('the webhook no longer writes isPlus / plusStatus anywhere', () => {
    const src = read('src/app/api/webhooks/stripe/route.ts');
    expect(src).not.toMatch(/isPlus\s*:/);
    expect(src).not.toMatch(/plusStatus\s*:/);
    expect(src).not.toMatch(/plusPeriodEndsAt/);
  });
});

describe('product surface', () => {
  it('the subscribe and portal routes are gone', () => {
    expect(exists('src/app/api/family/billing/subscribe/route.ts')).toBe(false);
    expect(exists('src/app/api/family/billing/portal/route.ts')).toBe(false);
  });

  it('/settings/family/billing redirects to /settings/family', () => {
    expect(() => FamilyBillingPage()).toThrow('REDIRECT /settings/family');
    expect(redirect).toHaveBeenCalledWith('/settings/family');
  });

  it('no FAMILY_PLUS switch (preflight lists the registry, so it drops off there too)', () => {
    expect(PAID_FEATURE_KEYS).not.toContain('FAMILY_PLUS');
    expect(Object.values(PAID_FEATURES).map((f) => f.env)).not.toContain('FAMILY_PLUS_ENABLED');
  });

  it('.env.example has no STRIPE_PRICE_FAMILY_PLUS or FAMILY_PLUS_ENABLED', () => {
    const env = read('.env.example');
    expect(env).not.toMatch(/STRIPE_PRICE_FAMILY_PLUS/);
    expect(env).not.toMatch(/FAMILY_PLUS_ENABLED/);
  });

  it.each([
    'src/components/layout/DashboardLayout.tsx',
    'src/app/settings/page.tsx',
    'src/components/dashboard/FamilyDashboardContent.tsx',
    'src/app/learn/howto/content.ts',
    'src/app/admin/page.tsx',
  ])('%s carries no Plus nav, upsell or copy', (f) => {
    const src = read(f);
    expect(src).not.toMatch(/CareLinkAI Plus/);
    expect(src).not.toMatch(/settings\/family\/billing/);
    expect(src).not.toMatch(/FAMILY_PLUS/);
    expect(src).not.toMatch(/isPlus/);
  });
});
