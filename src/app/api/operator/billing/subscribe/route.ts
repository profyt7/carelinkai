export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { UserRole } from '@prisma/client';

const PLAN_PRICE_MAP: Record<string, string | undefined> = {
  STARTER: process.env['STRIPE_PRICE_STARTER'],
  PROFESSIONAL: process.env['STRIPE_PRICE_PROFESSIONAL'],
  GROWTH: process.env['STRIPE_PRICE_GROWTH'],
};

/**
 * POST /api/operator/billing/subscribe
 * Body: { plan: 'STARTER' | 'PROFESSIONAL' | 'GROWTH' }
 *
 * Creates (or reuses) a Stripe Customer for the operator, then creates a
 * Stripe Checkout Session in subscription mode and returns the session URL.
 * The operator is redirected to Stripe-hosted checkout to enter payment details.
 * On success, Stripe fires customer.subscription.created which the webhook handler
 * persists back to the Operator record.
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
  const plan: string = (body.plan || 'STARTER').toUpperCase();

  const priceId = PLAN_PRICE_MAP[plan];
  if (!priceId) {
    return NextResponse.json(
      { error: `No Stripe Price ID configured for plan "${plan}". Set STRIPE_PRICE_${plan} in your environment variables.` },
      { status: 400 }
    );
  }

  const operator = await prisma.operator.findUnique({ where: { userId: user.id } });
  if (!operator) {
    return NextResponse.json({ error: 'Operator not found' }, { status: 404 });
  }

  // Create or retrieve Stripe customer
  let stripeCustomerId = operator.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email!,
      name: user.name || operator.companyName,
      metadata: { operatorId: operator.id, userId: user.id },
    });
    stripeCustomerId = customer.id;
    await prisma.operator.update({
      where: { id: operator.id },
      data: { stripeCustomerId },
    });
  }

  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] || 'https://getcarelinkai.com';

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 14,
      metadata: { operatorId: operator.id, plan },
    },
    success_url: `${appUrl}/operator/billing?subscription=success`,
    cancel_url: `${appUrl}/operator/billing?subscription=canceled`,
    metadata: { operatorId: operator.id, plan },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
