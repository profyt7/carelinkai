import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLogFromRequest } from '@/lib/audit';
import { AuditAction } from '@prisma/client';
import { publish } from '@/lib/sse';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { memberId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { memberId } = params;

    // Fetch member to remove
    const memberToRemove = await prisma.familyMember.findUnique({
      where: { id: memberId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        family: true,
      },
    });

    if (!memberToRemove) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Check if current user is owner
    const currentMembership = await prisma.familyMember.findFirst({
      where: {
        familyId: memberToRemove.familyId,
        userId: session.user.id,
        role: 'OWNER',
      },
    });

    if (!currentMembership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Prevent removing the last owner
    if (memberToRemove.role === 'OWNER') {
      const ownerCount = await prisma.familyMember.count({
        where: {
          familyId: memberToRemove.familyId,
          role: 'OWNER',
          status: 'ACTIVE',
        },
      });

      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot remove the last owner' },
          { status: 400 }
        );
      }
    }

    // Delete member
    await prisma.familyMember.delete({
      where: { id: memberId },
    });

    // Create activity feed item
    await prisma.activityFeed.create({
      data: {
        familyId: memberToRemove.familyId,
        userId: session.user.id,
        type: 'MEMBER_REMOVED',
        description: `removed ${memberToRemove.user?.firstName ?? ''} ${memberToRemove.user?.lastName ?? ''} from the family`,
        metadata: {
          memberId,
          removedEmail: memberToRemove.user?.email,
        },
      },
    });

    // Create audit log
    await createAuditLogFromRequest(request, {
      action: AuditAction.USER_DELETED,
      userId: session.user.id,
      details: `Removed member: ${memberToRemove.user?.email}`,
    });

    // Publish SSE event
    publish(`family:${memberToRemove.familyId}`, {
      type: 'member:removed',
      memberId,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error removing member:', error);
    return NextResponse.json(
      { error: error.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}
