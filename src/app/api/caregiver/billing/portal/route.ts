export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { UserRole } from '@prisma/client';

/**
 * POST /api/caregiver/billing/portal
 * Returns a Stripe Customer Portal URL for caregivers to manage their Pro subscription.
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

  const caregiver = await prisma.caregiver.findUnique({ where: { userId: user.id } });
  if (!caregiver) {
    return NextResponse.json({ error: 'Caregiver profile not found' }, { status: 404 });
  }

  if (!caregiver.proStripeCustomerId) {
    return NextResponse.json(
      { error: 'No billing account found. Please subscribe to Pro first.' },
      { status: 400 }
    );
  }

  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] || 'https://getcarelinkai.com';

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: caregiver.proStripeCustomerId,
    return_url: `${appUrl}/settings/billing`,
  });

  return NextResponse.json({ url: portalSession.url });
}
