
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLogFromRequest } from '@/lib/audit';
import { AuditAction } from '@prisma/client';
import { publish } from '@/lib/sse';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { familyId, email, role, message } = body;

    if (!familyId || !email || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if user is owner
    const membership = await prisma.familyMember.findFirst({
      where: {
        familyId,
        userId: session.user.id,
        role: 'OWNER',
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if user already exists
    let targetUser = await prisma.user.findUnique({
      where: { email },
    });

    // Check if already a member or invited
    if (targetUser) {
      const existingMembership = await prisma.familyMember.findFirst({
        where: {
          familyId,
          userId: targetUser.id,
        },
      });

      if (existingMembership) {
        return NextResponse.json(
          { error: 'User is already a member or has a pending invitation' },
          { status: 400 }
        );
      }
    } else {
      // Create placeholder user for invitation
      targetUser = await prisma.user.create({
        data: {
          email,
          firstName: email.split('@')[0],
          lastName: '',
          role: 'FAMILY',
          passwordHash: null, // Will be set when they accept invitation
        },
      });
    }

    // Create pending invitation
    const invitation = await prisma.familyMember.create({
      data: {
        familyId,
        userId: targetUser.id,
        role,
        status: 'PENDING',
        invitedById: session.user.id,
      },
    });

    // TODO: Send invitation email
    // For now, we'll just log it
    console.log('Invitation email would be sent to:', email);
    console.log('Message:', message);

    // Create activity feed item
    await prisma.activityFeedItem.create({
      data: {
        familyId,
        actorId: session.user.id,
        type: 'MEMBER_INVITED',
        resourceType: 'family_member',
        resourceId: invitation.id,
        description: `invited ${email} as ${role}`,
        metadata: {
          invitationId: invitation.id,
          email,
          role,
        },
      },
    });

    // Create audit log
    await createAuditLogFromRequest(
      request,
      AuditAction.CREATE,
      'FAMILY_MEMBER',
      invitation.id,
      `Invited ${email} as ${role}`,
      undefined
    );

    // Publish SSE event
    publish(`family:${familyId}`, {
      type: 'member:invited',
      invitation: {
        id: invitation.id,
        email,
        role,
      },
    });

    return NextResponse.json({ invitation });
  } catch (error: any) {
    console.error('Error sending invitation:', error);
    return NextResponse.json(
      { error: error.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}
