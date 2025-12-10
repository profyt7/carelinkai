import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { requirePermission, getUserScope, handleAuthError, requireAuth } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/operator/caregivers/[id] - Fetch single caregiver with all relations
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require CAREGIVERS_VIEW permission
    const user = await requirePermission(PERMISSIONS.CAREGIVERS_VIEW);
    
    // Get user scope for data filtering
    const scope = await getUserScope(user.id);
    
    // Build where clause based on scope
    const whereClause: any = { id: params.id };
    
    // Apply scope-based filtering for operators
    if (scope.role === UserRole.OPERATOR && scope.operatorIds && scope.operatorIds !== "ALL") {
      whereClause.employments = {
        some: {
          operatorId: { in: scope.operatorIds },
          isActive: true
        }
      };
    }

    // Fetch caregiver with all relations
    const caregiver = await prisma.caregiver.findFirst({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          }
        },
        employments: {
          where: { isActive: true },
          include: {
            operator: {
              select: {
                id: true,
                companyName: true,
              }
            }
          },
          orderBy: {
            startDate: 'desc'
          },
          take: 1
        },
        certifications: {
          orderBy: {
            expiryDate: 'asc'
          }
        },
        assignments: {
          where: {
            endDate: null // Only active assignments
          },
          include: {
            resident: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!caregiver) {
      return NextResponse.json(
        { error: 'Caregiver not found or you do not have access' },
        { status: 404 }
      );
    }

    // Transform the response
    const response = {
      id: caregiver.id,
      userId: caregiver.userId,
      user: {
        firstName: caregiver.user.firstName,
        lastName: caregiver.user.lastName,
        email: caregiver.user.email,
        phoneNumber: caregiver.user.phone || null,
      },
      photoUrl: caregiver.photoUrl,
      specializations: caregiver.specializations || [],
      languages: caregiver.languages || [],
      yearsOfExperience: caregiver.yearsOfExperience,
      bio: caregiver.bio,
      employmentType: caregiver.employmentType,
      employmentStatus: caregiver.employmentStatus,
      hireDate: caregiver.hireDate,
      employment: caregiver.employments[0] || null,
      certifications: caregiver.certifications,
      assignments: caregiver.assignments.map(assignment => ({
        ...assignment,
        resident: {
          ...assignment.resident,
          fullName: `${assignment.resident.user.firstName} ${assignment.resident.user.lastName}`
        }
      })),
      rating: caregiver.rating,
      totalReviews: caregiver.totalReviews,
      createdAt: caregiver.createdAt,
      updatedAt: caregiver.updatedAt,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[GET Caregiver] Error:', error);
    return handleAuthError(error);
  }
}

// PATCH /api/operator/caregivers/[id] - Update caregiver
const updateCaregiverSchema = z.object({
  photoUrl: z.string().url().optional().nullable(),
  specializations: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  yearsOfExperience: z.number().int().min(0).optional().nullable(),
  bio: z.string().optional().nullable(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'PER_DIEM']).optional(),
  employmentStatus: z.enum(['ACTIVE', 'ON_LEAVE', 'TERMINATED', 'SUSPENDED']).optional(),
  hireDate: z.string().datetime().optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require CAREGIVERS_EDIT permission
    const user = await requirePermission(PERMISSIONS.CAREGIVERS_EDIT);
    
    // Get user scope
    const scope = await getUserScope(user.id);
    
    // Verify access to this caregiver
    const whereClause: any = { id: params.id };
    if (scope.role === UserRole.OPERATOR && scope.operatorIds && scope.operatorIds !== "ALL") {
      whereClause.employments = {
        some: {
          operatorId: { in: scope.operatorIds },
          isActive: true
        }
      };
    }

    const existingCaregiver = await prisma.caregiver.findFirst({
      where: whereClause
    });

    if (!existingCaregiver) {
      return NextResponse.json(
        { error: 'Caregiver not found or you do not have access' },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const parsed = updateCaregiverSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Update caregiver
    const updatedCaregiver = await prisma.caregiver.update({
      where: { id: params.id },
      data: parsed.data,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          }
        }
      }
    });

    return NextResponse.json({
      message: 'Caregiver updated successfully',
      caregiver: updatedCaregiver
    });
  } catch (error) {
    console.error('[PATCH Caregiver] Error:', error);
    return handleAuthError(error);
  }
}

// DELETE /api/operator/caregivers/[id] - Delete caregiver
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require CAREGIVERS_DELETE permission
    const user = await requirePermission(PERMISSIONS.CAREGIVERS_DELETE);
    
    // Get user scope
    const scope = await getUserScope(user.id);
    
    // Verify access to this caregiver
    const whereClause: any = { id: params.id };
    if (scope.role === UserRole.OPERATOR && scope.operatorIds && scope.operatorIds !== "ALL") {
      whereClause.employments = {
        some: {
          operatorId: { in: scope.operatorIds },
          isActive: true
        }
      };
    }

    const existingCaregiver = await prisma.caregiver.findFirst({
      where: whereClause,
      include: {
        assignments: true,
        certifications: true,
      }
    });

    if (!existingCaregiver) {
      return NextResponse.json(
        { error: 'Caregiver not found or you do not have access' },
        { status: 404 }
      );
    }

    // Check for active assignments
    const activeAssignments = existingCaregiver.assignments.filter(a => !a.endDate);
    if (activeAssignments.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete caregiver with active assignments',
          activeAssignments: activeAssignments.length 
        },
        { status: 400 }
      );
    }

    // Delete caregiver (cascade will handle related records)
    await prisma.caregiver.delete({
      where: { id: params.id }
    });

    return NextResponse.json({
      message: 'Caregiver deleted successfully'
    });
  } catch (error) {
    console.error('[DELETE Caregiver] Error:', error);
    return handleAuthError(error);
  }
}
