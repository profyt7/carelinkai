import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { createAuditLogFromRequest } from '@/lib/audit';
import { AuditAction } from '@prisma/client';

export const dynamic = 'force-dynamic';

const verifyHomeSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is admin
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { action, reason, notes } = verifyHomeSchema.parse(body);

    // Check if home exists
    const home = await prisma.assistedLivingHome.findUnique({
      where: { id: params.id },
      include: {
        operator: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!home) {
      return NextResponse.json({ error: 'Home not found' }, { status: 404 });
    }

    // Determine new status based on action
    let newStatus: 'ACTIVE' | 'SUSPENDED';
    if (action === 'APPROVE') {
      newStatus = 'ACTIVE';
    } else {
      newStatus = 'SUSPENDED';
    }

    // Update home status
    const updatedHome = await prisma.assistedLivingHome.update({
      where: { id: params.id },
      data: { status: newStatus },
      include: {
        operator: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    // Create notification for operator
    await prisma.notification.create({
      data: {
        userId: home.operator.userId,
        type: action === 'APPROVE' ? 'SYSTEM' : 'ALERT',
        title: action === 'APPROVE' 
          ? 'Home Approved' 
          : 'Home Verification Rejected',
        message: action === 'APPROVE'
          ? `Your home "${home.name}" has been approved and is now active.`
          : `Your home "${home.name}" verification has been rejected. ${reason || 'Please contact support for more information.'}`,
        link: `/operator/homes/${home.id}`,
        read: false,
      },
    });

    // Create audit log
    await createAuditLogFromRequest(
      request,
      action === 'APPROVE' ? AuditAction.APPROVE : AuditAction.REJECT,
      session.user.id,
      'AssistedLivingHome',
      params.id,
      { status: home.status },
      { status: newStatus },
      { 
        adminAction: true, 
        action,
        reason,
        notes,
      }
    );

    return NextResponse.json({
      success: true,
      home: updatedHome,
      message: action === 'APPROVE' 
        ? 'Home approved successfully' 
        : 'Home verification rejected',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Failed to verify home:', error);
    return NextResponse.json(
      { error: 'Failed to verify home', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
