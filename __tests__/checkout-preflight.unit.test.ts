/**
 * OL-162 — checkout preflight: booleans only, never values; checkout refuses
 * to enable on any mismatch; admin-only API.
 */

import { jest } from '@jest/globals';

const requireRole = jest.fn();
jest.mock('@/lib/auth-utils', () => ({ requireRole: (...a: unknown[]) => requireRole(...a) }));

import { checkoutPreflight, stripeKeyMode } from '@/lib/concierge/preflight';
import { isCheckoutEnabled } from '@/lib/concierge/offer';
import { GET } from '@/app/api/admin/checkout-preflight/route';

const LIVE = { STRIPE_SECRET_KEY: 'sk_live_51ABCxyz', STRIPE_PRICE_FAMILY_CONCIERGE: 'price_1Qabc', STRIPE_WEBHOOK_SECRET: 'whsec_9f8e7d', ADMIN_NOTIFY_EMAIL: 'chris@getcarelinkai.com', NODE_ENV: 'production' };
const TEST = { ...LIVE, STRIPE_SECRET_KEY: 'sk_test_51ABCxyz', NODE_ENV: 'test' };
const SECRETS = ['sk_live_51ABCxyz', 'sk_test_51ABCxyz', 'price_1Qabc', 'whsec_9f8e7d'];

describe('stripeKeyMode', () => {
  it('classifies live / test / missing / unknown', () => {
    expect(stripeKeyMode('sk_live_x')).toBe('live');
    expect(stripeKeyMode('rk_live_x')).toBe('live');
    expect(stripeKeyMode('sk_test_x')).toBe('test');
    expect(stripeKeyMode('')).toBe('missing');
    expect(stripeKeyMode(undefined)).toBe('missing');
    expect(stripeKeyMode('pk_live_x')).toBe('unknown');
  });
});

describe('checkoutPreflight', () => {
  it('all green in production with a live key → ready; enabled only with the flag', () => {
    const off = checkoutPreflight(LIVE);
    expect(off).toMatchObject({ stripeKeyMode: 'live', expectedKeyMode: 'live', keyModeMatches: true, priceIdSet: true, webhookSecretSet: true, adminNotifyEmailSet: true, ready: true, flagRequested: false, checkoutEnabled: false, problems: [] });
    expect(checkoutPreflight({ ...LIVE, CONCIERGE_CHECKOUT_ENABLED: '1' }).checkoutEnabled).toBe(true);
    expect(checkoutPreflight({ ...TEST, CONCIERGE_CHECKOUT_ENABLED: '1' })).toMatchObject({ expectedKeyMode: 'test', keyModeMatches: true, checkoutEnabled: true });
  });
  it('refuses to enable on any mismatch and names the env var (never the value)', () => {
    const cases: Array<[Record<string, string>, RegExp]> = [
      [{ ...LIVE, STRIPE_SECRET_KEY: 'sk_test_51ABCxyz' }, /STRIPE_SECRET_KEY is a test key; live expected/],
      [{ ...TEST, STRIPE_SECRET_KEY: 'sk_live_51ABCxyz' }, /STRIPE_SECRET_KEY is a live key; test expected/],
      [{ ...LIVE, STRIPE_SECRET_KEY: '' }, /STRIPE_SECRET_KEY not set/],
      [{ ...LIVE, STRIPE_SECRET_KEY: 'pk_live_nope' }, /not a Stripe secret key/],
      [{ ...LIVE, STRIPE_PRICE_FAMILY_CONCIERGE: '' }, /STRIPE_PRICE_FAMILY_CONCIERGE not set/],
      [{ ...LIVE, STRIPE_PRICE_FAMILY_CONCIERGE: 'prod_123' }, /STRIPE_PRICE_FAMILY_CONCIERGE not set/],
      [{ ...LIVE, STRIPE_WEBHOOK_SECRET: 'nope' }, /STRIPE_WEBHOOK_SECRET not set/],
      [{ ...LIVE, ADMIN_NOTIFY_EMAIL: 'not-an-email' }, /ADMIN_NOTIFY_EMAIL not set/],
    ];
    for (const [env, re] of cases) {
      const p = checkoutPreflight({ ...env, CONCIERGE_CHECKOUT_ENABLED: '1' });
      expect({ env: re.source, ready: p.ready, enabled: p.checkoutEnabled }).toEqual({ env: re.source, ready: false, enabled: false });
      expect(p.problems.join(' | ')).toMatch(re);
      const dump = JSON.stringify(p);
      for (const s of SECRETS) expect(dump).not.toContain(s);
      expect(dump).not.toContain('chris@getcarelinkai.com');
    }
    expect(isCheckoutEnabled({ ...LIVE, STRIPE_SECRET_KEY: 'sk_test_51ABCxyz', CONCIERGE_CHECKOUT_ENABLED: '1' })).toBe(false);
  });
});

describe('GET /api/admin/checkout-preflight', () => {
  const saved = { ...process.env };
  afterEach(() => { process.env = { ...saved }; });
  it('403 for non-admins', async () => {
    requireRole.mockRejectedValueOnce(new Error('nope'));
    expect((await GET()).status).toBe(403);
  });
  it('admin → booleans + mode only; no value in the body', async () => {
    requireRole.mockResolvedValue({ id: 'admin', role: 'ADMIN' });
    Object.assign(process.env, { STRIPE_SECRET_KEY: 'sk_test_51ABCxyz', STRIPE_PRICE_FAMILY_CONCIERGE: 'price_1Qabc', STRIPE_WEBHOOK_SECRET: 'whsec_9f8e7d', ADMIN_NOTIFY_EMAIL: 'chris@getcarelinkai.com', CONCIERGE_CHECKOUT_ENABLED: '' });
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const text = await res.text();
    const j = JSON.parse(text);
    expect(j).toMatchObject({ stripeKeyMode: 'test', priceIdSet: true, webhookSecretSet: true, adminNotifyEmailSet: true, flagRequested: false, checkoutEnabled: false });
    expect(typeof j.ready).toBe('boolean');
    for (const s of [...SECRETS, 'chris@getcarelinkai.com']) expect(text).not.toContain(s);
  });
});
