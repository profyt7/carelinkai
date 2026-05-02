export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { UserRole } from '@prisma/client';

/**
 * POST /api/caregiver/billing/subscribe
 * Creates a Stripe Checkout Session for the $19/mo Pro Caregiver tier.
 * On success, Stripe fires customer.subscription.created → webhook sets isPro=true.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || user.role !== UserRole.CAREGIVER) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const priceId = process.env['STRIPE_PRICE_PRO_CAREGIVER'];
  if (!priceId) {
    return NextResponse.json(
      { error: 'Pro Caregiver price not configured. Set STRIPE_PRICE_PRO_CAREGIVER in environment variables.' },
      { status: 400 }
    );
  }

  const caregiver = await prisma.caregiver.findUnique({ where: { userId: user.id } });
  if (!caregiver) {
    return NextResponse.json({ error: 'Caregiver profile not found' }, { status: 404 });
  }

  // Create or reuse Stripe customer
  let stripeCustomerId = caregiver.proStripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email!,
      name: `${user.firstName} ${user.lastName}`.trim(),
      metadata: { caregiverId: caregiver.id, userId: user.id },
    });
    stripeCustomerId = customer.id;
    await prisma.caregiver.update({
      where: { id: caregiver.id },
      data: { proStripeCustomerId: stripeCustomerId },
    });
  }

  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] || 'https://getcarelinkai.com';

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      metadata: { caregiverId: caregiver.id },
    },
    success_url: `${appUrl}/settings/billing?pro=success`,
    cancel_url: `${appUrl}/settings/billing?pro=canceled`,
    metadata: { caregiverId: caregiver.id },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
