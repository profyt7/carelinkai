export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { UserRole } from '@prisma/client';

/**
 * POST /api/provider/billing/subscribe
 * Creates a Stripe Checkout Session for the $99/mo provider listing fee.
 * On success, Stripe fires customer.subscription.created → webhook sets listingStatus=ACTIVE.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || user.role !== UserRole.PROVIDER) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const priceId = process.env['STRIPE_PRICE_PROVIDER_LISTING'];
  if (!priceId) {
    return NextResponse.json(
      { error: 'Provider listing price not configured. Set STRIPE_PRICE_PROVIDER_LISTING in environment variables.' },
      { status: 400 }
    );
  }

  const provider = await prisma.provider.findUnique({ where: { userId: user.id } });
  if (!provider) {
    return NextResponse.json({ error: 'Provider profile not found' }, { status: 404 });
  }

  // Create or reuse Stripe customer
  let stripeCustomerId = provider.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email!,
      name: provider.businessName,
      metadata: { providerId: provider.id, userId: user.id },
    });
    stripeCustomerId = customer.id;
    await prisma.provider.update({
      where: { id: provider.id },
      data: { stripeCustomerId },
    });
  }

  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] || 'https://getcarelinkai.com';

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      metadata: { providerId: provider.id },
    },
    success_url: `${appUrl}/settings/provider/billing?subscription=success`,
    cancel_url: `${appUrl}/settings/provider/billing?subscription=canceled`,
    metadata: { providerId: provider.id },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
