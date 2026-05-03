export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

/**
 * POST /api/family/billing/portal
 * Returns a Stripe Customer Portal URL for families to manage their Plus subscription.
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

  const family = await prisma.family.findUnique({ where: { userId: user.id } });
  if (!family) {
    return NextResponse.json({ error: 'Family profile not found' }, { status: 404 });
  }

  if (!family.stripeCustomerId) {
    return NextResponse.json(
      { error: 'No billing account found. Please subscribe first.' },
      { status: 400 }
    );
  }

  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] || 'https://getcarelinkai.com';

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: family.stripeCustomerId,
    return_url: `${appUrl}/settings/family/billing`,
  });

  return NextResponse.json({ url: portalSession.url });
}
