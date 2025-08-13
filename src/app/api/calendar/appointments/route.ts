/**
 * Calendar Appointments API Route
 * 
 * Provides endpoints for managing calendar appointments:
 * - GET: Fetch appointments with filtering
 * - POST: Create new appointments
 * - PUT: Update existing appointments
 * - DELETE: Cancel appointments
 * 
 * @module api/calendar/appointments
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth-db-simple';
import { logger } from '@/lib/logger';
import { 
  getAppointments, 
  getAppointment, 
  createAppointment, 
  updateAppointment, 
  cancelAppointment,
  completeAppointment,
  CalendarError
} from '@/lib/services/calendar';
import { 
  AppointmentType, 
  AppointmentStatus,
  RecurrenceFrequency,
  DayOfWeek
} from '@/lib/types/calendar';
import type { Appointment } from '@/lib/types/calendar';
import { UserRole } from '@prisma/client';

// Rate limiting constants
const MAX_REQUESTS_PER_MINUTE = 60;
const MAX_APPOINTMENTS_PER_DAY = 50;

// ========================================================================
// VALIDATION SCHEMAS
// ========================================================================

// Schema for GET query parameters - more flexible for array parameters
const GetAppointmentsQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  // More flexible type validation - accept string or array of strings
  type: z.union([
    z.string(),
    z.array(z.string())
  ]).optional(),
  // More flexible status validation - accept string or array of strings
  status: z.union([
    z.string(),
    z.array(z.string())
  ]).optional(),
  homeId: z.string().optional(),
  residentId: z.string().optional(),
  participantId: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  search: z.string().optional(),
});

// Schema for location object
const LocationSchema = z.object({
  address: z.string().optional(),
  room: z.string().optional(),
  coordinates: z.object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }).optional(),
}).optional();

// Schema for reminder object
const ReminderSchema = z.object({
  minutesBefore: z.number().min(1),
  method: z.enum(['EMAIL', 'SMS', 'PUSH', 'IN_APP']),
}).array().optional();

// Schema for recurrence pattern
const RecurrencePatternSchema = z.object({
  frequency: z.nativeEnum(RecurrenceFrequency),
  daysOfWeek: z.nativeEnum(DayOfWeek).array().optional(),
  dayOfMonth: z.number().min(1).max(31).optional(),
  monthOfYear: z.number().min(1).max(12).optional(),
  endDate: z.string().optional(),
  occurrences: z.number().min(1).optional(),
  customRule: z.string().optional(),
  excludeDates: z.string().array().optional(),
}).optional();

// Schema for participant object
const ParticipantSchema = z.object({
  userId: z.string(),
  name: z.string().optional(),
  role: z.nativeEnum(UserRole).optional(),
  status: z.enum(['PENDING', 'ACCEPTED', 'DECLINED', 'TENTATIVE']).optional().default('PENDING'),
  notes: z.string().optional(),
});

// Schema for POST request body (create appointment)
const CreateAppointmentSchema = z.object({
  type: z.nativeEnum(AppointmentType),
  title: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  startTime: z.string(), // ISO date string
  endTime: z.string(), // ISO date string
  location: LocationSchema,
  homeId: z.string().optional(),
  residentId: z.string().optional(),
  participants: ParticipantSchema.array().optional().default([]),
  recurrence: RecurrencePatternSchema,
  reminders: ReminderSchema,
  notes: z.string().max(1000).optional(),
  customFields: z.record(z.any()).optional(),
});

// Schema for PUT request body (update appointment)
const UpdateAppointmentSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(AppointmentType).optional(),
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional(),
  startTime: z.string().optional(), // ISO date string
  endTime: z.string().optional(), // ISO date string
  location: LocationSchema,
  homeId: z.string().optional(),
  residentId: z.string().optional(),
  participants: ParticipantSchema.array().optional(),
  recurrence: RecurrencePatternSchema,
  reminders: ReminderSchema,
  notes: z.string().max(1000).optional(),
  customFields: z.record(z.any()).optional(),
  updateMode: z.enum(['THIS_ONLY', 'THIS_AND_FUTURE', 'ALL']).optional().default('THIS_ONLY'),
});

// Schema for DELETE request parameters
const CancelAppointmentSchema = z.object({
  id: z.string(),
  reason: z.string().max(500).optional(),
  cancelMode: z.enum(['THIS_ONLY', 'THIS_AND_FUTURE', 'ALL']).optional().default('THIS_ONLY'),
});

// Schema for completing an appointment
const CompleteAppointmentSchema = z.object({
  id: z.string(),
  notes: z.string().max(1000).optional(),
});

// Schema for booking request
const BookingRequestSchema = z.object({
  type: z.nativeEnum(AppointmentType),
  title: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  requestedStartTime: z.string(), // ISO date string
  requestedEndTime: z.string(), // ISO date string
  alternativeTimeSlots: z.array(
    z.object({
      startTime: z.string(),
      endTime: z.string(),
    })
  ).optional(),
  location: LocationSchema,
  homeId: z.string().optional(),
  residentId: z.string().optional(),
  participants: z.array(
    z.object({
      userId: z.string(),
      name: z.string().optional(),
      role: z.nativeEnum(UserRole).optional(),
      required: z.boolean().default(true),
    })
  ).optional(),
  recurrence: RecurrencePatternSchema,
  reminders: ReminderSchema,
  notes: z.string().max(1000).optional(),
  customFields: z.record(z.any()).optional(),
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
    const statusCode = getStatusCodeForError(error.code);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        code: error.code 
      }, 
      { status: statusCode }
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
    logger.error('Unexpected error in calendar API', { error });
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
 * Maps error codes to HTTP status codes
 */
