export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { UserRole } from '@prisma/client';

/**
 * POST /api/operator/billing/portal
 * Creates a Stripe Customer Portal session and returns the portal URL.
 * Operators use this to manage their subscription: cancel, upgrade, update payment method.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || user.role !== UserRole.OPERATOR) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const operator = await prisma.operator.findUnique({ where: { userId: user.id } });
  if (!operator) {
    return NextResponse.json({ error: 'Operator not found' }, { status: 404 });
  }

  if (!operator.stripeCustomerId) {
    return NextResponse.json(
      { error: 'No billing account found. Please subscribe to a plan first.' },
      { status: 400 }
    );
  }

  const forwardedProto = request.headers.get('x-forwarded-proto');
  const forwardedHost = request.headers.get('x-forwarded-host');
  const requestOrigin = (forwardedProto && forwardedHost)
    ? `${forwardedProto}://${forwardedHost}`
    : request.headers.get('origin');
  const appUrl = requestOrigin || process.env['NEXT_PUBLIC_APP_URL'] || 'https://getcarelinkai.com';

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: operator.stripeCustomerId,
    return_url: `${appUrl}/operator/billing`,
  });

  return NextResponse.json({ url: portalSession.url });
}
