export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

/**
 * GET /api/discharge-planner/billing/subscription
 *
 * Returns the current discharge planner subscription status.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || user.role !== UserRole.DISCHARGE_PLANNER) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const profile = await prisma.dischargePlannerProfile.findUnique({
    where: { userId: user.id },
    select: {
      subscriptionStatus: true,
      licenseType: true,
      seatCount: true,
      trialEndsAt: true,
      currentPeriodEndsAt: true,
      organization: true,
    },
  });

  return NextResponse.json({ profile: profile ?? null });
}
