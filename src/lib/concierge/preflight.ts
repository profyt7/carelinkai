/**
 * OL-162 — Family Concierge checkout preflight. Booleans only, never values.
 *
 * Checkout turns on only when CONCIERGE_CHECKOUT_ENABLED is set AND every
 * prerequisite is present AND the Stripe key mode matches the environment
 * (live in production, test elsewhere). A mismatch keeps checkout OFF and the
 * admin panel says which name is wrong — the values themselves are never
 * returned, logged or rendered.
 */

export type StripeKeyMode = 'live' | 'test' | 'missing' | 'unknown';

export type CheckoutPreflight = {
  /** What CONCIERGE_CHECKOUT_ENABLED asks for. */
  flagRequested: boolean;
  stripeKeyMode: StripeKeyMode;
  /** 'live' in production, 'test' everywhere else. */
  expectedKeyMode: 'live' | 'test';
  keyModeMatches: boolean;
  priceIdSet: boolean;
  webhookSecretSet: boolean;
  adminNotifyEmailSet: boolean;
  /** Every prerequisite holds — checkout MAY be enabled. */
  ready: boolean;
  /** flagRequested && ready — what the app actually does. */
  checkoutEnabled: boolean;
  /** Env var NAMES that block go-live (never values). */
  problems: string[];
};

export function stripeKeyMode(key: string | undefined): StripeKeyMode {
  const k = (key ?? '').trim();
  if (!k) return 'missing';
  if (/^(sk|rk)_live_/.test(k)) return 'live';
  if (/^(sk|rk)_test_/.test(k)) return 'test';
  return 'unknown';
}

const truthy = (v: string | undefined) => ['1', 'true', 'yes'].includes((v ?? '').trim().toLowerCase());

export function checkoutPreflight(env: NodeJS.ProcessEnv = process.env): CheckoutPreflight {
  const flagRequested = truthy(env['CONCIERGE_CHECKOUT_ENABLED']);
  const mode = stripeKeyMode(env['STRIPE_SECRET_KEY']);
  const expectedKeyMode: 'live' | 'test' = env['NODE_ENV'] === 'production' ? 'live' : 'test';
  const keyModeMatches = mode === expectedKeyMode;
  const priceIdSet = /^price_[A-Za-z0-9]+$/.test((env['STRIPE_PRICE_FAMILY_CONCIERGE'] ?? '').trim());
  const webhookSecretSet = /^whsec_[A-Za-z0-9]+$/.test((env['STRIPE_WEBHOOK_SECRET'] ?? '').trim());
  const adminNotifyEmailSet = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test((env['ADMIN_NOTIFY_EMAIL'] ?? '').trim());

  const problems: string[] = [];
  if (mode === 'missing') problems.push('STRIPE_SECRET_KEY not set');
  else if (mode === 'unknown') problems.push('STRIPE_SECRET_KEY is not a Stripe secret key (sk_/rk_)');
  else if (!keyModeMatches) problems.push(`STRIPE_SECRET_KEY is a ${mode} key; ${expectedKeyMode} expected here`);
  if (!priceIdSet) problems.push('STRIPE_PRICE_FAMILY_CONCIERGE not set (a price_… id from the Stripe dashboard)');
  if (!webhookSecretSet) problems.push('STRIPE_WEBHOOK_SECRET not set (whsec_…)');
  if (!adminNotifyEmailSet) problems.push('ADMIN_NOTIFY_EMAIL not set');

  const ready = problems.length === 0;
  return {
    flagRequested,
    stripeKeyMode: mode,
    expectedKeyMode,
    keyModeMatches,
    priceIdSet,
    webhookSecretSet,
    adminNotifyEmailSet,
    ready,
    checkoutEnabled: flagRequested && ready,
    problems,
  };
}