function getStatusCodeForError(code: string): number {
  const codeMap: Record<string, number> = {
    'APPOINTMENT_NOT_FOUND': 404,
    'PERMISSION_DENIED': 403,
    'VALIDATION_ERROR': 400,
    'PARTICIPANTS_UNAVAILABLE': 409,
    'CREATE_APPOINTMENT_FAILED': 500,
    'UPDATE_APPOINTMENT_FAILED': 500,
    'CANCEL_APPOINTMENT_FAILED': 500,
    'GET_APPOINTMENT_FAILED': 500,
    'GET_APPOINTMENTS_FAILED': 500,
    'AVAILABILITY_CHECK_FAILED': 500,
    'FIND_SLOTS_FAILED': 500,
    'CREATE_RECURRING_FAILED': 500,
    'UPDATE_RECURRING_FAILED': 500,
  };
  
  return codeMap[code] || 500;
}

/**
 * Checks if user has permission to manage an appointment
 */
function canManageAppointment(
  appointment: any, 
  userId: string, 
  userRole: UserRole
): boolean {
  // Admins and staff can manage all appointments
  if (userRole === UserRole.ADMIN || userRole === UserRole.STAFF) {
    return true;
  }
  
  // Creators can manage their own appointments
  if (appointment.createdBy.id === userId) {
    return true;
  }
  
  // Operators can manage appointments at their facilities
  if (userRole === UserRole.OPERATOR && appointment.homeId) {
    // In a real app, we'd check if the operator manages this home
    // For now, we'll assume they can only manage their own appointments
    return appointment.createdBy.id === userId;
  }
  
  // Participants can't manage appointments unless they created them
  return false;
}

// ========================================================================
// API ROUTE HANDLERS
// ========================================================================

