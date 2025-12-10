import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { requirePermission, getUserScope, handleAuthError } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/operator/caregivers/[id]/assignments - List all assignments
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require CAREGIVERS_VIEW permission
    const user = await requirePermission(PERMISSIONS.CAREGIVERS_VIEW);
    
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

    const caregiver = await prisma.caregiver.findFirst({
      where: whereClause
    });

    if (!caregiver) {
      return NextResponse.json(
        { error: 'Caregiver not found or you do not have access' },
        { status: 404 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const includeHistory = searchParams.get('includeHistory') === 'true';

    // Build assignments where clause
    const assignmentsWhere: any = { caregiverId: params.id };
    if (!includeHistory) {
      assignmentsWhere.endDate = null; // Only active assignments
    }

    // Fetch assignments
    const assignments = await prisma.caregiverAssignment.findMany({
      where: assignmentsWhere,
      include: {
        resident: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              }
            },
            careNeeds: {
              select: {
                roomNumber: true,
              }
            }
          }
        },
        assignedByUser: {
          select: {
            firstName: true,
            lastName: true,
          }
        }
      },
      orderBy: { startDate: 'desc' }
    });

    // Transform assignments
    const transformedAssignments = assignments.map(assignment => ({
      id: assignment.id,
      residentId: assignment.residentId,
      resident: {
        id: assignment.resident.id,
        fullName: `${assignment.resident.user.firstName} ${assignment.resident.user.lastName}`,
        roomNumber: assignment.resident.careNeeds?.roomNumber,
        photoUrl: assignment.resident.photoUrl,
      },
      isPrimary: assignment.isPrimary,
      startDate: assignment.startDate,
      endDate: assignment.endDate,
      assignedBy: assignment.assignedByUser ? 
        `${assignment.assignedByUser.firstName} ${assignment.assignedByUser.lastName}` : 
        null,
      notes: assignment.notes,
      createdAt: assignment.createdAt,
    }));

    // Separate current and historical assignments
    const current = transformedAssignments.filter(a => !a.endDate);
    const history = transformedAssignments.filter(a => a.endDate);

    return NextResponse.json({
      current,
      history: includeHistory ? history : []
    });
  } catch (error) {
    console.error('[GET Assignments] Error:', error);
    return handleAuthError(error);
  }
}

// POST /api/operator/caregivers/[id]/assignments - Create new assignment
const createAssignmentSchema = z.object({
  residentId: z.string().cuid(),
  isPrimary: z.boolean().optional().default(false),
  startDate: z.string().datetime().optional(),
  notes: z.string().optional().nullable(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require CAREGIVERS_ASSIGN permission
    const user = await requirePermission(PERMISSIONS.CAREGIVERS_ASSIGN);
    
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

    const caregiver = await prisma.caregiver.findFirst({
      where: whereClause
    });

    if (!caregiver) {
      return NextResponse.json(
        { error: 'Caregiver not found or you do not have access' },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const parsed = createAssignmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Verify resident exists and user has access
    const resident = await prisma.resident.findUnique({
      where: { id: parsed.data.residentId }
    });

    if (!resident) {
      return NextResponse.json(
        { error: 'Resident not found' },
        { status: 404 }
      );
    }

    // Check for existing active assignment
    const existingAssignment = await prisma.caregiverAssignment.findFirst({
      where: {
        caregiverId: params.id,
        residentId: parsed.data.residentId,
        endDate: null
      }
    });

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'Caregiver is already assigned to this resident' },
        { status: 409 }
      );
    }

    // If setting as primary, check for existing primary caregiver
    if (parsed.data.isPrimary) {
      const existingPrimary = await prisma.caregiverAssignment.findFirst({
        where: {
          residentId: parsed.data.residentId,
          isPrimary: true,
          endDate: null
        }
      });

      if (existingPrimary) {
        return NextResponse.json(
          { 
            error: 'Resident already has a primary caregiver',
            message: 'Please remove the existing primary caregiver first or set this assignment as non-primary'
          },
          { status: 409 }
        );
      }
    }

    // Create assignment
    const assignment = await prisma.caregiverAssignment.create({
      data: {
        caregiverId: params.id,
        residentId: parsed.data.residentId,
        isPrimary: parsed.data.isPrimary,
        startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : new Date(),
        assignedBy: user.id,
        notes: parsed.data.notes,
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
    });

    return NextResponse.json({
      message: 'Assignment created successfully',
      assignment
    }, { status: 201 });
  } catch (error) {
    console.error('[POST Assignment] Error:', error);
    return handleAuthError(error);
  }
}
