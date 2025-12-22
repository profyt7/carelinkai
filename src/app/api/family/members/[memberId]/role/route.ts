
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLogFromRequest } from '@/lib/audit';
import { AuditAction } from '@prisma/client';
import { publish } from '@/lib/sse';

export async function PUT(
  request: NextRequest,
  { params }: { params: { memberId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { memberId } = params;
    const body = await request.json();
    const { role } = body;

    if (!role) {
      return NextResponse.json({ error: 'Role is required' }, { status: 400 });
    }

    // Fetch member to update
    const memberToUpdate = await prisma.familyMember.findUnique({
      where: { id: memberId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!memberToUpdate) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Check if current user is owner
    const currentMembership = await prisma.familyMember.findFirst({
      where: {
        familyId: memberToUpdate.familyId,
        userId: session.user.id,
        role: 'OWNER',
      },
    });

    if (!currentMembership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Prevent demoting the last owner
    if (memberToUpdate.role === 'OWNER' && role !== 'OWNER') {
      const ownerCount = await prisma.familyMember.count({
        where: {
          familyId: memberToUpdate.familyId,
          role: 'OWNER',
          status: 'ACTIVE',
        },
      });

      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot demote the last owner' },
          { status: 400 }
        );
      }
    }

    // Update member role
    const updatedMember = await prisma.familyMember.update({
      where: { id: memberId },
      data: { role },
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

    // Create activity feed item
    await prisma.activityFeedItem.create({
      data: {
        familyId: memberToUpdate.familyId,
        actorId: session.user.id,
        type: 'MEMBER_ROLE_CHANGED',
        resourceType: 'family_member',
        resourceId: memberId,
        description: `changed ${memberToUpdate.user?.firstName ?? ''} ${memberToUpdate.user?.lastName ?? ''}'s role to ${role}`,
        metadata: {
          memberId,
          oldRole: memberToUpdate.role,
          newRole: role,
        },
      },
    });

    // Create audit log
    await createAuditLogFromRequest(
      request,
      AuditAction.USER_UPDATED,
      'FAMILY_MEMBER',
      memberId,
      `Changed role for ${memberToUpdate.user?.email} from ${memberToUpdate.role} to ${role}`,
      undefined
    );

    // Publish SSE event
    publish(`family:${memberToUpdate.familyId}`, {
      type: 'member:role_changed',
      member: updatedMember,
    });

    return NextResponse.json({ member: updatedMember });
  } catch (error: any) {
    console.error('Error changing role:', error);
    return NextResponse.json(
      { error: error.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}
