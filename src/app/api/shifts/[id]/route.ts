/**
 * Shift Details API Route
 * 
 * Provides endpoint for fetching a specific shift by ID:
 * - GET: Fetch shift details with related data
 * 
 * @module api/shifts/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ShiftStatus, UserRole } from '@prisma/client';
import { authOptions } from '@/lib/auth-db-simple';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// ========================================================================
// HELPER FUNCTIONS
// ========================================================================

/**
 * Handles API errors and returns appropriate responses
 */
function handleApiError(error: unknown) {
  logger.error('Unexpected error in shift details API', { error });
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
 * GET handler for fetching a shift by ID
 */
export async function GET(
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
    
    // 2. Get shift ID from params
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Shift ID is required' }, 
        { status: 400 }
      );
    }
    
    // 3. Fetch shift with related data
    const shift = await prisma.caregiverShift.findUnique({
      where: { id },
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
                email: true,
                profileImageUrl: true,
                phone: true
              }
            }
          }
        },
        applications: {
          include: {
            caregiver: {
              select: {
                id: true,
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    profileImageUrl: true,
                    phone: true
                  }
                },
                ratingAverage: true
              }
            }
          }
        }
      }
    });
    
    // 4. Check if shift exists
    if (!shift) {
      return NextResponse.json(
        { success: false, error: 'Shift not found' }, 
        { status: 404 }
      );
    }
    
    // 5. Apply role-based access control
    const userRole = session.user.role as UserRole;
    
    if (userRole === UserRole.OPERATOR) {
      // Operators can only view shifts for homes they operate
      const operator = await prisma.operator.findUnique({
        where: { userId: session.user.id },
        select: { id: true }
      });
      
      if (!operator || operator.id !== shift.home.operator.id) {
        return NextResponse.json(
          { success: false, error: 'Access denied to this shift' }, 
          { status: 403 }
        );
      }
    } else if (userRole === UserRole.CAREGIVER) {
      // Caregivers can view OPEN shifts or shifts assigned to them or shifts they've applied for
      const caregiver = await prisma.caregiver.findUnique({
        where: { userId: session.user.id },
        select: { id: true }
      });
      
      if (!caregiver) {
        return NextResponse.json(
          { success: false, error: 'Caregiver record not found' }, 
          { status: 403 }
        );
      }
      
      const isOpen = shift.status === ShiftStatus.OPEN;
      const isAssigned = shift.caregiverId === caregiver.id;
      const hasApplied = shift.applications.some(app => app.caregiverId === caregiver.id);
      
      if (!isOpen && !isAssigned && !hasApplied) {
        return NextResponse.json(
          { success: false, error: 'Access denied to this shift' }, 
          { status: 403 }
        );
      }
    }
    // ADMIN and STAFF can view any shift without additional checks
    
    // 6. Format the response
    const formattedShift = {
      id: shift.id,
      homeId: shift.homeId,
      home: {
        id: shift.home.id,
        name: shift.home.name,
        address: shift.home.address,
        operatorId: shift.home.operator.id,
        operatorName: shift.home.operator.companyName
      },
      caregiverId: shift.caregiverId,
      caregiver: shift.caregiver ? {
        id: shift.caregiver.id,
        userId: shift.caregiver.user.id,
        name: `${shift.caregiver.user.firstName} ${shift.caregiver.user.lastName}`,
        email: shift.caregiver.user.email,
        phone: shift.caregiver.user.phone,
        profileImageUrl: shift.caregiver.user.profileImageUrl
      } : null,
      startTime: shift.startTime,
      endTime: shift.endTime,
      status: shift.status,
      hourlyRate: shift.hourlyRate,
      notes: shift.notes,
      appointmentId: shift.appointmentId,
      applications: shift.applications.map(app => ({
        id: app.id,
        status: app.status,
        notes: app.notes,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        offeredAt: app.offeredAt,
        acceptedAt: app.acceptedAt,
        rejectedAt: app.rejectedAt,
        withdrawnAt: app.withdrawnAt,
        caregiver: {
          id: app.caregiver.id,
          userId: app.caregiver.user.id,
          name: `${app.caregiver.user.firstName} ${app.caregiver.user.lastName}`,
          email: app.caregiver.user.email,
          phone: app.caregiver.user.phone,
          profileImageUrl: app.caregiver.user.profileImageUrl,
          ratingAverage: app.caregiver.ratingAverage
        }
      })),
      createdAt: shift.createdAt,
      updatedAt: shift.updatedAt
    };
    
    // 7. Return formatted response
    return NextResponse.json({
      success: true,
      data: formattedShift
    });
  } catch (error) {
    return handleApiError(error);
  }
}
