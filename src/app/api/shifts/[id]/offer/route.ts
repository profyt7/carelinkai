/**
 * Shift Offer API Route
 * 
 * Provides endpoint for operators to offer a shift to a specific caregiver:
 * - POST: Offer a shift to a caregiver
 * 
 * @module api/shifts/[id]/offer
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

// Schema for POST request body (offer shift)
const OfferShiftSchema = z.object({
  caregiverId: z.string(),
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
    logger.error('Unexpected error in shift offer API', { error });
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
 * POST handler for offering a shift to a caregiver
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
        { success: false, error: 'Only operators, admins, and staff can offer shifts' }, 
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
    const parseResult = OfferShiftSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid offer data',
          validation: parseResult.error.errors 
        }, 
        { status: 400 }
      );
    }
    
    const { caregiverId, notes } = parseResult.data;
    
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
        { success: false, error: 'Only open shifts can be offered' }, 
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
          { success: false, error: 'You do not have permission to offer shifts for this home' }, 
          { status: 403 }
        );
      }
    }
    
    // 10. Verify caregiver exists
    const caregiver = await prisma.caregiver.findUnique({
      where: { id: caregiverId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });
    
    if (!caregiver) {
      return NextResponse.json(
        { success: false, error: 'Caregiver not found' }, 
        { status: 404 }
      );
    }
    
    // 11. Find existing application or create a new one
    const now = new Date();
    
    const application = await prisma.shiftApplication.upsert({
      where: {
        shiftId_caregiverId: {
          shiftId,
          caregiverId
        }
      },
      update: {
        status: ShiftApplicationStatus.OFFERED,
        notes: notes || undefined,
        offeredAt: now
      },
      create: {
        shiftId,
        caregiverId,
        status: ShiftApplicationStatus.OFFERED,
        notes: notes || undefined,
        offeredAt: now
      },
      include: {
        caregiver: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        },
        shift: {
          select: {
            startTime: true,
            endTime: true,
            hourlyRate: true
          }
        }
      }
    });
    
    // 12. Send notification to caregiver
    try {
      const caregiverUserId = caregiver.user.id;
      const operatorName = shift.home.operator.companyName;
      const shiftDate = application.shift.startTime.toLocaleDateString();
      const shiftTime = `${application.shift.startTime.toLocaleTimeString()} - ${application.shift.endTime.toLocaleTimeString()}`;
      const hourlyRate = application.shift.hourlyRate.toString();
      
      await createInAppNotification({
        userId: caregiverUserId,
        type: 'BOOKING',
        title: 'Shift Offer',
        message: `${operatorName} has offered you a shift at ${shift.home.name} on ${shiftDate} (${shiftTime}) at $${hourlyRate}/hr`,
        data: {
          shiftId,
          applicationId: application.id,
          homeId: shift.homeId
        }
      });
    } catch (notificationError) {
      // Log error but don't fail the request
      logger.error('Failed to send notification for shift offer', { notificationError });
    }
    
    // 13. Return success response
    return NextResponse.json({
      success: true,
      data: {
        id: application.id,
        shiftId: application.shiftId,
        caregiverId: application.caregiverId,
        status: application.status,
        notes: application.notes,
        createdAt: application.createdAt,
        updatedAt: application.updatedAt,
        offeredAt: application.offeredAt,
        caregiver: {
          id: application.caregiver.id,
          name: `${application.caregiver.user.firstName} ${application.caregiver.user.lastName}`,
          userId: application.caregiver.user.id
        }
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
