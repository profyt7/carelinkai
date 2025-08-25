/**
 * Shift Complete API Route
 * 
 * Provides endpoint for operators to mark a shift as completed:
 * - POST: Mark a shift as completed and create a payment record
 * 
 * @module api/shifts/[id]/complete
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { Prisma, ShiftStatus, UserRole, PaymentType, PaymentStatus } from '@prisma/client';
import { authOptions } from '@/lib/auth-db-simple';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { createInAppNotification } from '@/lib/services/notifications';
import { completeAppointment } from '@/lib/services/calendar';

// ========================================================================
// VALIDATION SCHEMAS
// ========================================================================

// Schema for POST request body (complete shift)
const CompleteShiftSchema = z.object({
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
    logger.error('Unexpected error in shift complete API', { error });
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
 * POST handler for marking a shift as completed
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
        { success: false, error: 'Only operators, admins, and staff can complete shifts' }, 
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
    const parseResult = CompleteShiftSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid complete data',
          validation: parseResult.error.errors 
        }, 
        { status: 400 }
      );
    }
    
    const { notes } = parseResult.data;
    
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
    
    // 8. Check if shift has an assigned caregiver
    if (!shift.caregiverId || !shift.caregiver) {
      return NextResponse.json(
        { success: false, error: 'This shift does not have an assigned caregiver' }, 
        { status: 400 }
      );
    }
    
    // 9. Check if shift is in a completable state (ASSIGNED or IN_PROGRESS)
    if (
      shift.status !== ShiftStatus.ASSIGNED &&
      shift.status !== ShiftStatus.IN_PROGRESS
    ) {
      return NextResponse.json(
        { success: false, error: 'This shift cannot be completed in its current state' }, 
        { status: 400 }
      );
    }
    
    // 10. If user is an operator, verify they operate this home
    if (session.user.role === UserRole.OPERATOR) {
      const operator = await prisma.operator.findUnique({
        where: { userId: session.user.id }
      });
      
      if (!operator || operator.id !== shift.home.operator.id) {
        return NextResponse.json(
          { success: false, error: 'You do not have permission to complete shifts for this home' }, 
          { status: 403 }
        );
      }
    }
    
    // 11. If there's an associated calendar appointment, mark it as completed
    if (shift.appointmentId) {
      try {
        await completeAppointment(
          shift.appointmentId,
          notes || '',
          session.user.id
        );
      } catch (error) {
        logger.error('Failed to complete calendar appointment for shift', { error });
        // Continue with shift completion even if appointment completion fails
      }
    }
    
    // 12. Calculate hours worked and payment amount
    const startTime = shift.startTime.getTime();
    const endTime = shift.endTime.getTime();
    const hoursWorked = Number(((endTime - startTime) / 3600000).toFixed(2));
    const paymentAmount = shift.hourlyRate.mul(hoursWorked);
    
    // 13. Create payment record (payout stub)
    const payment = await prisma.payment.create({
      data: {
        userId: shift.caregiver.user.id,
        amount: paymentAmount,
        status: PaymentStatus.PENDING,
        type: PaymentType.CAREGIVER_PAYMENT,
        description: `Payment for shift at ${shift.home.name} on ${shift.startTime.toLocaleDateString()} (${hoursWorked} hours)`
      }
    });
    
    // 14. Update the shift status to COMPLETED
    const updatedShift = await prisma.caregiverShift.update({
      where: { id: shiftId },
      data: {
        status: ShiftStatus.COMPLETED,
        notes: notes ? `${shift.notes || ''}\n\nCompletion notes: ${notes}` : shift.notes
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
    
    // 15. Send notifications
    try {
      // Notify operator
      await createInAppNotification({
        userId: shift.home.operator.userId,
        type: 'BOOKING',
        title: 'Shift Completed',
        message: `A shift at ${shift.home.name} on ${shift.startTime.toLocaleDateString()} (${shift.startTime.toLocaleTimeString()} - ${shift.endTime.toLocaleTimeString()}) has been marked as completed`,
        data: {
          shiftId,
          homeId: shift.homeId,
          paymentId: payment.id
        }
      });
      
      // Notify caregiver
      await createInAppNotification({
        userId: shift.caregiver.user.id,
        type: 'PAYMENT',
        title: 'Shift Completed - Payment Pending',
        message: `Your shift at ${shift.home.name} on ${shift.startTime.toLocaleDateString()} has been completed. A payment of $${paymentAmount.toString()} is pending.`,
        data: {
          shiftId,
          homeId: shift.homeId,
          paymentId: payment.id,
          amount: paymentAmount.toString()
        }
      });
    } catch (notificationError) {
      // Log error but don't fail the request
      logger.error('Failed to send notification for shift completion', { notificationError });
    }
    
    // 16. Return success response
    return NextResponse.json({
      success: true,
      data: {
        shift: {
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
        },
        payment: {
          id: payment.id,
          amount: payment.amount,
          status: payment.status,
          type: payment.type,
          description: payment.description,
          createdAt: payment.createdAt
        }
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
