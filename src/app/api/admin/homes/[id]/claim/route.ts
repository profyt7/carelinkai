import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { createAuditLogFromRequest } from '@/lib/audit';
import { AuditAction } from '@prisma/client';
import { sendOperatorClaimNotification } from '@/lib/email';

export const dynamic = 'force-dynamic';

// Admin "claim" action: hands a pre-populated directory listing to a real
// operator. Reassigns the listing's operatorId and moves it to PENDING_REVIEW
// so the operator can fill in real details before it goes live.
const claimHomeSchema = z
  .object({
    operatorId: z.string().min(1).optional(),
    operatorEmail: z.string().email().optional(),
  })
  .refine((d) => d.operatorId || d.operatorEmail, {
    message: 'Provide either operatorId or operatorEmail',
  });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    // Admin only
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { operatorId, operatorEmail } = claimHomeSchema.parse(body);

    // Resolve the target operator (by id, or by the operator user's email)
    const operator = operatorId
      ? await prisma.operator.findUnique({
          where: { id: operatorId },
          include: { user: true },
        })
      : await prisma.operator.findFirst({
          where: { user: { email: operatorEmail } },
          include: { user: true },
        });

    if (!operator) {
      return NextResponse.json(
        { error: 'Operator not found' },
        { status: 404 }
      );
    }

    // Find the home being claimed
    const home = await prisma.assistedLivingHome.findUnique({
      where: { id },
      include: { operator: { include: { user: true } } },
    });

    if (!home) {
      return NextResponse.json({ error: 'Home not found' }, { status: 404 });
    }

    const previousOperatorId = home.operatorId;

    // Reassign the listing to the operator and queue it for review
    const updatedHome = await prisma.assistedLivingHome.update({
      where: { id },
      data: {
        operatorId: operator.id,
        status: 'PENDING_REVIEW',
      },
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

    // Notify the operator that the listing is now theirs
    await prisma.notification.create({
      data: {
        userId: operator.userId,
        type: 'SYSTEM',
        title: 'Listing assigned to you',
        message: `The listing "${home.name}" has been assigned to your account. Add your photos, pricing, and availability, then it will be reviewed and published.`,
        link: `/operator/homes/${home.id}`,
      },
    });

    // Audit log
    await createAuditLogFromRequest(
      request,
      AuditAction.UPDATE,
      'AssistedLivingHome',
      id,
      `Admin claimed home ${id} for operator ${operator.id}`,
      {
        adminAction: true,
        claimedForOperatorId: operator.id,
        claimedForOperatorEmail: operator.user?.email ?? null,
        previousOperatorId,
        newStatus: 'PENDING_REVIEW',
      }
    );

    // Surface the claim to the founder/admin in real time (non-blocking).
    void sendOperatorClaimNotification({
      facilityName: home.name,
      operatorEmail: operator.user?.email ?? 'unknown',
      status: 'PENDING_REVIEW',
    }).catch((e) => console.error('[admin claim] founder notification failed', e));

    return NextResponse.json({
      success: true,
      home: updatedHome,
      message: `Listing claimed for ${
        operator.user?.email ?? 'the operator'
      } and moved to Pending Review.`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Failed to claim home:', error);
    return NextResponse.json(
      {
        error: 'Failed to claim home',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
