
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLogFromRequest } from '@/lib/audit';
import { AuditAction } from '@prisma/client';

export async function POST(
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

    // Update invitation timestamp
    await prisma.familyMember.update({
      where: { id: invitationId },
      data: { updatedAt: new Date() },
    });

    // TODO: Resend invitation email
    console.log('Invitation email would be resent to:', invitation.email);

    // Create activity feed item
    await prisma.activityFeed.create({
      data: {
        familyId: invitation.familyId,
        userId: session.user.id,
        type: 'INVITATION_RESENT',
        description: `resent invitation to ${invitation.email ?? 'unknown'}`,
        metadata: {
          invitationId,
          email: invitation.email,
        },
      },
    });

    // Create audit log
    await createAuditLogFromRequest(request, {
      action: AuditAction.USER_UPDATED,
      userId: session.user.id,
      details: `Resent invitation to ${invitation.email}`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error resending invitation:', error);
    return NextResponse.json(
      { error: error.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}
