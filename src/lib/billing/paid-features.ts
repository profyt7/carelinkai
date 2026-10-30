/**
 * OL-186 — paid-feature kill switches. Every path that can take money (or
 * queue a fee) has its own env flag, default OFF. When a flag is off the API
 * returns 503 with a plain message and the matching UI is hidden.
 *
 * Not gated here (on purpose): Stripe webhooks, refunds, cancellations and the
 * billing portal — existing subscribers must always be able to manage/cancel.
 * Concierge keeps its own CONCIERGE_CHECKOUT_ENABLED (+ preflight); the
 * placement fee keeps PLACEMENT_FEE_ENABLED.
 */

import { NextResponse } from 'next/server';

export const PAID_FEATURES = {
  RIDES_PAYMENTS: {
    env: 'RIDES_PAYMENTS_ENABLED',
    label: 'Ride payments (fare + 12% platform fee)',
    message: 'Online ride payment is not available yet. Send a ride request and the provider will follow up.',
  },
  CARE_WALLET: {
    env: 'CARE_WALLET_ENABLED',
    label: 'Care Wallet deposits and payments (2.5% fee)',
    message: 'The Care Wallet is not available yet.',
  },
  COMPLIANCE_KITS: {
    env: 'COMPLIANCE_KITS_ENABLED',
    label: 'Compliance kit purchases',
    message: 'Compliance kits are not available for purchase yet.',
  },
  FEATURED_LISTING: {
    env: 'FEATURED_LISTING_ENABLED',
    label: 'Featured listing ($79 / 30 days)',
    message: 'Featured listings are not available yet.',
  },
  BACKGROUND_CHECKS: {
    env: 'BACKGROUND_CHECKS_ENABLED',
    label: 'Background check orders (Checkr)',
    message: 'Background check ordering is not available yet.',
  },
  MARKETPLACE_HIRE_FEE: {
    env: 'MARKETPLACE_HIRE_FEE_ENABLED',
    label: 'Marketplace hire fee (hiring still works when off; no fee is queued)',
    message: 'The marketplace hire fee is not enabled.',
  },
  OPERATOR_PLANS: {
    env: 'OPERATOR_PLANS_ENABLED',
    label: 'Operator subscription plans (Starter / Professional / Growth / Agency)',
    message: 'Paid operator plans are not available yet. Your account keeps working on its current access.',
  },
  CAREGIVER_PRO: {
    env: 'CAREGIVER_PRO_ENABLED',
    label: 'Caregiver Pro membership',
    message: 'Caregiver Pro is not available yet.',
  },
  // 10/29 provider pricing: the listing is FREE when this is on (no charge path). Kept in this
  // map so the homepage card, nav and preflight read one switch.
  PROVIDER_LISTING: {
    env: 'PROVIDER_LISTING_ENABLED',
    label: 'Free provider listing (no charge)',
    message: 'Provider listings are not open yet.',
  },
  PROVIDER_BOOST: {
    env: 'PROVIDER_BOOST_ENABLED',
    label: 'Provider Boost ($39/mo; founding providers free for 90 days)',
    message: 'Provider Boost is not available yet.',
  },
  // Stub only: no code path reads this yet.
  // TODO(Connect rail): provider commission rides the Stripe Connect payment rail (Revenue_Strategy
  // §6 hire-fee decision; Supply_Growth_Plan_2026_10_29). Build it there, then gate it here.
  PROVIDER_COMMISSION: {
    env: 'PROVIDER_COMMISSION_ENABLED',
    label: 'Provider commission (not built; waits for the Connect rail)',
    message: 'Provider commission is not available.',
  },
} as const;

export type PaidFeatureKey = keyof typeof PAID_FEATURES;
export type PaidFeatureFlags = Record<PaidFeatureKey, boolean>;

export const PAID_FEATURE_KEYS = Object.keys(PAID_FEATURES) as PaidFeatureKey[];

const truthy = (v: string | undefined) => ['1', 'true', 'yes', 'on'].includes((v ?? '').trim().toLowerCase());

export function isPaidFeatureEnabled(key: PaidFeatureKey, env: NodeJS.ProcessEnv = process.env): boolean {
  return truthy(env[PAID_FEATURES[key].env]);
}

export function paidFeatureFlags(env: NodeJS.ProcessEnv = process.env): PaidFeatureFlags {
  return Object.fromEntries(PAID_FEATURE_KEYS.map((k) => [k, isPaidFeatureEnabled(k, env)])) as PaidFeatureFlags;
}

export type PaidFeatureStatus = { key: PaidFeatureKey; env: string; label: string; enabled: boolean };

/** One row per flag for /admin/checkout-preflight — names and on/off only, never values. */
export function paidFeatureStatus(env: NodeJS.ProcessEnv = process.env): PaidFeatureStatus[] {
  return PAID_FEATURE_KEYS.map((key) => ({
    key,
    env: PAID_FEATURES[key].env,
    label: PAID_FEATURES[key].label,
    enabled: isPaidFeatureEnabled(key, env),
  }));
}

/** 503 response for a disabled feature, or null when it is on. */
export function paidFeatureDisabledResponse(key: PaidFeatureKey): NextResponse | null {
  if (isPaidFeatureEnabled(key)) return null;
  return NextResponse.json(
    { error: PAID_FEATURES[key].message, feature: key, enabled: false },
    { status: 503, headers: { 'cache-control': 'no-store' } },
  );
}
