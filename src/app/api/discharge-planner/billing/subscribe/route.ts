export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

const BodySchema = z.object({
  licenseType: z.enum(['INDIVIDUAL', 'DEPARTMENT']).default('INDIVIDUAL'),
});

/**
 * POST /api/discharge-planner/billing/subscribe
 *
 * Creates a Stripe Checkout Session for a discharge planner subscription.
 * INDIVIDUAL: $99/seat/month (STRIPE_PRICE_DISCHARGE_PLANNER)
 * DEPARTMENT: $499/month, up to 10 seats (STRIPE_PRICE_DISCHARGE_PLANNER_DEPT)
 * Both include a 14-day free trial.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || user.role !== UserRole.DISCHARGE_PLANNER) {
    return NextResponse.json({ error: 'Forbidden — discharge planner role required' }, { status: 403 });
  }

  const body = BodySchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { licenseType } = body.data;
  const isDept = licenseType === 'DEPARTMENT';

  const priceId = isDept
    ? process.env['STRIPE_PRICE_DISCHARGE_PLANNER_DEPT']
    : process.env['STRIPE_PRICE_DISCHARGE_PLANNER'];

  if (!priceId) {
    return NextResponse.json(
      { error: `Discharge planner ${isDept ? 'department' : 'individual'} subscription not configured.` },
      { status: 503 }
    );
  }

  // Get or create the DischargePlannerProfile
  let profile = await prisma.dischargePlannerProfile.findUnique({ where: { userId: user.id } });
  if (!profile) {
    profile = await prisma.dischargePlannerProfile.create({
      data: { userId: user.id, licenseType, seatCount: isDept ? 10 : 1 },
    });
  }

  if (
    profile.subscriptionStatus === 'ACTIVE' ||
    profile.subscriptionStatus === 'TRIALING'
  ) {
    return NextResponse.json({ error: 'Already subscribed' }, { status: 409 });
  }

  // Create or reuse Stripe customer
  let stripeCustomerId = profile.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email!,
      name: `${user.firstName} ${user.lastName}`.trim(),
      metadata: { dischargePlannerProfileId: profile.id, userId: user.id },
    });
    stripeCustomerId = customer.id;
    await prisma.dischargePlannerProfile.update({
      where: { id: profile.id },
      data: { stripeCustomerId, licenseType, seatCount: isDept ? 10 : 1 },
    });
  }

  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] || 'https://getcarelinkai.com';

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 14,
      metadata: { dischargePlannerProfileId: profile.id, licenseType },
    },
    success_url: `${appUrl}/discharge-planner/billing?subscription=success`,
    cancel_url: `${appUrl}/discharge-planner/billing?subscription=canceled`,
    metadata: { dischargePlannerProfileId: profile.id, licenseType },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
