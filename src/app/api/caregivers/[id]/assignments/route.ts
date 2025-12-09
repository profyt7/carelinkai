import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, handleAuthError } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/permissions';
import { z } from 'zod';
import { createAuditLogFromRequest } from '@/lib/audit';
import { AuditAction } from '@prisma/client';

export const dynamic = 'force-dynamic';

const createAssignmentSchema = z.object({
  residentId: z.string().cuid(),
  isPrimary: z.boolean().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission(PERMISSIONS.CAREGIVERS_VIEW);

    const assignments = await prisma.caregiverAssignment.findMany({
      where: { caregiverId: params.id },
      include: {
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
            status: true,
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    return NextResponse.json({ assignments });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(PERMISSIONS.CAREGIVERS_ASSIGN);
    const body = await request.json();

    const validatedData = createAssignmentSchema.parse(body);

    // Check if caregiver exists
    const caregiver = await prisma.caregiver.findUnique({
      where: { id: params.id },
    });

    if (!caregiver) {
      return NextResponse.json(
        { error: 'Caregiver not found' },
        { status: 404 }
      );
    }

    // Check if resident exists
    const resident = await prisma.resident.findUnique({
      where: { id: validatedData.residentId },
    });

    if (!resident) {
      return NextResponse.json(
        { error: 'Resident not found' },
        { status: 404 }
      );
    }

    // If isPrimary is true, unset any existing primary assignments for this resident
    if (validatedData.isPrimary) {
      await prisma.caregiverAssignment.updateMany({
        where: {
          residentId: validatedData.residentId,
          isPrimary: true,
          endDate: null,
        },
        data: {
          isPrimary: false,
        },
      });
    }

    const assignment = await prisma.caregiverAssignment.create({
      data: {
        caregiverId: params.id,
        residentId: validatedData.residentId,
        isPrimary: validatedData.isPrimary || false,
        startDate: new Date(validatedData.startDate),
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
        notes: validatedData.notes,
        assignedBy: user.id,
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
      action: AuditAction.CREATE,
      resourceType: 'ASSIGNMENT',
      resourceId: assignment.id,
      details: { caregiverId: params.id, residentId: validatedData.residentId },
    });

    return NextResponse.json(assignment, { status: 201 });
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
