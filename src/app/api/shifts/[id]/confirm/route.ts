/**
 * Shift Confirm API Route
 * 
 * Provides endpoint for operators to confirm a shift assignment:
 * - POST: Confirm a shift and assign it to a caregiver
 * 
 * @module api/shifts/[id]/confirm
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { ShiftStatus, UserRole, ShiftApplicationStatus } from '@prisma/client';
import { AppointmentType, AppointmentStatus } from '@/lib/types/calendar';
import { authOptions } from '@/lib/auth-db-simple';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { createInAppNotification } from '@/lib/services/notifications';
import { createAppointment } from '@/lib/services/calendar';

// ========================================================================
// VALIDATION SCHEMAS
// ========================================================================

// Schema for POST request body (confirm shift)
const ConfirmShiftSchema = z.object({
  caregiverId: z.string().optional(),
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
    logger.error('Unexpected error in shift confirm API', { error });
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
 * POST handler for confirming a shift assignment
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
        { success: false, error: 'Only operators, admins, and staff can confirm shifts' }, 
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
    const parseResult = ConfirmShiftSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid confirm data',
          validation: parseResult.error.errors 
        }, 
        { status: 400 }
      );
    }
    
    const { caregiverId: requestedCaregiverId, notes } = parseResult.data;
    
    // 6. Fetch shift with home and operator data
    const shift = await prisma.caregiverShift.findUnique({
      where: { id: shiftId },
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
        applications: {
          where: {
            status: ShiftApplicationStatus.ACCEPTED
          },
          include: {
            caregiver: {
              select: {
                id: true,
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true
                  }
                }
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
    
    // 8. Check if shift is in OPEN status
    if (shift.status !== ShiftStatus.OPEN) {
      return NextResponse.json(
        { success: false, error: 'Only open shifts can be confirmed' }, 
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
          { success: false, error: 'You do not have permission to confirm shifts for this home' }, 
          { status: 403 }
        );
      }
    }
    
    // 10. Determine which caregiver to assign
    let caregiverId: string;
    let caregiverUser: { id: string; firstName: string; lastName: string; email: string };
    
    if (requestedCaregiverId) {
      // Use the requested caregiver ID
      const application = shift.applications.find(app => app.caregiver.id === requestedCaregiverId);
      
      if (!application) {
        return NextResponse.json(
          { success: false, error: 'No accepted application found for the specified caregiver' }, 
          { status: 404 }
        );
      }
      
      caregiverId = requestedCaregiverId;
      caregiverUser = application.caregiver.user;
    } else {
      // Find the only accepted application
      if (shift.applications.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No accepted applications found for this shift' }, 
          { status: 404 }
        );
      }
      
      if (shift.applications.length > 1) {
        return NextResponse.json(
          { success: false, error: 'Multiple accepted applications found. Please specify a caregiver ID.' }, 
          { status: 400 }
        );
      }
      
      caregiverId = shift.applications[0]!.caregiver.id;
      caregiverUser = shift.applications[0]!.caregiver.user;
    }
    
    // 11. Create a calendar appointment
    // Normalize dates to avoid runtime errors if Prisma serializes them as strings
    const start = new Date(shift.startTime as any);
    const end = new Date(shift.endTime as any);

    const appointmentData = {
      type: AppointmentType.CAREGIVER_SHIFT,
      status: AppointmentStatus.CONFIRMED,
      title: `Caregiver Shift - ${shift.home.name}`,
      description: notes || `Caregiver shift at ${shift.home.name}`,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      location: shift.home.address ? {
        address: `${shift.home.address.street}, ${shift.home.address.city}, ${shift.home.address.state} ${shift.home.address.zipCode}`,
        ...(shift.home.address.latitude && shift.home.address.longitude ? {
          coordinates: {
            latitude: shift.home.address.latitude,
            longitude: shift.home.address.longitude
          }
        } : {})
      } : undefined,
      homeId: shift.homeId,
      createdBy: {
        id: session.user.id,
        name: `${session.user.firstName} ${session.user.lastName}`,
        role: session.user.role,
      },
      participants: [
        {
          userId: caregiverUser.id,
          name: `${caregiverUser.firstName} ${caregiverUser.lastName}`,
          role: UserRole.CAREGIVER,
          status: 'ACCEPTED' as const,
        }
      ],
      notes: notes
    };
    
    let appointment;
    try {
      appointment = await createAppointment(appointmentData);
      // Verify appointment object integrity
      if (!appointment || !appointment.id) {
        logger.error('Calendar service did not return a valid appointment', { appointment });
        return NextResponse.json(
          { success: false, error: 'Failed to create calendar appointment' },
          { status: 500 }
        );
      }
    } catch (error) {
      logger.error('Failed to create calendar appointment for shift', { error });
      return NextResponse.json(
        { success: false, error: 'Failed to create calendar appointment' }, 
        { status: 500 }
      );
    }
    
    // 12. Update the shift with caregiver and status
    const updatedShift = await prisma.caregiverShift.update({
      where: { id: shiftId },
      data: {
        caregiverId,
        status: ShiftStatus.ASSIGNED,
        appointmentId: appointment.id,
        notes: notes || shift.notes
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
    
    // 13. Send notification to caregiver
    try {
      const caregiverUserId = caregiverUser.id;
      const operatorName = shift.home.operator.companyName;
      const shiftDate = start.toLocaleDateString();
      const shiftTime = `${start.toLocaleTimeString()} - ${end.toLocaleTimeString()}`;
      
      await createInAppNotification({
        userId: caregiverUserId,
        type: 'BOOKING',
        title: 'Shift Confirmed',
        message: `${operatorName} has confirmed your shift at ${shift.home.name} on ${shiftDate} (${shiftTime})`,
        data: {
          shiftId,
          homeId: shift.homeId,
          appointmentId: appointment.id
        }
      });
      
      // Also notify operator for confirmation
      await createInAppNotification({
        userId: shift.home.operator.userId,
        type: 'BOOKING',
        title: 'Shift Assignment Confirmed',
        message: `You have confirmed ${caregiverUser.firstName} ${caregiverUser.lastName} for a shift at ${shift.home.name} on ${shiftDate} (${shiftTime})`,
        data: {
          shiftId,
          homeId: shift.homeId,
          appointmentId: appointment.id,
          caregiverId
        }
      });
    } catch (notificationError) {
      // Log error but don't fail the request
      logger.error('Failed to send notification for shift confirmation', { notificationError });
    }
    
    // 14. Return success response
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
