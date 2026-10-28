export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { UserRole } from '@prisma/client';

/**
 * POST /api/provider/billing/portal
 * Returns a Stripe Customer Portal URL for providers to manage their listing subscription.
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

  const provider = await prisma.provider.findUnique({ where: { userId: user.id } });
  if (!provider) {
    return NextResponse.json({ error: 'Provider profile not found' }, { status: 404 });
  }

  if (!provider.stripeCustomerId) {
    return NextResponse.json(
      { error: 'No billing account found. Please subscribe first.' },
      { status: 400 }
    );
  }

  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] || 'https://getcarelinkai.com';

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: provider.stripeCustomerId,
    return_url: `${appUrl}/settings/provider/billing`,
  });

  return NextResponse.json({ url: portalSession.url });
}
