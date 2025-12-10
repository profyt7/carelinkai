import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { requirePermission, getUserScope, handleAuthError } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// DELETE /api/operator/caregivers/[id]/assignments/[assignmentId] - End assignment
const endAssignmentSchema = z.object({
  endDate: z.string().datetime().optional(),
  notes: z.string().optional().nullable(),
});

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; assignmentId: string } }
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

    // Verify assignment belongs to this caregiver
    const existingAssignment = await prisma.caregiverAssignment.findFirst({
      where: {
        id: params.assignmentId,
        caregiverId: params.id
      }
    });

    if (!existingAssignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    if (existingAssignment.endDate) {
      return NextResponse.json(
        { error: 'Assignment has already ended' },
        { status: 400 }
      );
    }

    // Parse request body for optional endDate and notes
    let endDate = new Date();
    let notes = existingAssignment.notes;

    try {
      const body = await request.json();
      const parsed = endAssignmentSchema.safeParse(body);
      
      if (parsed.success) {
        if (parsed.data.endDate) {
          endDate = new Date(parsed.data.endDate);
        }
        if (parsed.data.notes) {
          notes = parsed.data.notes;
        }
      }
    } catch {
      // Body is optional, use defaults
    }

    // Update assignment to set endDate
    const assignment = await prisma.caregiverAssignment.update({
      where: { id: params.assignmentId },
      data: {
        endDate,
        notes
      }
    });

    return NextResponse.json({
      message: 'Assignment ended successfully',
      assignment
    });
  } catch (error) {
    console.error('[DELETE Assignment] Error:', error);
    return handleAuthError(error);
  }
}
