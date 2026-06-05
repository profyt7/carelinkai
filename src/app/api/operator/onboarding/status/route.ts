export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

/**
 * GET /api/operator/onboarding/status
 * Returns onboarding state for the current operator, including seeded home data
 * when a Cleveland founder claim has assigned one.
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

  // Fetch the seeded home if one is assigned (Cleveland founder flow)
  let seededHome = null;
  if (operator.seededHomeId) {
    const home = await prisma.assistedLivingHome.findUnique({
      where: { id: operator.seededHomeId },
      include: { address: true },
    });
    if (home) {
      seededHome = {
        id: home.id,
        name: home.name,
        description: home.description,
        capacity: home.capacity,
        careLevel: home.careLevel,
        amenities: home.amenities,
        status: home.status,
        address: home.address
          ? {
              street: home.address.street,
              city: home.address.city,
              state: home.address.state,
              zipCode: home.address.zipCode,
            }
          : null,
        // AI auto-population fields
        websiteUrl: home.websiteUrl ?? null,
        autoPopulatedAt: home.autoPopulatedAt ?? null,
        autoPopulatedFromUrl: home.autoPopulatedFromUrl ?? null,
        aiPopulationConfidence: home.aiPopulationConfidence ?? null,
        preFilledFields: home.preFilledFields ?? null,
      };
    }
  }

  return NextResponse.json({
    completed: !!operator.onboardingCompletedAt,
    clevelandFounder: operator.clevelandFounder ?? false,
    freeAccessUntil: operator.freeAccessUntil ?? null,
    accessTier: operator.accessTier ?? 'FULL',
    seededHomeId: operator.seededHomeId ?? null,
    seededHome,
  });
}
