// Admin Inquiry Detail API
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, AuditAction } from '@prisma/client';
import { createAuditLogFromRequest } from '@/lib/audit';
import { z } from 'zod';

const updateSchema = z.object({
  status: z.enum(['NEW', 'CONTACTED', 'TOUR_SCHEDULED', 'TOUR_COMPLETED', 'PLACEMENT_OFFERED', 'PLACEMENT_ACCEPTED', 'CLOSED_LOST', 'QUALIFIED', 'CONVERTING', 'CONVERTED']).optional(),
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assignedToId: z.string().nullable().optional(),
  internalNotes: z.string().optional(),
  tourDate: z.string().nullable().optional(),
});

export async function GET(
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

    const inquiry = await prisma.inquiry.findUnique({
      where: { id },
      include: {
        home: {
          include: {
            operator: {
              include: { user: { select: { firstName: true, lastName: true, email: true } } },
            },
          },
        },
        family: {
          include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } } },
        },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        convertedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        convertedResident: {
          select: { id: true, firstName: true, lastName: true },
        },
        documents: {
          include: { uploadedBy: { select: { firstName: true, lastName: true } } },
          orderBy: { uploadedAt: 'desc' },
        },
        responses: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        followUps: {
          orderBy: { scheduledFor: 'desc' },
          take: 20,
        },
      },
    });

    if (!inquiry) {
      return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 });
    }

    // Get audit logs for this inquiry
    const auditLogs = await prisma.auditLog.findMany({
      where: { resourceId: id, resourceType: 'INQUIRY' },
      include: { user: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ inquiry, auditLogs });
  } catch (error) {
    console.error('Admin inquiry fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch inquiry' }, { status: 500 });
  }
}

export async function PATCH(
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
    const data = updateSchema.parse(body);

    // Prepare update data
    const updateData: Record<string, unknown> = {};
    if (data.status !== undefined) updateData.status = data.status;
    if (data.urgency !== undefined) updateData.urgency = data.urgency;
    if (data.assignedToId !== undefined) updateData.assignedToId = data.assignedToId;
    if (data.internalNotes !== undefined) updateData.internalNotes = data.internalNotes;
    if (data.tourDate !== undefined) {
      updateData.tourDate = data.tourDate ? new Date(data.tourDate) : null;
    }

    const inquiry = await prisma.inquiry.update({
      where: { id },
      data: updateData,
      include: {
        home: { select: { name: true } },
        assignedTo: { select: { firstName: true, lastName: true } },
      },
    });

    // Create audit log
    await createAuditLogFromRequest(request, {
      userId: user.id,
      action: AuditAction.UPDATE,
      resourceType: 'INQUIRY',
      resourceId: id,
      details: { changes: data, homeName: inquiry.home.name },
    });

    return NextResponse.json({ inquiry });
  } catch (error) {
    console.error('Admin inquiry update error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update inquiry' }, { status: 500 });
  }
}
