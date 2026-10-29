export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { paidFeatureDisabledResponse } from '@/lib/billing/paid-features';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { UserRole } from '@prisma/client';

/**
 * POST /api/provider/billing/subscribe
 * Provider Boost ($39/mo). The provider listing itself is free (10/29 pricing change), so this is
 * the only provider checkout. Gated by PROVIDER_BOOST_ENABLED; with STRIPE_PRICE_PROVIDER_BOOST
 * unset it answers 503 before touching Stripe (no charge path). On success Stripe fires
 * customer.subscription.created → the webhook sets Provider.boostStatus. Boost never touches
 * Provider.isVerified.
 */
export async function POST(_request: NextRequest) {
  const off = paidFeatureDisabledResponse('PROVIDER_BOOST');
  if (off) return off;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || user.role !== UserRole.PROVIDER) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const priceId = process.env['STRIPE_PRICE_PROVIDER_BOOST'];
  if (!priceId) {
    return NextResponse.json(
      { error: 'Provider Boost is not available yet.', feature: 'PROVIDER_BOOST', reason: 'price_not_configured' },
      { status: 503, headers: { 'cache-control': 'no-store' } },
    );
  }

  const provider = await prisma.provider.findUnique({ where: { userId: user.id } });
  if (!provider) {
    return NextResponse.json({ error: 'Provider profile not found' }, { status: 404 });
  }

  // Create or reuse the Stripe customer.
  let stripeCustomerId = provider.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email!,
      name: provider.businessName,
      metadata: { providerId: provider.id, userId: user.id },
    });
    stripeCustomerId = customer.id;
    await prisma.provider.update({ where: { id: provider.id }, data: { stripeCustomerId } });
  }

  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] || 'https://getcarelinkai.com';

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { metadata: { providerId: provider.id, product: 'provider_boost' } },
    success_url: `${appUrl}/settings/provider/billing?boost=success`,
    cancel_url: `${appUrl}/settings/provider/billing?boost=canceled`,
    metadata: { providerId: provider.id, product: 'provider_boost' },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
