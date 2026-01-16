// Admin Assign Inquiry to Staff
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, AuditAction } from '@prisma/client';
import { createAuditLogFromRequest } from '@/lib/audit';
import { z } from 'zod';

const assignSchema = z.object({
  assignedToId: z.string().nullable(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { assignedToId } = assignSchema.parse(body);

    // Verify assignee exists if provided
    if (assignedToId) {
      const assignee = await prisma.user.findUnique({
        where: { id: assignedToId },
      });
      if (!assignee) {
        return NextResponse.json({ error: 'Assignee not found' }, { status: 404 });
      }
    }

    const inquiry = await prisma.inquiry.update({
      where: { id },
      data: { assignedToId },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        home: { select: { name: true } },
      },
    });

    await createAuditLogFromRequest(request, {
      userId: user.id,
      action: AuditAction.UPDATE,
      resourceType: 'INQUIRY',
      resourceId: id,
      details: {
        action: 'assign',
        assignedTo: assignedToId ? `${inquiry.assignedTo?.firstName} ${inquiry.assignedTo?.lastName}` : 'Unassigned',
      },
    });

    return NextResponse.json({ inquiry });
  } catch (error) {
    console.error('Admin assign inquiry error:', error);
    return NextResponse.json({ error: 'Failed to assign inquiry' }, { status: 500 });
  }
}
