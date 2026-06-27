export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { availableOperatorPlans } from '@/lib/operator-plans';

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
  return NextResponse.json({ available: availableOperatorPlans() });
}
