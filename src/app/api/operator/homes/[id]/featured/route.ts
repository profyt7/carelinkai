export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

// $79/mo for a featured listing add-on (configurable via env)
const FEATURED_LISTING_FEE_CENTS = parseInt(
  process.env.FEATURED_LISTING_FEE_CENTS ?? '7900',
  10
);
// Default 30-day feature window
const FEATURED_DAYS = parseInt(process.env.FEATURED_LISTING_DAYS ?? '30', 10);

/**
 * POST /api/operator/homes/[id]/featured
 * Body: { action: 'enable' | 'disable' }
 *
 * 'enable'  — queues a $79 invoice item and marks the home as featured for 30 days
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

  // Verify this home belongs to the authenticated operator
  const home = await prisma.assistedLivingHome.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      isFeatured: true,
      operator: {
        select: { id: true, userId: true, stripeCustomerId: true },
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
  const featuredUntil = new Date();
  featuredUntil.setDate(featuredUntil.getDate() + FEATURED_DAYS);

  await prisma.assistedLivingHome.update({
    where: { id: params.id },
    data: { isFeatured: true, featuredUntil },
  });

  // Queue billing — non-blocking
  if (home.operator.stripeCustomerId) {
    try {
      const invoiceItem = await stripe.invoiceItems.create({
        customer: home.operator.stripeCustomerId,
        amount: FEATURED_LISTING_FEE_CENTS,
        currency: 'usd',
        description: `Featured listing — ${home.name} (${FEATURED_DAYS} days)`,
        metadata: { homeId: params.id, type: 'FEATURED_LISTING_FEE' },
      });

      await prisma.payment.create({
        data: {
          userId: home.operator.userId,
          amount: FEATURED_LISTING_FEE_CENTS / 100,
          status: 'PROCESSING',
          type: 'FEATURED_LISTING_FEE',
          stripePaymentId: invoiceItem.id,
          description: `Featured listing — ${home.name} (queued for next invoice)`,
        },
      });
    } catch (err: any) {
      console.error('[FEATURED] Failed to queue invoice item:', err?.message ?? err);
      // Home is still marked featured; billing is best-effort
    }
  } else {
    // No Stripe customer yet — record PENDING for manual collection
    await prisma.payment.create({
      data: {
        userId: home.operator.userId,
        amount: FEATURED_LISTING_FEE_CENTS / 100,
        status: 'PENDING',
        type: 'FEATURED_LISTING_FEE',
        description: `Featured listing — ${home.name} (no Stripe customer, manual collection)`,
      },
    });
  }

  return NextResponse.json({ success: true, isFeatured: true, featuredUntil });
}
