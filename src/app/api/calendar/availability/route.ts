/**
 * Calendar Availability API Route
 * 
 * Provides endpoints for checking availability and finding available time slots:
 * - GET: Check if a user is available for a specific time slot
 * - POST: Find available time slots within a date range
 * 
 * @module api/calendar/availability
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth-db-simple';
import { logger } from '@/lib/logger';
import { 
  checkUserAvailability,
  findAvailableSlots,
  CalendarError
} from '@/lib/services/calendar';
import { AppointmentType } from '@/lib/types/calendar';
import { UserRole } from '@prisma/client';

// ========================================================================
// VALIDATION SCHEMAS
// ========================================================================

/**
 * Get numeric hour (0-23) of a Date in a specific IANA timezone.
 */
function getHourInTimeZone(date: Date, timeZone: string): number {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      hour12: false,
    });
    const parts = dtf.formatToParts(date);
    const hourPart = parts.find((p) => p.type === 'hour');
    return hourPart ? Number(hourPart.value) : date.getUTCHours();
  } catch {
    // Invalid or unsupported timezone – fall back to UTC hour
    return date.getUTCHours();
  }
}

/**
 * Get numeric weekday (0 = Sun … 6 = Sat) of a Date in a specific IANA timezone.
 */
function getDayInTimeZone(date: Date, timeZone: string): number {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
    });
    const weekdayStr = dtf.format(date); // e.g., "Sun"
    const map: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    return map[weekdayStr] ?? date.getUTCDay();
  } catch {
    // Invalid or unsupported timezone – fall back to UTC day
    return date.getUTCDay();
  }
}

// Schema for GET query parameters (check availability)
const CheckAvailabilityQuerySchema = z.object({
  userId: z.string(),
  startTime: z.string(), // ISO date string
  endTime: z.string(), // ISO date string
  appointmentType: z.nativeEnum(AppointmentType),
  homeId: z.string().optional(),
});

// Schema for POST request body (find available slots)
const FindAvailableSlotsSchema = z.object({
  userId: z.string(),
  startDate: z.string(), // ISO date string
  endDate: z.string(), // ISO date string
  appointmentType: z.nativeEnum(AppointmentType),
  duration: z.number().min(15).max(480).default(60), // in minutes
  homeId: z.string().optional(),
  excludeWeekends: z.boolean().optional().default(false),
  businessHoursOnly: z.boolean().optional().default(true),
  timezone: z.string().optional(),
});

// ========================================================================
// HELPER FUNCTIONS
// ========================================================================

/**
 * Handles API errors and returns appropriate responses
 */
function handleApiError(error: unknown) {
  if (error instanceof CalendarError) {
    // Handle known calendar service errors
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        code: error.code 
      }, 
      { status: error.code.includes('NOT_FOUND') ? 404 : 500 }
    );
  } else if (error instanceof z.ZodError) {
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
    logger.error('Unexpected error in availability API', { error });
    return NextResponse.json(
      { 
        success: false, 
        error: 'An unexpected error occurred' 
      }, 
      { status: 500 }
    );
  }
}

/**
 * Checks if the user has permission to view another user's availability
 */
function canViewUserAvailability(
  requestingUserRole: UserRole,
  requestingUserId: string,
  targetUserId: string
): boolean {
  // Admin and staff can view anyone's availability
  if (requestingUserRole === UserRole.ADMIN || requestingUserRole === UserRole.STAFF) {
    return true;
  }
  
  // Users can view their own availability
  if (requestingUserId === targetUserId) {
    return true;
  }
  
  // Operators can view caregivers' and their own availability
  if (requestingUserRole === UserRole.OPERATOR) {
    // In a real app, we'd check if the operator manages the caregiver
    // For now, allow operators to view any caregiver's availability
    return true;
  }
  
  // Family members can view operators' and caregivers' availability
  if (requestingUserRole === UserRole.FAMILY) {
    // In a real app, we'd check if the family member has a relationship with the operator/caregiver
    // For now, allow family members to view any operator's or caregiver's availability
    return true;
  }
  
  // Default: deny access
  return false;
}

