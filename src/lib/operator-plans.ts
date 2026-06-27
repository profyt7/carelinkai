/**
 * Single source of truth for which operator subscription tiers are actually
 * PURCHASABLE right now. A tier is purchasable only if its Stripe Price ID is
 * configured in the environment (STRIPE_PRICE_<PLAN>).
 *
 * Why this exists: the billing UI must never offer a "buy" button for a tier
 * that would dead-end at Stripe checkout — that loses MRR at the goal line.
 * (OL-055: the AGENCY tier was visible in the wizard but STRIPE_PRICE_AGENCY is
 * unset, so clicking it 400s.) The wizard and the billing manager call the
 * /api/operator/billing/plans endpoint to learn the purchasable set and hide
 * the rest. The subscribe/switch-plan routes use these helpers server-side as
 * the authoritative gate.
 *
 * Stripe price IDs live only in server env, so anything that needs the
 * purchasable set in the browser must go through the API endpoint.
 */

export const OPERATOR_PLAN_KEYS = ['STARTER', 'PROFESSIONAL', 'GROWTH', 'AGENCY'] as const;
export type OperatorPlanKey = (typeof OPERATOR_PLAN_KEYS)[number];

export const OPERATOR_PLAN_LABELS: Record<OperatorPlanKey, string> = {
  STARTER: 'Starter',
  PROFESSIONAL: 'Professional',
  GROWTH: 'Growth',
  AGENCY: 'Agency',
};

/** Stripe Price ID for a plan, or undefined if not configured. Server-only (reads env). */
export function priceIdForPlan(plan: string): string | undefined {
  const map: Record<string, string | undefined> = {
    STARTER:      process.env['STRIPE_PRICE_STARTER'],
    PROFESSIONAL: process.env['STRIPE_PRICE_PROFESSIONAL'],
    GROWTH:       process.env['STRIPE_PRICE_GROWTH'],
    AGENCY:       process.env['STRIPE_PRICE_AGENCY'],
  };
  return map[plan.toUpperCase()];
}

/** True if a plan can be self-serve purchased (its Stripe price is configured). */
export function isPlanPurchasable(plan: string): boolean {
  return !!priceIdForPlan(plan);
}

/** The subset of operator plans that are currently purchasable. Server-only. */
export function availableOperatorPlans(): OperatorPlanKey[] {
  return OPERATOR_PLAN_KEYS.filter((p) => isPlanPurchasable(p));
}

/** Human label for a plan key (falls back to the raw key). */
export function planLabel(plan: string): string {
  return OPERATOR_PLAN_LABELS[plan.toUpperCase() as OperatorPlanKey] ?? plan;
}
