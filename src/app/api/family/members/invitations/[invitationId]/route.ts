
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLogFromRequest } from '@/lib/audit';
import { AuditAction } from '@prisma/client';
import { publish } from '@/lib/sse';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { invitationId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { invitationId } = params;

    // Fetch invitation
    const invitation = await prisma.familyMember.findUnique({
      where: { id: invitationId },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Check if current user is owner
    const currentMembership = await prisma.familyMember.findFirst({
      where: {
        familyId: invitation.familyId,
        userId: session.user.id,
        role: 'OWNER',
      },
    });

    if (!currentMembership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete invitation
    await prisma.familyMember.delete({
      where: { id: invitationId },
    });

    // Create activity feed item
    await prisma.activityFeedItem.create({
      data: {
        familyId: invitation.familyId,
        actorId: session.user.id,
        type: 'OTHER',
        resourceType: 'family_member',
        resourceId: invitationId,
        description: `cancelled invitation for ${invitation.user?.email ?? 'unknown'}`,
        metadata: {
          invitationId,
          email: invitation.user?.email,
          action: 'INVITATION_CANCELLED',
        },
      },
    });

    // Create audit log
    await createAuditLogFromRequest(
      request,
      AuditAction.DELETE,
      'FAMILY_MEMBER',
      invitationId,
      `Cancelled invitation for ${invitation.user?.email}`,
      undefined
    );

    // Publish SSE event
    publish(`family:${invitation.familyId}`, {
      type: 'invitation:cancelled',
      invitationId,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error cancelling invitation:', error);
    return NextResponse.json(
      { error: error.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}
