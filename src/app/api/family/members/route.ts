
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const familyId = searchParams.get('familyId');

    if (!familyId) {
      return NextResponse.json({ error: 'familyId is required' }, { status: 400 });
    }

    // Check membership
    const membership = await prisma.familyMember.findFirst({
      where: {
        familyId,
        userId: session.user.id,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all active members
    const members = await prisma.familyMember.findMany({
      where: {
        familyId,
        status: 'ACTIVE',
      },
      orderBy: [
        { role: 'asc' },
        { joinedAt: 'desc' },
      ],
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Fetch pending invitations (only for owners)
    let invitations: any[] = [];
    if (membership.role === 'OWNER') {
      invitations = await prisma.familyMember.findMany({
        where: {
          familyId,
          status: 'PENDING',
        },
        orderBy: { createdAt: 'desc' },
        include: {
          invitedBy: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    }

    return NextResponse.json({
      members,
      invitations: invitations.map((inv) => ({
        id: inv.id,
        email: inv.email ?? 'No email',
        role: inv.role,
        status: inv.status,
        createdAt: inv.createdAt,
        invitedBy: inv.invitedBy,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching members:', error);
    return NextResponse.json(
      { error: error.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}