/**
 * GET handler for fetching appointments
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
    
    // 2. Parse query parameters - improved handling for arrays
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
    
    // Special handling for type and status which can be arrays
    if (url.searchParams.getAll('type').length > 1) {
      params['type'] = url.searchParams.getAll('type');
    }
    
    if (url.searchParams.getAll('status').length > 1) {
      params['status'] = url.searchParams.getAll('status');
    }
    
    // 3. Build filter criteria directly without strict validation
    const filter: any = {};
    
    // Date range
    if (params['startDate'] && params['endDate']) {
      filter.dateRange = {
        start: params['startDate'],
        end: params['endDate']
      };
    } else {
      // Default date range if not provided (current month + 30 days)
      const now = new Date();
      filter.dateRange = {
        start: now.toISOString(),
        end: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };
    }
    
    // Appointment types
    if (params['type']) {
      filter.appointmentTypes = Array.isArray(params['type']) 
        ? params['type'] 
        : [params['type']];
    }
    
    // Status
    if (params['status']) {
      filter.status = Array.isArray(params['status']) 
        ? params['status'] 
        : [params['status']];
    }
    
    // Home ID
    if (params['homeId']) {
      filter.homeIds = [params['homeId']];
    }
    
    // Resident ID
    if (params['residentId']) {
      filter.residentIds = [params['residentId']];
    }
    
    // Participant ID
    if (params['participantId']) {
      filter.participantIds = [params['participantId']];
    } else {
      // By default, show appointments where the current user is involved
      filter.participantIds = [session.user.id];
    }
    
    // Search
    if (params['search']) {
      filter.searchText = params['search'];
    }
    
    // 4. Get appointments from calendar service
    const appointments = await getAppointments(filter);
    
    // 5. Return formatted response
    return NextResponse.json({
      success: true,
      data: appointments,
      meta: {
        total: appointments.length,
        limit: parseInt(params['limit'] || '50'),
        offset: parseInt(params['offset'] || '0')
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST handler for creating appointments
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
    
    // Treat all POST requests as direct appointment creation
      const parseResult = CreateAppointmentSchema.safeParse(body);
      
      if (!parseResult.success) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid appointment data',
            validation: parseResult.error.errors 
          }, 
          { status: 400 }
        );
      }
      
      const appointmentData = parseResult.data;
      
      // ------------------------------------------------------------------
      // Sanitize location.coordinates so both latitude & longitude exist
      // ------------------------------------------------------------------
      let sanitizedLocation: Appointment['location'] = undefined;
      if (appointmentData.location) {
        const { address, room, coordinates } = appointmentData.location as any;
        if (
          coordinates &&
          typeof coordinates.latitude === 'number' &&
          typeof coordinates.longitude === 'number'
        ) {
          sanitizedLocation = {
            address,
            room,
            coordinates: {
              latitude: coordinates.latitude,
              longitude: coordinates.longitude,
            },
          };
        } else {
          sanitizedLocation = { address, room };
        }
      }

      // Construct appointment with explicit typing to satisfy calendar service
      const appointment: Omit<Appointment, 'id' | 'metadata'> = {
        type: appointmentData.type,
        status: AppointmentStatus.CONFIRMED,
        title: appointmentData.title,
        description: appointmentData.description,
        startTime: appointmentData.startTime,
        endTime: appointmentData.endTime,
        location: sanitizedLocation,
        homeId: appointmentData.homeId,
        residentId: appointmentData.residentId,
        createdBy: {
          id: session.user.id,
          name: `${session.user.firstName} ${session.user.lastName}`,
          role: session.user.role,
        },
        participants: (appointmentData.participants ?? []).map(p => ({
          userId: p.userId,
          name: p.name ?? 'Participant',
          role: p.role ?? UserRole.FAMILY,
          status: p.status ?? 'PENDING',
          notes: p.notes,
        })),
        recurrence: appointmentData.recurrence,
        // Ensure each reminder includes the required `sent` flag
        reminders: appointmentData.reminders?.map(r => ({
          minutesBefore: r.minutesBefore,
          method: r.method,
          sent: false
        })),
        notes: appointmentData.notes,
        customFields: appointmentData.customFields,
      };
      
      // Create appointment
      const createdAppointment = await createAppointment(appointment);
      
      return NextResponse.json(
        { success: true, data: createdAppointment },
        { status: 201 }
      );
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT handler for updating appointments
 */
