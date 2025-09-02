/**
 * Shifts API Route
 * 
 * Provides endpoints for managing caregiver shifts:
 * - GET: Fetch shifts with filtering
 * - POST: Create new shift postings (operator only)
 * 
 * @module api/shifts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { Prisma, ShiftStatus, UserRole, ShiftApplicationStatus } from '@prisma/client';
import { authOptions } from '@/lib/auth-db-simple';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// ========================================================================
// VALIDATION SCHEMAS
// ========================================================================

// Schema for GET query parameters
const GetShiftsQuerySchema = z.object({
  homeId: z.string().optional(),
  status: z.union([
    z.string(),
    z.array(z.string())
  ]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

// Schema for POST request body (create shift)
const CreateShiftSchema = z.object({
  homeId: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  hourlyRate: z.number().positive(),
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
    logger.error('Unexpected error in shifts API', { error });
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
 * GET handler for fetching shifts
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' }, 
        { status: 401 }
      );
    }
    
    // 2. Parse query parameters
    const url = new URL(request.url);
    const params: Record<string, any> = {};
    
    // Get all parameters including arrays
    for (const [key, value] of url.searchParams.entries()) {
      // Handle array parameters
      if (params[key]) {
        // If parameter already exists, convert to array if not already
        if (!Array.isArray(params[key])) {
          params[key] = [params[key]];
        }
        params[key].push(value);
      } else {
        params[key] = value;
      }
    }
    
    // Special handling for status which can be an array
    if (url.searchParams.getAll('status').length > 1) {
      params['status'] = url.searchParams.getAll('status');
    }
    
    // 3. Build filter criteria
    const filter: any = {};
    
    // Date range
    if (params['startDate'] && params['endDate']) {
      filter.startTime = {
        gte: new Date(params['startDate'])
      };
      filter.endTime = {
        lte: new Date(params['endDate'])
      };
    }
    
    // Status filter
    if (params['status']) {
      const statuses = Array.isArray(params['status']) 
        ? params['status'] 
        : [params['status']];
      
      // Validate that all statuses are valid ShiftStatus values
      const validStatuses = statuses.filter(s => 
        Object.values(ShiftStatus).includes(s as ShiftStatus)
      );
      
      if (validStatuses.length > 0) {
        filter.status = {
          in: validStatuses
        };
      }
    }
    
    // Home ID filter
    if (params['homeId']) {
      filter.homeId = params['homeId'];
    }
    
    // 4. Apply role-based access control
    const userRole = session.user.role as UserRole;
    
    if (userRole === UserRole.OPERATOR) {
      // Operators can only see shifts for homes they operate
      const operatorHomes = await prisma.operator.findUnique({
        where: { userId: session.user.id },
        select: { homes: { select: { id: true } } }
      });
      
      if (!operatorHomes || operatorHomes.homes.length === 0) {
        // Operator has no homes, return empty result
        return NextResponse.json({
          success: true,
          data: [],
          meta: {
            total: 0,
            limit: parseInt(params['limit'] || '50'),
            offset: parseInt(params['offset'] || '0')
          }
        });
      }
      
      // Filter by operator's homes if homeId not specified
      if (!filter.homeId) {
        filter.homeId = {
          in: operatorHomes.homes.map(home => home.id)
        };
      } else {
        // Verify the specified homeId belongs to this operator
        const homeIds = operatorHomes.homes.map(home => home.id);
        if (!homeIds.includes(filter.homeId)) {
          return NextResponse.json(
            { success: false, error: 'Access denied to specified home' }, 
            { status: 403 }
          );
        }
      }
    } else if (userRole === UserRole.CAREGIVER) {
      // Caregivers see OPEN shifts by default
      if (!filter.status) {
        filter.status = ShiftStatus.OPEN;
      }
      
      // If caregiver is looking for their assigned shifts
      const caregiverId = await prisma.caregiver.findUnique({
        where: { userId: session.user.id },
        select: { id: true }
      });
      
      if (!caregiverId) {
        // Caregiver record not found, return empty result
        return NextResponse.json({
          success: true,
          data: [],
          meta: {
            total: 0,
            limit: parseInt(params['limit'] || '50'),
            offset: parseInt(params['offset'] || '0')
          }
        });
      }
      
      // If status includes non-OPEN statuses, filter by caregiver ID
      if (filter.status && filter.status !== ShiftStatus.OPEN && 
          filter.status.in && filter.status.in.some((s: ShiftStatus) => s !== ShiftStatus.OPEN)) {
        filter.caregiverId = caregiverId.id;
      }

      // New: application based filtering (offers / applications tabs)
      if (params['applications'] === 'mine') {
        // Optional application-status filter
        let validAppStatus: ShiftApplicationStatus | undefined;
        if (params['appStatus'] && Object.values(ShiftApplicationStatus).includes(params['appStatus'] as ShiftApplicationStatus)) {
          validAppStatus = params['appStatus'] as ShiftApplicationStatus;
        }

        filter.applications = {
          some: {
            caregiverId: caregiverId.id,
            ...(validAppStatus ? { status: validAppStatus } : {})
          }
        };
      }
    }
    // ADMIN and STAFF can see all shifts without additional filtering
    
    // 5. Get shifts with pagination
    const [shifts, total] = await Promise.all([
      prisma.caregiverShift.findMany({
        where: filter,
        include: {
          home: {
            select: {
              id: true,
              name: true,
              address: true,
              operator: {
                select: {
                  id: true,
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
          },
          applications: {
            select: {
              id: true,
              caregiverId: true,
              status: true
            }
          }
        },
        orderBy: { startTime: 'asc' },
        skip: parseInt(params['offset'] || '0'),
        take: parseInt(params['limit'] || '50')
      }),
      prisma.caregiverShift.count({ where: filter })
    ]);
    
    // 6. Format the response
    const formattedShifts = shifts.map(shift => ({
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
        profileImageUrl: shift.caregiver.user.profileImageUrl
      } : null,
      startTime: shift.startTime,
      endTime: shift.endTime,
      status: shift.status,
      hourlyRate: shift.hourlyRate,
      notes: shift.notes,
      appointmentId: shift.appointmentId,
      applicationsCount: shift.applications.length,
      applications: shift.applications.map(app => ({
        id: app.id,
        status: app.status
      })),
      createdAt: shift.createdAt,
      updatedAt: shift.updatedAt
    }));
    
    // 7. Return formatted response
    return NextResponse.json({
      success: true,
      data: formattedShifts,
      meta: {
        total,
        limit: parseInt(params['limit'] || '50'),
        offset: parseInt(params['offset'] || '0')
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST handler for creating shifts
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' }, 
        { status: 401 }
      );
    }
    
    // 2. Check if user is an operator
    if (session.user.role !== UserRole.OPERATOR && 
        session.user.role !== UserRole.ADMIN && 
        session.user.role !== UserRole.STAFF) {
      return NextResponse.json(
        { success: false, error: 'Only operators can create shifts' }, 
        { status: 403 }
      );
    }
    
    // 3. Parse request body
    const body = await request.json();
    
    // 4. Validate request data
    const parseResult = CreateShiftSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid shift data',
          validation: parseResult.error.errors 
        }, 
        { status: 400 }
      );
    }
    
    const shiftData = parseResult.data;
    
    // 5. Verify home exists and user has access
    const home = await prisma.assistedLivingHome.findUnique({
      where: { id: shiftData.homeId },
      include: { operator: true }
    });
    
    if (!home) {
      return NextResponse.json(
        { success: false, error: 'Home not found' }, 
        { status: 404 }
      );
    }
    
    // If user is an operator, verify they operate this home
    if (session.user.role === UserRole.OPERATOR) {
      const operator = await prisma.operator.findUnique({
        where: { userId: session.user.id }
      });
      
      if (!operator || operator.id !== home.operator.id) {
        return NextResponse.json(
          { success: false, error: 'You do not have permission to create shifts for this home' }, 
          { status: 403 }
        );
      }
    }
    
    // 6. Create the shift
    const shift = await prisma.caregiverShift.create({
      data: {
        homeId: shiftData.homeId,
        startTime: new Date(shiftData.startTime),
        endTime: new Date(shiftData.endTime),
        status: ShiftStatus.OPEN,
        hourlyRate: new Prisma.Decimal(shiftData.hourlyRate),
        notes: shiftData.notes
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
                companyName: true
              }
            }
          }
        }
      }
    });
    
    // 7. Return success response
    return NextResponse.json(
      { 
        success: true, 
        data: {
          id: shift.id,
          homeId: shift.homeId,
          home: {
            id: shift.home.id,
            name: shift.home.name,
            address: shift.home.address,
            operatorId: shift.home.operator.id,
            operatorName: shift.home.operator.companyName
          },
          startTime: shift.startTime,
          endTime: shift.endTime,
          status: shift.status,
          hourlyRate: shift.hourlyRate,
          notes: shift.notes,
          createdAt: shift.createdAt,
          updatedAt: shift.updatedAt
        }
      }, 
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