// ========================================================================
// API ROUTE HANDLERS
// ========================================================================

/**
 * GET handler for checking user availability
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
    
    // 2. Parse and validate query parameters
    const url = new URL(request.url);
    const rawParams: Record<string, string> = {};
    
    url.searchParams.forEach((value, key) => {
      rawParams[key] = value;
    });
    
    const parseResult = CheckAvailabilityQuerySchema.safeParse(rawParams);
    
    if (!parseResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid query parameters',
          validation: parseResult.error.errors 
        }, 
        { status: 400 }
      );
    }
    
    const query = parseResult.data;
    
    // 3. Check permission to view user availability
    const hasPermission = canViewUserAvailability(
      session.user.role as UserRole,
      session.user.id,
      query.userId
    );
    
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to view this user\'s availability' }, 
        { status: 403 }
      );
    }
    
    // 4. Check availability
    const availabilityCheck = await checkUserAvailability(
      query.userId,
      {
        startTime: query.startTime,
        endTime: query.endTime
      },
      query.appointmentType,
      query.homeId
    );
    
    // 5. Return formatted response
    return NextResponse.json({
      success: true,
      data: {
        isAvailable: availabilityCheck.isAvailable,
        conflicts: availabilityCheck.conflicts || [],
        userId: availabilityCheck.userId,
        requestedSlot: availabilityCheck.requestedSlot,
        appointmentType: availabilityCheck.appointmentType
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST handler for finding available slots
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
    
    // 2. Parse request body
    const body = await request.json();
    
    const parseResult = FindAvailableSlotsSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request data',
          validation: parseResult.error.errors 
        }, 
        { status: 400 }
      );
    }
    
    const { 
      userId, 
      startDate, 
      endDate, 
      appointmentType, 
      duration, 
      homeId,
      excludeWeekends,
      businessHoursOnly,
      timezone
    } = parseResult.data;

    // ------------------------------------------------------------------
    // Resolve effective timezone (default UTC)
    // ------------------------------------------------------------------
    const tz = timezone || 'UTC';
    
    // 3. Check permission to view user availability
    const hasPermission = canViewUserAvailability(
      session.user.role as UserRole,
      session.user.id,
      userId
    );
    
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to view this user\'s availability' }, 
        { status: 403 }
      );
    }
    
    // 4. Find available slots
    const availableSlots = await findAvailableSlots(
      userId,
      {
        start: new Date(startDate),
        end: new Date(endDate)
      },
      appointmentType,
      duration,
      homeId
    );
    
    // 5. Apply additional filters if needed
    let filteredSlots = availableSlots;
    
    if (excludeWeekends) {
      filteredSlots = filteredSlots.filter(slot => {
        const day = getDayInTimeZone(new Date(slot.startTime), tz);
        return day !== 0 && day !== 6; // 0 = Sunday, 6 = Saturday
      });
    }
    
    if (businessHoursOnly) {
      filteredSlots = filteredSlots.filter(slot => {
        const hour = getHourInTimeZone(new Date(slot.startTime), tz);
        return hour >= 9 && hour < 17; // 9 AM to 5 PM in requested TZ
      });
    }
    
    // 6. Group slots by day for better UI presentation
    const slotsByDay: Record<string, typeof filteredSlots> = {};
    
    filteredSlots.forEach(slot => {
      const date = new Date(slot.startTime);
      // Use slice to avoid potential undefined from split indexing
      const dayKey = date.toISOString().slice(0, 10); // YYYY-MM-DD
      
      if (!slotsByDay[dayKey]) {
        slotsByDay[dayKey] = [];
      }
      
      slotsByDay[dayKey].push(slot);
    });
    
    // 7. Return formatted response
    return NextResponse.json({
      success: true,
      data: {
        availableSlots: filteredSlots,
        slotsByDay,
        totalSlots: filteredSlots.length,
        requestedDuration: duration,
        timezone: tz
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * OPTIONS handler for CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
