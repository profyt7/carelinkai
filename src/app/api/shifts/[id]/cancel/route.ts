/**
 * Shift Cancel API Route
 * 
 * Provides endpoint for operators to cancel a shift:
 * - POST: Cancel a shift and notify relevant parties
 * 
 * @module api/shifts/[id]/cancel
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { ShiftStatus, UserRole } from '@prisma/client';
import { authOptions } from '@/lib/auth-db-simple';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { createInAppNotification } from '@/lib/services/notifications';
import { cancelAppointment } from '@/lib/services/calendar';

// ========================================================================
// VALIDATION SCHEMAS
// ========================================================================

// Schema for POST request body (cancel shift)
const CancelShiftSchema = z.object({
  reason: z.string().optional(),
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
    logger.error('Unexpected error in shift cancel API', { error });
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
 * POST handler for canceling a shift
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
    
    // 2. Verify user is an operator, admin, or staff
    if (
      session.user.role !== UserRole.OPERATOR && 
      session.user.role !== UserRole.ADMIN && 
      session.user.role !== UserRole.STAFF
    ) {
      return NextResponse.json(
        { success: false, error: 'Only operators, admins, and staff can cancel shifts' }, 
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
    const parseResult = CancelShiftSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid cancel data',
          validation: parseResult.error.errors 
        }, 
        { status: 400 }
      );
    }
    
    const { reason } = parseResult.data;
    
    // 6. Fetch shift with home and operator data
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
        },
        caregiver: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });
    
    // 7. Check if shift exists
    if (!shift) {
      return NextResponse.json(
        { success: false, error: 'Shift not found' }, 
        { status: 404 }
      );
    }
    
    // 8. Check if shift is in a cancellable state (OPEN, ASSIGNED, or IN_PROGRESS)
    if (
      shift.status !== ShiftStatus.OPEN &&
      shift.status !== ShiftStatus.ASSIGNED &&
      shift.status !== ShiftStatus.IN_PROGRESS
    ) {
      return NextResponse.json(
        { success: false, error: 'This shift cannot be canceled in its current state' }, 
        { status: 400 }
      );
    }
    
    // 9. If user is an operator, verify they operate this home
    if (session.user.role === UserRole.OPERATOR) {
      const operator = await prisma.operator.findUnique({
        where: { userId: session.user.id }
      });
      
      if (!operator || operator.id !== shift.home.operator.id) {
        return NextResponse.json(
          { success: false, error: 'You do not have permission to cancel shifts for this home' }, 
          { status: 403 }
        );
      }
    }
    
    // 10. If there's an associated calendar appointment, cancel it
    if (shift.appointmentId) {
      try {
        await cancelAppointment(
          shift.appointmentId,
          reason || 'Shift canceled by operator',
          session.user.id
        );
      } catch (error) {
        logger.error('Failed to cancel calendar appointment for shift', { error });
        // Continue with shift cancellation even if appointment cancellation fails
      }
    }
    
    // 11. Update the shift status to CANCELED
    const updatedShift = await prisma.caregiverShift.update({
      where: { id: shiftId },
      data: {
        status: ShiftStatus.CANCELED,
        notes: reason ? `${shift.notes || ''}\n\nCancellation reason: ${reason}` : shift.notes
      },
      include: {
        home: {
          select: {
            id: true,
            name: true,
            address: true,
            operator: {
              select: {
                id: true,
                userId: true,
                companyName: true
              }
            }
          }
        },
        caregiver: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImageUrl: true
              }
            }
          }
        }
      }
    });
    
    // 12. Send notifications
    try {
      // Notify operator
      await createInAppNotification({
        userId: shift.home.operator.userId,
        type: 'BOOKING',
        title: 'Shift Canceled',
        message: `A shift at ${shift.home.name} on ${shift.startTime.toLocaleDateString()} (${shift.startTime.toLocaleTimeString()} - ${shift.endTime.toLocaleTimeString()}) has been canceled`,
        data: {
          shiftId,
          homeId: shift.homeId,
          reason
        }
      });
      
      // Notify caregiver if assigned
      if (shift.caregiverId && shift.caregiver) {
        await createInAppNotification({
          userId: shift.caregiver.user.id,
          type: 'BOOKING',
          title: 'Shift Canceled',
          message: `Your shift at ${shift.home.name} on ${shift.startTime.toLocaleDateString()} (${shift.startTime.toLocaleTimeString()} - ${shift.endTime.toLocaleTimeString()}) has been canceled${reason ? `: ${reason}` : ''}`,
          data: {
            shiftId,
            homeId: shift.homeId,
            reason
          }
        });
      }
    } catch (notificationError) {
      // Log error but don't fail the request
      logger.error('Failed to send notification for shift cancellation', { notificationError });
    }
    
    // 13. Return success response
    return NextResponse.json({
      success: true,
      data: {
        id: updatedShift.id,
        homeId: updatedShift.homeId,
        home: {
          id: updatedShift.home.id,
          name: updatedShift.home.name,
          address: updatedShift.home.address,
          operatorId: updatedShift.home.operator.id,
          operatorName: updatedShift.home.operator.companyName
        },
        caregiverId: updatedShift.caregiverId,
        caregiver: updatedShift.caregiver ? {
          id: updatedShift.caregiver.id,
          userId: updatedShift.caregiver.user.id,
          name: `${updatedShift.caregiver.user.firstName} ${updatedShift.caregiver.user.lastName}`,
          profileImageUrl: updatedShift.caregiver.user.profileImageUrl
        } : null,
        startTime: updatedShift.startTime,
        endTime: updatedShift.endTime,
        status: updatedShift.status,
        hourlyRate: updatedShift.hourlyRate,
        notes: updatedShift.notes,
        appointmentId: updatedShift.appointmentId,
        createdAt: updatedShift.createdAt,
        updatedAt: updatedShift.updatedAt
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
