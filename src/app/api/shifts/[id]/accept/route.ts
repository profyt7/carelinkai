/**
 * Shift Accept API Route
 * 
 * Provides endpoint for caregivers to accept an offered shift:
 * - POST: Accept a shift that was offered to the caregiver
 * 
 * @module api/shifts/[id]/accept
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

// Schema for POST request body (accept shift)
const AcceptShiftSchema = z.object({
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
    logger.error('Unexpected error in shift accept API', { error });
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
// API ROUTE HANDLERS
// ========================================================================

/**
 * POST handler for accepting a shift offer
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
        { success: false, error: 'Only caregivers can accept shift offers' }, 
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
    const parseResult = AcceptShiftSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid accept data',
          validation: parseResult.error.errors 
        }, 
        { status: 400 }
      );
    }
    
    const { notes } = parseResult.data;
    
    // 6. Get caregiver ID for the current user
    const caregiver = await prisma.caregiver.findUnique({
      where: { userId: session.user.id },
      select: { 
        id: true,
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
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
            id: true,
            name: true,
            operator: {
              select: {
                id: true,
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
        { success: false, error: 'This shift is not open for acceptance' }, 
        { status: 400 }
      );
    }
    
    // 8. Find the application for this caregiver and ensure it's OFFERED
    const application = await prisma.shiftApplication.findUnique({
      where: {
        shiftId_caregiverId: {
          shiftId,
          caregiverId: caregiver.id
        }
      }
    });
    
    if (!application) {
      return NextResponse.json(
        { success: false, error: 'No application found for this shift' }, 
        { status: 404 }
      );
    }
    
    if (application.status !== ShiftApplicationStatus.OFFERED) {
      return NextResponse.json(
        { success: false, error: 'This shift has not been offered to you' }, 
        { status: 400 }
      );
    }
    
    // 9. Update the application status to ACCEPTED
    const now = new Date();
    
    const updatedApplication = await prisma.shiftApplication.update({
      where: {
        id: application.id
      },
      data: {
        status: ShiftApplicationStatus.ACCEPTED,
        acceptedAt: now,
        notes: notes || application.notes
      },
      include: {
        shift: {
          select: {
            startTime: true,
            endTime: true,
            hourlyRate: true
          }
        }
      }
    });
    
    // 10. Send notification to operator
    try {
      const operatorUserId = shift.home.operator.userId;
      const caregiverName = `${caregiver.user.firstName} ${caregiver.user.lastName}`;
      const shiftDate = updatedApplication.shift.startTime.toLocaleDateString();
      const shiftTime = `${updatedApplication.shift.startTime.toLocaleTimeString()} - ${updatedApplication.shift.endTime.toLocaleTimeString()}`;
      
      await createInAppNotification({
        userId: operatorUserId,
        type: 'BOOKING',
        title: 'Shift Offer Accepted',
        message: `${caregiverName} has accepted your shift offer at ${shift.home.name} on ${shiftDate} (${shiftTime})`,
        data: {
          shiftId,
          applicationId: updatedApplication.id,
          caregiverId: caregiver.id
        }
      });
    } catch (notificationError) {
      // Log error but don't fail the request
      logger.error('Failed to send notification for shift acceptance', { notificationError });
    }
    
    // 11. Return success response
    return NextResponse.json({
      success: true,
      data: {
        id: updatedApplication.id,
        shiftId: updatedApplication.shiftId,
        caregiverId: updatedApplication.caregiverId,
        status: updatedApplication.status,
        notes: updatedApplication.notes,
        createdAt: updatedApplication.createdAt,
        updatedAt: updatedApplication.updatedAt,
        offeredAt: updatedApplication.offeredAt,
        acceptedAt: updatedApplication.acceptedAt
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
