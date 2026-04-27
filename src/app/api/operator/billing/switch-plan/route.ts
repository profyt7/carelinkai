export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { UserRole } from '@prisma/client';

const PLAN_PRICE_MAP: Record<string, string | undefined> = {
  STARTER:      process.env['STRIPE_PRICE_STARTER'],
  PROFESSIONAL: process.env['STRIPE_PRICE_PROFESSIONAL'],
  GROWTH:       process.env['STRIPE_PRICE_GROWTH'],
  AGENCY:       process.env['STRIPE_PRICE_AGENCY'],
};

const PLAN_LABEL: Record<string, string> = {
  STARTER:      'Starter',
  PROFESSIONAL: 'Professional',
  GROWTH:       'Growth',
  AGENCY:       'Agency',
};

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

  const priceId = PLAN_PRICE_MAP[plan];
  if (!priceId) {
    return NextResponse.json(
      { error: `No Stripe Price ID configured for plan "${plan}".` },
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

    return NextResponse.json({ success: true, plan, label: PLAN_LABEL[plan] });
  } catch (err: any) {
    console.error('[switch-plan] Stripe error:', err);
    const message = err?.raw?.message || err?.message || 'Stripe error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
