/**
 * FOUNDER_20 founder-cohort promo (feat/stripe-golive-prep).
 *
 * Ratified framework (decision 2026-06-02): 6 months free + 20% off forever,
 * ONE coupon, first cohort per paid role per metro. Phase 1 = Cleveland Ops-50.
 *
 * Stripe mechanics: a single coupon (`carelinkai_founder_20`, 20% off forever)
 * carries the discount; the 6 free months are a 180-day trial applied
 * server-side when a valid founder code is redeemed at checkout. Cohort caps
 * live on PROMOTION CODES attached to the coupon (phase 1: code FOUNDER20,
 * max_redemptions 50) — later cohorts get new codes on the SAME coupon, so
 * "single coupon" stays true while each cohort is independently capped.
 *
 * FOUNDERS49 ($50-off, legacy) is deprecated: its promotion code is
 * deactivated by scripts/stripe-golive-setup.ts so no NEW redemptions are
 * possible, while existing subscriptions keep their discount (Stripe never
 * strips an applied coupon when a promo code is deactivated) — grandfathered.
 */

import type Stripe from 'stripe';

/** The single founder coupon id in Stripe (created by scripts/stripe-golive-setup.ts). */
export const FOUNDER_COUPON_ID = 'carelinkai_founder_20';

/** 6 months free, applied as a trial alongside the coupon. */
export const FOUNDER_TRIAL_DAYS = 180;

/** Phase-1 customer-facing code (Cleveland Ops-50 cohort). */
export const FOUNDER_PHASE1_PROMO_CODE = 'FOUNDER20';

export interface FounderPromoResolution {
  promotionCodeId: string;
  code: string;
}

/**
 * Validate a customer-entered founder code: it must be an ACTIVE Stripe
 * promotion code attached to the FOUNDER_20 coupon (cohort caps and expiry are
 * enforced by Stripe via the promotion code's own state). Returns null for
 * anything else — unknown codes, inactive/exhausted codes, or codes that
 * belong to a different coupon (e.g. legacy FOUNDERS49).
 */
export async function resolveFounderPromo(
  stripe: Stripe,
  rawCode: unknown,
): Promise<FounderPromoResolution | null> {
  if (typeof rawCode !== 'string') return null;
  const code = rawCode.trim().toUpperCase();
  if (!code || code.length > 40) return null;

  const found = await stripe.promotionCodes.list({ code, active: true, limit: 1 });
  const promo = found.data[0];
  if (!promo) return null;

  const coupon = promo.coupon;
  const couponId = typeof coupon === 'string' ? coupon : coupon?.id;
  if (couponId !== FOUNDER_COUPON_ID) return null;

  return { promotionCodeId: promo.id, code };
}
