export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { UserRole } from '@prisma/client';
import { priceIdForPlan, planLabel } from '@/lib/operator-plans';

const SUPPORT_EMAIL = 'hello@getcarelinkai.com';

/**
 * POST /api/operator/billing/switch-plan
 * Body: { plan: 'STARTER' | 'PROFESSIONAL' | 'GROWTH' }
 *
 * Switches the operator's active Stripe subscription to a new plan in-place.
 * Uses proration so upgrades are charged immediately and downgrades credit
 * the unused portion of the current period.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || user.role !== UserRole.OPERATOR) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const plan: string = (body.plan || '').toUpperCase();

  const priceId = priceIdForPlan(plan);
  if (!priceId) {
    console.error(`[switch-plan] No Stripe Price ID for plan "${plan}" — STRIPE_PRICE_${plan} is not set.`);
    return NextResponse.json(
      { error: `The ${planLabel(plan)} plan isn't available yet. Email ${SUPPORT_EMAIL} and we'll set you up.` },
      { status: 400 }
    );
  }

  const operator = await prisma.operator.findUnique({ where: { userId: user.id } });
  if (!operator) {
    return NextResponse.json({ error: 'Operator not found' }, { status: 404 });
  }

  if (!operator.stripeCustomerId) {
    return NextResponse.json(
      { error: 'No billing account found. Please subscribe to a plan first.' },
      { status: 400 }
    );
  }

  try {
    // Find the active subscription on the Stripe customer
    const subscriptions = await stripe.subscriptions.list({
      customer: operator.stripeCustomerId,
      status: 'all',
      limit: 5,
    });

    const activeSub = subscriptions.data.find(
      (s) => s.status === 'active' || s.status === 'trialing'
    );

    if (!activeSub) {
      return NextResponse.json(
        { error: 'No active subscription found. Please subscribe first.' },
        { status: 400 }
      );
    }

    if (plan === operator.subscriptionPlan) {
      return NextResponse.json({ error: 'You are already on this plan.' }, { status: 400 });
    }

    const subscriptionItemId = activeSub.items.data[0]?.id;
    if (!subscriptionItemId) {
      return NextResponse.json({ error: 'Subscription item not found.' }, { status: 500 });
    }

    await stripe.subscriptions.update(activeSub.id, {
      items: [{ id: subscriptionItemId, price: priceId }],
      proration_behavior: 'create_prorations',
      metadata: { plan },
    });

    await prisma.operator.update({
      where: { id: operator.id },
      data: { subscriptionPlan: plan as any },
    });

    return NextResponse.json({ success: true, plan, label: planLabel(plan) });
  } catch (err) {
    console.error('[switch-plan] Stripe error:', err);
    return NextResponse.json(
      { error: `We couldn't switch your plan right now. Please try again in a moment, or email ${SUPPORT_EMAIL}.` },
      { status: 502 }
    );
  }
}
