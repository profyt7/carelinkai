export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { availableOperatorPlans } from '@/lib/operator-plans';
import { isPaidFeatureEnabled } from '@/lib/billing/paid-features';

/**
 * GET /api/operator/billing/plans
 *
 * Returns the operator plan tiers that are actually purchasable right now —
 * those with a configured Stripe Price ID. The billing UI (onboarding wizard
 * Step 4 + SubscriptionManager) uses this to hide any tier that would dead-end
 * at Stripe checkout. Stripe price IDs live only in server env, so the client
 * cannot determine this on its own.
 *
 * Not sensitive (reveals only which tier names are buyable), so it is left
 * unauthenticated to keep the wizard's first paint fast.
 */
export async function GET() {
  // OL-186: nothing is purchasable while OPERATOR_PLANS_ENABLED is off.
  const enabled = isPaidFeatureEnabled('OPERATOR_PLANS');
  return NextResponse.json({ available: enabled ? availableOperatorPlans() : [], enabled });
}
