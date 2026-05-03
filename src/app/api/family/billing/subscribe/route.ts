export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

/**
 * POST /api/family/billing/subscribe
 * Creates a Stripe Checkout Session for CareLinkAI Plus ($19/mo).
 * On success, webhook sets Family.isPlus=true and plusStatus=ACTIVE.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || user.role !== 'FAMILY') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const priceId = process.env['STRIPE_PRICE_FAMILY_PLUS'];
  if (!priceId) {
    return NextResponse.json(
      { error: 'Family Plus price not configured. Set STRIPE_PRICE_FAMILY_PLUS in environment variables.' },
      { status: 400 }
    );
  }

  const family = await prisma.family.findUnique({ where: { userId: user.id } });
  if (!family) {
    return NextResponse.json({ error: 'Family profile not found' }, { status: 404 });
  }

  let stripeCustomerId = family.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email!,
      name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email!,
      metadata: { familyId: family.id, userId: user.id },
    });
    stripeCustomerId = customer.id;
    await prisma.family.update({
      where: { id: family.id },
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
      metadata: { familyId: family.id },
    },
    success_url: `${appUrl}/settings/family/billing?subscription=success`,
    cancel_url: `${appUrl}/settings/family/billing?subscription=canceled`,
    metadata: { familyId: family.id },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
