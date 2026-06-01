export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

/**
 * GET /api/operator/onboarding/status
 * Returns whether the current operator has completed onboarding.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || user.role !== UserRole.OPERATOR) {
    // Non-operators are considered "complete" so the gate never fires for them
    return NextResponse.json({ completed: true, clevelandFounder: false });
  }

  const operator = await prisma.operator.findUnique({ where: { userId: user.id } });
  if (!operator) {
    return NextResponse.json({ completed: false, clevelandFounder: false });
  }

  return NextResponse.json({
    completed: !!operator.onboardingCompletedAt,
    clevelandFounder: operator.clevelandFounder ?? false,
    freeAccessUntil: operator.freeAccessUntil ?? null,
    accessTier: operator.accessTier ?? 'FULL',
  });
}
