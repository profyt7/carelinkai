/**
 * Shift Application Reject API Route
 * 
 * Provides endpoint for operators to reject shift applications:
 * - POST: Reject a caregiver's application for a shift
 * 
 * @module api/shifts/[id]/applications/[caregiverId]/reject
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-db-simple';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { UserRole, ShiftApplicationStatus } from '@prisma/client';
import { createInAppNotification } from '@/lib/services/notifications';

// ========================================================================
// HELPER FUNCTIONS
// ========================================================================

/**
 * Handles API errors and returns appropriate responses
 */
function handleApiError(error: unknown) {
  // Handle unknown errors
  logger.error('Unexpected error in shift application reject API', { error });
  return NextResponse.json(
    { 
      success: false, 
      error: 'An unexpected error occurred' 
    }, 
    { status: 500 }
  );
}

// ========================================================================
// API ROUTE HANDLERS
// ========================================================================

/**
 * POST handler for rejecting a shift application
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string, caregiverId: string } }
) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' }, 
        { status: 401 }
      );
    }
    
    // 2. Verify user is an operator, admin, or staff
    if (
      session.user.role !== UserRole.OPERATOR && 
      session.user.role !== UserRole.ADMIN && 
      session.user.role !== UserRole.STAFF
    ) {
      return NextResponse.json(
        { success: false, error: 'Only operators, admins, or staff can reject applications' }, 
        { status: 403 }
      );
    }
    
    // 3. Get shift ID and caregiver ID from params
    const { id: shiftId, caregiverId } = params;
    
    if (!shiftId || !caregiverId) {
      return NextResponse.json(
        { success: false, error: 'Shift ID and caregiver ID are required' }, 
        { status: 400 }
      );
    }
    
    // 4. Find the shift and verify it exists
    const shift = await prisma.caregiverShift.findUnique({
      where: { id: shiftId },
      include: {
        home: {
          select: {
            id: true,
            name: true,
            operatorId: true
          }
        }
      }
    });
    
    if (!shift) {
      return NextResponse.json(
        { success: false, error: 'Shift not found' }, 
        { status: 404 }
      );
    }
    
    // 5. If user is an operator, verify they have access to this home
    if (session.user.role === UserRole.OPERATOR) {
      const operator = await prisma.operator.findUnique({
        where: { userId: session.user.id }
      });
      
      if (!operator || operator.id !== shift.home.operatorId) {
        return NextResponse.json(
          { success: false, error: 'You do not have permission to reject applications for this shift' }, 
          { status: 403 }
        );
      }
    }
    
    // 6. Find the application with status APPLIED or OFFERED
    const application = await prisma.shiftApplication.findFirst({
      where: {
        shiftId,
        caregiverId,
        status: {
          in: [ShiftApplicationStatus.APPLIED, ShiftApplicationStatus.OFFERED]
        }
      },
      include: {
        caregiver: {
          select: {
            userId: true,
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });
    
    if (!application) {
      return NextResponse.json(
        { success: false, error: 'Active application not found' }, 
        { status: 404 }
      );
    }
    
    // 7. Update the application status to REJECTED
    const now = new Date();
    const updated = await prisma.shiftApplication.update({
      where: { id: application.id },
      data: {
        status: ShiftApplicationStatus.REJECTED,
        rejectedAt: now
      }
    });
    
    // 8. Send notification to caregiver (best-effort)
    try {
      const caregiverUserId = application.caregiver.userId;
      
      await createInAppNotification({
        userId: caregiverUserId,
        type: 'BOOKING',
        title: 'Shift Application Rejected',
        message: `Your application for a shift at ${shift.home.name} has been rejected.`,
        data: {
          shiftId,
          applicationId: updated.id,
          caregiverId
        }
      });
    } catch (notificationError) {
      // Log error but don't fail the request
      logger.error('Failed to send notification for shift application rejection', { notificationError });
    }
    
    // 9. Return success response
    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        shiftId: updated.shiftId,
        caregiverId: updated.caregiverId,
        status: updated.status,
        notes: updated.notes,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
        rejectedAt: updated.rejectedAt
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