export async function PUT(request: NextRequest) {
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
    
    // 3. Check if it's a completion request or an update
    if (body.notes && !body.title && !body.type) {
      // It's likely a completion request
      const parseResult = CompleteAppointmentSchema.safeParse(body);
      
      if (!parseResult.success) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid completion data',
            validation: parseResult.error.errors 
          }, 
          { status: 400 }
        );
      }
      
      const { id, notes } = parseResult.data;
      
      // Get the appointment to check permissions
      const appointment = await getAppointment(id);
      
      // Check if user has permission to complete this appointment
      if (!canManageAppointment(appointment, session.user.id, session.user.role as UserRole)) {
        return NextResponse.json(
          { success: false, error: 'You do not have permission to complete this appointment' }, 
          { status: 403 }
        );
      }
      
      // Complete the appointment
      const completedAppointment = await completeAppointment(
        id,
        notes || 'Marked as completed',
        session.user.id
      );
      
      return NextResponse.json({
        success: true,
        data: completedAppointment
      });
    } else {
      // It's an update request
      const parseResult = UpdateAppointmentSchema.safeParse(body);
      
      if (!parseResult.success) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid update data',
            validation: parseResult.error.errors 
          }, 
          { status: 400 }
        );
      }
      
      const { id, updateMode, ...updateData } = parseResult.data;
      
      // Get the appointment to check permissions
      const appointment = await getAppointment(id);
      
      // Check if user has permission to update this appointment
      if (!canManageAppointment(appointment, session.user.id, session.user.role as UserRole)) {
        return NextResponse.json(
          { success: false, error: 'You do not have permission to update this appointment' }, 
          { status: 403 }
        );
      }
      
      // If this is part of a recurring series and client requested more than THIS_ONLY,
      // return Not-Implemented for now.
      if (appointment.recurrence && updateMode !== 'THIS_ONLY') {
        return NextResponse.json(
          { success: false, error: 'Updating recurring series is not yet implemented' },
          { status: 501 }
        );
      }

      // ------------------------------------------------------------------
      // Sanitize and type-safe construction of the update payload
      // ------------------------------------------------------------------
      let updateLocation: Appointment['location'] = undefined;
      if (updateData.location) {
        const { address, room, coordinates } = updateData.location as any;
        if (
          coordinates &&
          typeof coordinates.latitude === 'number' &&
          typeof coordinates.longitude === 'number'
        ) {
          updateLocation = {
            address,
            room,
            coordinates: {
              latitude: coordinates.latitude,
              longitude: coordinates.longitude,
            },
          };
        } else {
          updateLocation = { address, room };
        }
      }

      const updatePayload: Partial<Appointment> = {
        type: updateData.type,
        title: updateData.title,
        description: updateData.description,
        startTime: updateData.startTime,
        endTime: updateData.endTime,
        location: updateLocation,
        homeId: updateData.homeId,
        residentId: updateData.residentId,
        participants: updateData.participants?.map(p => ({
          userId: p.userId,
          name: p.name ?? 'Participant',
          role: p.role ?? UserRole.FAMILY,
          status: p.status ?? 'PENDING',
          notes: p.notes,
        })),
        recurrence: updateData.recurrence,
        reminders: updateData.reminders?.map(r => ({
          minutesBefore: r.minutesBefore,
          method: r.method,
          sent: false,
        })),
        notes: updateData.notes,
        customFields: updateData.customFields,
      };

      // Perform normal single-instance update with sanitized payload
      const updatedAppointment = await updateAppointment(id, updatePayload);

      return NextResponse.json({ success: true, data: updatedAppointment });
    }
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE handler for cancelling appointments
 */
export async function DELETE(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' }, 
        { status: 401 }
      );
    }
    
    // 2. Parse request URL and body
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Appointment ID is required' }, 
        { status: 400 }
      );
    }
    
    // Try to parse body for additional parameters
    let reason = '';
    let cancelMode = 'THIS_ONLY';
    
    try {
      const body = await request.json();
      reason = body.reason || '';
      cancelMode = body.cancelMode || 'THIS_ONLY';
    } catch (e) {
      // No body or invalid JSON, use defaults
    }
    
    // 3. Get the appointment to check permissions
    const appointment = await getAppointment(id);
    
    // 4. Check if user has permission to cancel this appointment
    if (!canManageAppointment(appointment, session.user.id, session.user.role as UserRole)) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to cancel this appointment' }, 
        { status: 403 }
      );
    }
    
    // 5. Check if it's a recurring appointment that needs special handling
    if (appointment.recurrence && cancelMode !== 'THIS_ONLY') {
      // For recurring appointments, we need to handle the series
      // This would require additional implementation in the calendar service
      return NextResponse.json(
        { success: false, error: 'Cancelling recurring series is not yet implemented' }, 
        { status: 501 }
      );
    } else {
      // 6. Cancel the appointment
      const cancelledAppointment = await cancelAppointment(
        id,
        reason,
        session.user.id
      );
      
      return NextResponse.json({
        success: true,
        data: cancelledAppointment
      });
    }
  } catch (error) {
    return handleApiError(error);
  }
}
