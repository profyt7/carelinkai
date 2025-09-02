/**
 * Shift Applications API Route
 * 
 * Provides endpoint for caregivers to apply to shifts:
 * - POST: Submit an application for a shift
 * 
 * @module api/shifts/[id]/applications
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { ShiftStatus, UserRole, ShiftApplicationStatus } from '@prisma/client';
import { authOptions } from '@/lib/auth-db-simple';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { createInAppNotification } from '@/lib/services/notifications';

// ========================================================================
// VALIDATION SCHEMAS
// ========================================================================

// Schema for POST request body (apply to shift)
const ApplyToShiftSchema = z.object({
  notes: z.string().optional(),
});

// ========================================================================
// HELPER FUNCTIONS
// ========================================================================

/**
 * Handles API errors and returns appropriate responses
 */
function handleApiError(error: unknown) {
  if (error instanceof z.ZodError) {
    // Handle validation errors
    return NextResponse.json(
      { 
        success: false, 
        error: 'Invalid request data',
        validation: error.errors 
      }, 
      { status: 400 }
    );
  } else {
    // Handle unknown errors
    logger.error('Unexpected error in shift applications API', { error });
    return NextResponse.json(
      { 
        success: false, 
        error: 'An unexpected error occurred' 
      }, 
      { status: 500 }
    );
  }
}

// ========================================================================
 * DELETE handler for withdrawing an application
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // 2. Verify user is a caregiver
    if (session.user.role !== UserRole.CAREGIVER) {
      return NextResponse.json(
        { success: false, error: 'Only caregivers can withdraw applications' },
        { status: 403 }
      );
    }

    // 3. Validate shift ID
    const { id: shiftId } = params;
    if (!shiftId) {
      return NextResponse.json(
        { success: false, error: 'Shift ID is required' },
        { status: 400 }
      );
    }

    // 4. Get caregiver ID
    const caregiver = await prisma.caregiver.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });
    if (!caregiver) {
      return NextResponse.json(
        { success: false, error: 'Caregiver record not found' },
        { status: 404 }
      );
    }

    // 5. Find existing application in APPLIED or OFFERED state
    const application = await prisma.shiftApplication.findFirst({
      where: {
        shiftId,
        caregiverId: caregiver.id,
        status: { in: [ShiftApplicationStatus.APPLIED, ShiftApplicationStatus.OFFERED] }
      },
      include: {
        shift: {
          include: {
            home: {
              select: {
                name: true,
                operator: { select: { userId: true, companyName: true } }
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

    // 6. Update to WITHDRAWN
    const now = new Date();
    const updated = await prisma.shiftApplication.update({
      where: { id: application.id },
      data: {
        status: ShiftApplicationStatus.WITHDRAWN,
        withdrawnAt: now
      }
    });

    // 7. Notify operator (best-effort)
    try {
      const operatorUserId = application.shift.home.operator.userId;
      await createInAppNotification({
        userId: operatorUserId,
        type: 'BOOKING',
        title: 'Shift Application Withdrawn',
        message: `A caregiver withdrew an application for a shift at ${application.shift.home.name}.`,
        data: {
          shiftId,
          applicationId: updated.id,
          caregiverId: caregiver.id
        }
      });
    } catch (notificationError) {
      logger.error('Failed to send withdraw notification', { notificationError });
    }

    // 8. Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          id: updated.id,
          shiftId: updated.shiftId,
          caregiverId: updated.caregiverId,
          status: updated.status,
          notes: updated.notes,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
          withdrawnAt: updated.withdrawnAt
        }
      }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

/**
// API ROUTE HANDLERS
// ========================================================================

/**
 * POST handler for applying to a shift
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    
    // 2. Verify user is a caregiver
    if (session.user.role !== UserRole.CAREGIVER) {
      return NextResponse.json(
        { success: false, error: 'Only caregivers can apply to shifts' }, 
        { status: 403 }
      );
    }
    
    // 3. Get shift ID from params
    const { id: shiftId } = params;
    
    if (!shiftId) {
      return NextResponse.json(
        { success: false, error: 'Shift ID is required' }, 
        { status: 400 }
      );
    }
    
    // 4. Parse request body
    const body = await request.json();
    
    // 5. Validate request data
    const parseResult = ApplyToShiftSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid application data',
          validation: parseResult.error.errors 
        }, 
        { status: 400 }
      );
    }
    
    const { notes } = parseResult.data;
    
    // 6. Get caregiver ID for the current user
    const caregiver = await prisma.caregiver.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });
    
    if (!caregiver) {
      return NextResponse.json(
        { success: false, error: 'Caregiver record not found' }, 
        { status: 404 }
      );
    }
    
    // 7. Verify shift exists and is OPEN
    const shift = await prisma.caregiverShift.findUnique({
      where: { id: shiftId },
      include: {
        home: {
          select: {
            name: true,
            operator: {
              select: {
                userId: true,
                companyName: true
              }
            }
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
    
    if (shift.status !== ShiftStatus.OPEN) {
      return NextResponse.json(
        { success: false, error: 'This shift is not open for applications' }, 
        { status: 400 }
      );
    }
    
    // 8. Check if caregiver has already applied
    const existingApplication = await prisma.shiftApplication.findFirst({
      where: {
        shiftId,
        caregiverId: caregiver.id,
        status: {
          notIn: [ShiftApplicationStatus.WITHDRAWN, ShiftApplicationStatus.REJECTED]
        }
      }
    });
    
    if (existingApplication) {
      return NextResponse.json(
        { success: false, error: 'You have already applied to this shift' }, 
        { status: 409 }
      );
    }
    
    // 9. Create the application
    const application = await prisma.shiftApplication.create({
      data: {
        shiftId,
        caregiverId: caregiver.id,
        status: ShiftApplicationStatus.APPLIED,
        notes
      },
      include: {
        caregiver: {
          select: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                profileImageUrl: true
              }
            }
          }
        },
        shift: {
          select: {
            startTime: true,
            endTime: true
          }
        }
      }
    });
    
    // 10. Send notification to operator
    try {
      const operatorUserId = shift.home.operator.userId;
      const caregiverName = `${application.caregiver.user.firstName} ${application.caregiver.user.lastName}`;
      const shiftDate = application.shift.startTime.toLocaleDateString();
      const shiftTime = `${application.shift.startTime.toLocaleTimeString()} - ${application.shift.endTime.toLocaleTimeString()}`;
      
      await createInAppNotification({
        userId: operatorUserId,
        type: 'BOOKING',
        title: 'New Shift Application',
        message: `${caregiverName} has applied for a shift at ${shift.home.name} on ${shiftDate} (${shiftTime})`,
        data: {
          shiftId,
          applicationId: application.id,
          caregiverId: caregiver.id
        }
      });
    } catch (notificationError) {
      // Log error but don't fail the request
      logger.error('Failed to send notification for shift application', { notificationError });
    }
    
    // 11. Return success response
    return NextResponse.json(
      { 
        success: true, 
        data: {
          id: application.id,
          shiftId: application.shiftId,
          caregiverId: application.caregiverId,
          status: application.status,
          notes: application.notes,
          createdAt: application.createdAt,
          updatedAt: application.updatedAt
        }
      }, 
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
