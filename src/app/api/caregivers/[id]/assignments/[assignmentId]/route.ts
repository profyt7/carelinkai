import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, handleAuthError } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/permissions';
import { z } from 'zod';
import { createAuditLogFromRequest } from '@/lib/audit';
import { AuditAction } from '@prisma/client';

export const dynamic = 'force-dynamic';

const updateAssignmentSchema = z.object({
  isPrimary: z.boolean().optional(),
  endDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; assignmentId: string } }
) {
  try {
    await requirePermission(PERMISSIONS.CAREGIVERS_ASSIGN);
    const body = await request.json();

    const validatedData = updateAssignmentSchema.parse(body);

    const assignment = await prisma.caregiverAssignment.findUnique({
      where: { id: params.assignmentId },
    });

    if (!assignment || assignment.caregiverId !== params.id) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    // If isPrimary is being set to true, unset other primary assignments for this resident
    if (validatedData.isPrimary) {
      await prisma.caregiverAssignment.updateMany({
        where: {
          residentId: assignment.residentId,
          isPrimary: true,
          endDate: null,
          id: { not: params.assignmentId },
        },
        data: {
          isPrimary: false,
        },
      });
    }

    const updated = await prisma.caregiverAssignment.update({
      where: { id: params.assignmentId },
      data: {
        isPrimary: validatedData.isPrimary,
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : undefined,
        notes: validatedData.notes,
      },
      include: {
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
          },
        },
      },
    });

    await createAuditLogFromRequest(request, {
      action: AuditAction.UPDATE,
      resourceType: 'ASSIGNMENT',
      resourceId: params.assignmentId,
      details: { caregiverId: params.id, changes: validatedData },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    return handleAuthError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; assignmentId: string } }
) {
  try {
    await requirePermission(PERMISSIONS.CAREGIVERS_ASSIGN);

    const assignment = await prisma.caregiverAssignment.findUnique({
      where: { id: params.assignmentId },
    });

    if (!assignment || assignment.caregiverId !== params.id) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    await prisma.caregiverAssignment.delete({
      where: { id: params.assignmentId },
    });

    await createAuditLogFromRequest(request, {
      action: AuditAction.DELETE,
      resourceType: 'ASSIGNMENT',
      resourceId: params.assignmentId,
      details: { caregiverId: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
