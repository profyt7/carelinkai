import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, handleAuthError } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/permissions';
import { z } from 'zod';
import { createAuditLogFromRequest } from '@/lib/audit';
import { AuditAction } from '@prisma/client';

export const dynamic = 'force-dynamic';

// Validation schema for updating a caregiver
const updateCaregiverSchema = z.object({
  bio: z.string().optional(),
  yearsExperience: z.number().int().min(0).optional(),
  hourlyRate: z.number().positive().optional(),
  languages: z.array(z.string()).optional(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'PER_DIEM', 'CONTRACT']).optional(),
  employmentStatus: z.enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED']).optional(),
  hireDate: z.string().datetime().optional(),
  photoUrl: z.string().url().optional(),
  specialties: z.array(z.string()).optional(),
});

/**
 * GET /api/caregivers/[id]
 * Get caregiver details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission(PERMISSIONS.CAREGIVERS_VIEW);

    const caregiver = await prisma.caregiver.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        certifications: {
          orderBy: { expiryDate: 'asc' },
        },
        assignments: {
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
          orderBy: { startDate: 'desc' },
        },
        documents: {
          orderBy: { uploadDate: 'desc' },
        },
        employments: {
          include: {
            operator: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
          orderBy: { startDate: 'desc' },
        },
      },
    });

    if (!caregiver) {
      return NextResponse.json(
        { error: 'Caregiver not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(caregiver);
  } catch (error) {
    return handleAuthError(error);
  }
}

/**
 * PATCH /api/caregivers/[id]
 * Update caregiver details
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission(PERMISSIONS.CAREGIVERS_UPDATE);
    const body = await request.json();

    const validatedData = updateCaregiverSchema.parse(body);

    const caregiver = await prisma.caregiver.findUnique({
      where: { id: params.id },
    });

    if (!caregiver) {
      return NextResponse.json(
        { error: 'Caregiver not found' },
        { status: 404 }
      );
    }

    const updated = await prisma.caregiver.update({
      where: { id: params.id },
      data: {
        bio: validatedData.bio,
        yearsExperience: validatedData.yearsExperience,
        hourlyRate: validatedData.hourlyRate,
        languages: validatedData.languages,
        employmentType: validatedData.employmentType,
        employmentStatus: validatedData.employmentStatus,
        hireDate: validatedData.hireDate ? new Date(validatedData.hireDate) : undefined,
        photoUrl: validatedData.photoUrl,
        specialties: validatedData.specialties,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    // Create audit log
    await createAuditLogFromRequest(request, {
      action: AuditAction.UPDATE,
      resourceType: 'CAREGIVER',
      resourceId: params.id,
      details: { changes: validatedData },
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

/**
 * DELETE /api/caregivers/[id]
 * Delete a caregiver
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission(PERMISSIONS.CAREGIVERS_DELETE);

    const caregiver = await prisma.caregiver.findUnique({
      where: { id: params.id },
    });

    if (!caregiver) {
      return NextResponse.json(
        { error: 'Caregiver not found' },
        { status: 404 }
      );
    }

    await prisma.caregiver.delete({
      where: { id: params.id },
    });

    // Create audit log
    await createAuditLogFromRequest(request, {
      action: AuditAction.DELETE,
      resourceType: 'CAREGIVER',
      resourceId: params.id,
      details: { caregiverId: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
