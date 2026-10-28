export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { paidFeatureDisabledResponse } from '@/lib/billing/paid-features';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { captureError } from '@/lib/sentry';
import { featuredListingFeeCents } from '@/lib/billing/fees';
import {
  FEATURED_LISTING_METADATA_TYPE,
  billsFeaturedOnInvoice,
  extendFeaturedUntil,
  featuredListingDays,
} from '@/lib/billing/featured-listing';

/**
 * POST /api/operator/homes/[id]/featured
 * Body: { action: 'enable' | 'disable' }
 *
 * 'enable'  — operator with an ACTIVE subscription: queues a $79 invoice item
 *             and features the home for 30 days now.
 *             Anyone else (OL-190): returns a one-off Stripe Checkout URL; the
 *             home is featured by the webhook once the payment completes.
 * 'disable' — clears the featured flag immediately (no refund)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { action } = await request.json().catch(() => ({ action: null }));
  if (action !== 'enable' && action !== 'disable') {
    return NextResponse.json({ error: 'action must be "enable" or "disable"' }, { status: 400 });
  }
  // OL-186: 'enable' charges; 'disable' (like a cancellation) always works.
  if (action === 'enable') {
    const off = paidFeatureDisabledResponse('FEATURED_LISTING');
    if (off) return off;
  }

  // Verify this home belongs to the authenticated operator
  const home = await prisma.assistedLivingHome.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      isFeatured: true,
      featuredUntil: true,
      operator: {
        select: {
          id: true,
          userId: true,
          companyName: true,
          stripeCustomerId: true,
          stripeSubscriptionId: true,
          subscriptionStatus: true,
          user: { select: { email: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  if (!home) {
    return NextResponse.json({ error: 'Home not found' }, { status: 404 });
  }

  if (home.operator.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (action === 'disable') {
    await prisma.assistedLivingHome.update({
      where: { id: params.id },
      data: { isFeatured: false, featuredUntil: null },
    });
    return NextResponse.json({ success: true, isFeatured: false });
  }

  // action === 'enable'
  const feeCents = featuredListingFeeCents();
  const days = featuredListingDays();

  if (!billsFeaturedOnInvoice(home.operator)) {
    return startFeaturedCheckout(home, feeCents, days);
  }

  const featuredUntil = extendFeaturedUntil(home.featuredUntil, new Date(), days);

  await prisma.assistedLivingHome.update({
    where: { id: params.id },
    data: { isFeatured: true, featuredUntil },
  });

  // Queue billing on the subscriber's next invoice — non-blocking
  try {
    const invoiceItem = await stripe.invoiceItems.create({
      customer: home.operator.stripeCustomerId!,
      amount: feeCents,
      currency: 'usd',
      description: `Featured listing — ${home.name} (${days} days)`,
      metadata: { homeId: params.id, type: 'FEATURED_LISTING_FEE' },
    });

    await prisma.payment.create({
      data: {
        userId: home.operator.userId,
        amount: feeCents / 100,
        status: 'PROCESSING',
        type: 'FEATURED_LISTING_FEE',
        stripePaymentId: invoiceItem.id,
        description: `Featured listing — ${home.name} (queued for next invoice)`,
      },
    });
  } catch (err: any) {
    captureError(err instanceof Error ? err : new Error(String(err)), {
      tags: { route: 'operator:homes:{id}:featured' },
    });
    console.error('[FEATURED] Failed to queue invoice item:', err?.message ?? err);
    // Home is still marked featured; billing is best-effort
  }

  return NextResponse.json({ success: true, isFeatured: true, featuredUntil, billing: 'invoice' });
}

type HomeForCheckout = {
  id: string;
  name: string;
  operator: {
    id: string;
    userId: string;
    companyName: string;
    stripeCustomerId: string | null;
    user: { email: string; firstName: string | null; lastName: string | null };
  };
};

/** OL-190: one-off Checkout for operators without an active subscription. Nothing is featured until it is paid. */
async function startFeaturedCheckout(home: HomeForCheckout, feeCents: number, days: number) {
  try {
    let customer = home.operator.stripeCustomerId;
    if (!customer) {
      const user = home.operator.user;
      const created = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || home.operator.companyName,
        metadata: { operatorId: home.operator.id, userId: home.operator.userId },
      });
      customer = created.id;
      await prisma.operator.update({ where: { id: home.operator.id }, data: { stripeCustomerId: customer } });
    }

    const appUrl = process.env['NEXT_PUBLIC_APP_URL'] || 'https://getcarelinkai.com';
    const editUrl = `${appUrl}/operator/homes/${home.id}/edit`;
    const metadata = { type: FEATURED_LISTING_METADATA_TYPE, homeId: home.id, operatorId: home.operator.id };
    const checkout = await stripe.checkout.sessions.create({
      customer,
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: `Featured listing — ${home.name}`, description: `${days} days of featured placement on CareLinkAI` },
            unit_amount: feeCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${editUrl}?featured=success`,
      cancel_url: `${editUrl}?featured=canceled`,
      metadata,
      payment_intent_data: { metadata },
    });

    return NextResponse.json({ success: true, billing: 'checkout', url: checkout.url });
  } catch (err: any) {
    captureError(err instanceof Error ? err : new Error(String(err)), {
      tags: { route: 'operator:homes:{id}:featured', step: 'checkout' },
    });
    console.error('[FEATURED] Failed to start checkout:', err?.message ?? err);
    return NextResponse.json({ error: 'Could not start checkout. Please try again.' }, { status: 502 });
  }
}
