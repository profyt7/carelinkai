export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/caregiver/applications
 *
 * Returns all marketplace applications for the authenticated caregiver.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const caregiver = await prisma.caregiver.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!caregiver) {
      return NextResponse.json({ error: 'Caregiver profile not found' }, { status: 404 });
    }

    const applications = await (prisma as any).marketplaceApplication.findMany({
      where: { caregiverId: caregiver.id },
      orderBy: { createdAt: 'desc' },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            city: true,
            state: true,
            setting: true,
            hourlyRateMin: true,
            hourlyRateMax: true,
            status: true,
          },
        },
        hire: {
          select: { id: true },
        },
      },
    });

    return NextResponse.json({ applications });
  } catch (error) {
    console.error('Error fetching caregiver applications:', error);
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
  }
}
