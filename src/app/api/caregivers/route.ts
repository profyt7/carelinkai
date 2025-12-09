import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, getUserScope, handleAuthError } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/permissions';
import { z } from 'zod';
import { createAuditLogFromRequest } from '@/lib/audit';
import { AuditAction } from '@prisma/client';

export const dynamic = 'force-dynamic';

// Validation schema for creating a caregiver
const createCaregiverSchema = z.object({
  userId: z.string().cuid(),
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
 * GET /api/caregivers
 * List all caregivers with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.CAREGIVERS_VIEW);
    const searchParams = request.nextUrl.searchParams;

    // Pagination
    const limit = parseInt(searchParams.get('limit') || '20');
    const cursor = searchParams.get('cursor');

    // Filters
    const q = searchParams.get('q'); // Search by name
    const employmentStatus = searchParams.get('employmentStatus');
    const employmentType = searchParams.get('employmentType');
    const homeId = searchParams.get('homeId');
    const specialties = searchParams.get('specialties')?.split(',').filter(Boolean);

    // Build where clause with data scoping
    const scope = await getUserScope(user.id);
    const where: any = {};

    // Apply data scoping
    if (scope.homeIds.length > 0 && user.role !== 'ADMIN') {
      // Filter by employments in the user's homes
      where.employments = {
        some: {
          operator: {
            homes: {
              some: {
                id: { in: scope.homeIds }
              }
            }
          }
        }
      };
    }

    if (q) {
      where.user = {
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      };
    }

    if (employmentStatus) {
      where.employmentStatus = employmentStatus;
    }

    if (employmentType) {
      where.employmentType = employmentType;
    }

    if (homeId) {
      where.employments = {
        some: {
          operator: {
            homes: {
              some: { id: homeId }
            }
          }
        }
      };
    }

    if (specialties && specialties.length > 0) {
      where.specialties = {
        hasSome: specialties,
      };
    }

    if (cursor) {
      where.id = { lt: cursor };
    }

    const caregivers = await prisma.caregiver.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
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
          where: { status: 'CURRENT' },
          take: 5,
        },
        assignments: {
          where: { endDate: null },
          include: {
            resident: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    const nextCursor = caregivers.length === limit ? caregivers[caregivers.length - 1].id : null;

    return NextResponse.json({
      caregivers,
      nextCursor,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

/**
 * POST /api/caregivers
 * Create a new caregiver
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.CAREGIVERS_CREATE);
    const body = await request.json();

    const validatedData = createCaregiverSchema.parse(body);

    // Check if user exists and is not already a caregiver
    const targetUser = await prisma.user.findUnique({
      where: { id: validatedData.userId },
      include: { caregiver: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (targetUser.caregiver) {
      return NextResponse.json(
        { error: 'User is already a caregiver' },
        { status: 400 }
      );
    }

    // Create caregiver
    const caregiver = await prisma.caregiver.create({
      data: {
        userId: validatedData.userId,
        bio: validatedData.bio,
        yearsExperience: validatedData.yearsExperience,
        hourlyRate: validatedData.hourlyRate,
        languages: validatedData.languages || [],
        employmentType: validatedData.employmentType,
        employmentStatus: validatedData.employmentStatus || 'ACTIVE',
        hireDate: validatedData.hireDate ? new Date(validatedData.hireDate) : null,
        photoUrl: validatedData.photoUrl,
        specialties: validatedData.specialties || [],
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
      action: AuditAction.CREATE,
      resourceType: 'CAREGIVER',
      resourceId: caregiver.id,
      details: { caregiverId: caregiver.id },
    });

    return NextResponse.json(caregiver, { status: 201 });
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
