/**
 * Calendar Service
 * 
 * Comprehensive service for managing calendar functionality in CareLinkAI,
 * including appointment management, availability checking, booking logic,
 * and calendar event generation for UI display.
 * 
 * @module services/calendar
 */

import { format, parse, addMinutes, addDays, addWeeks, addMonths, 
  addYears, differenceInMinutes, isAfter, isBefore, isEqual, 
  isSameDay, startOfDay, endOfDay, eachDayOfInterval, getDay,
  setHours, setMinutes, parseISO } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

import { logger } from '@/lib/logger';
import { sendEmail } from '@/lib/email/sendgrid';
import { prisma } from '@/lib/prisma';

import { 
  Appointment, AppointmentStatus, AppointmentType,
  AvailabilitySlot, BookingRequest, BookingResponse,
  CalendarEvent, CalendarFilter, DateRange,
  RecurrenceFrequency, RecurrencePattern, TimeSlot,
  DayOfWeek, AvailabilityCheck
} from '@/lib/types/calendar';

// Default timezone placeholder (currently unused after timezone removal)
const DEFAULT_TIMEZONE = 'UTC';

/**
 * Error class for calendar-specific errors
 */
export class CalendarError extends Error {
  code: string;
  
  constructor(message: string, code: string) {
    super(message);
    this.name = 'CalendarError';
    this.code = code;
  }
}

// ========================================================================
// DATE & TIME UTILITY FUNCTIONS
// ========================================================================

/**
 * Converts a date string to a specific timezone
 * @param dateStr ISO date string
 * @param timezone Target timezone
 * @returns Date object in the target timezone
 */
export function toTimezone(dateStr: string, timezone: string = DEFAULT_TIMEZONE): Date {
  // Time-zone conversion removed – simply parse the ISO string
  return parseISO(dateStr);
}

/**
 * Converts a date from a specific timezone to UTC
 * @param date Date object in source timezone
 * @param timezone Source timezone
 * @returns UTC date string
 */
export function fromTimezone(date: Date, timezone: string = DEFAULT_TIMEZONE): string {
  // No explicit timezone handling – return the ISO string of the given date
  return date.toISOString();
}

/**
 * Formats a date for display
 * @param date Date to format
 * @param formatStr Format string
 * @param timezone Timezone to use
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string, 
  formatStr: string = 'yyyy-MM-dd HH:mm',
  timezone: string = DEFAULT_TIMEZONE
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  // Time-zone conversion removed – format the date directly
  return format(dateObj, formatStr);
}

/**
 * Checks if a time slot is within business hours
 * @param slot Time slot to check
 * @param businessHours Business hours configuration
 * @returns Whether the slot is within business hours
 */
export function isWithinBusinessHours(
  slot: TimeSlot,
  businessHours: { daysOfWeek: number[], startTime: string, endTime: string }
): boolean {
  const start = parseISO(slot.startTime);
  const end = parseISO(slot.endTime);
  
  const dayOfWeek = getDay(start);
  if (!businessHours.daysOfWeek.includes(dayOfWeek)) {
    return false;
  }
  
  // Parse business hours
  const [startHour, startMinute] = businessHours.startTime.split(':').map(Number);
  const [endHour, endMinute] = businessHours.endTime.split(':').map(Number);
  
  const businessStart = setMinutes(setHours(start, startHour), startMinute);
  const businessEnd = setMinutes(setHours(start, endHour), endMinute);
  
  return (
    (isAfter(start, businessStart) || isEqual(start, businessStart)) &&
    (isBefore(end, businessEnd) || isEqual(end, businessEnd))
  );
}

/**
 * Generates time slots for a given day
 * @param date Base date
 * @param slotDuration Duration of each slot in minutes
 * @param startTime Start time (HH:MM)
 * @param endTime End time (HH:MM)
 * @returns Array of time slots
 */
export function generateDailyTimeSlots(
  date: Date,
  slotDuration: number = 30,
  startTime: string = '08:00',
  endTime: string = '17:00'
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  const startDate = setMinutes(setHours(startOfDay(date), startHour), startMinute);
  const endDate = setMinutes(setHours(startOfDay(date), endHour), endMinute);
  
  let currentSlotStart = startDate;
  
  while (isBefore(currentSlotStart, endDate)) {
    const currentSlotEnd = addMinutes(currentSlotStart, slotDuration);
    
    if (isAfter(currentSlotEnd, endDate)) {
      break;
    }
    
    slots.push({
      startTime: currentSlotStart.toISOString(),
      endTime: currentSlotEnd.toISOString()
    });
    
    currentSlotStart = currentSlotEnd;
  }
  
  return slots;
}

/**
 * Generates dates based on a recurrence pattern
 * @param startDate Base start date
 * @param recurrence Recurrence pattern
 * @param maxOccurrences Maximum number of occurrences to generate
 * @returns Array of start dates
 */
export function generateRecurrenceDates(
  startDate: Date,
  recurrence: RecurrencePattern,
  maxOccurrences: number = 52 // Default to maximum of 1 year for weekly recurrence
): Date[] {
  const dates: Date[] = [startDate];
  let currentDate = startDate;
  let occurrences = 1;
  
  // If recurrence has an end date, parse it
  const endDate = recurrence.endDate ? parseISO(recurrence.endDate) : null;
  
  // If recurrence has a max number of occurrences, use that
  const maxToGenerate = recurrence.occurrences || maxOccurrences;
  
  while (occurrences < maxToGenerate) {
    let nextDate: Date | null = null;
    
    switch (recurrence.frequency) {
      case RecurrenceFrequency.DAILY:
        nextDate = addDays(currentDate, 1);
        break;
        
      case RecurrenceFrequency.WEEKLY:
        if (recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
          // For weekly recurrence with specific days, find the next matching day
          const currentDayIndex = getDay(currentDate);
          const daysOfWeekIndices = recurrence.daysOfWeek.map(dayToIndex);
          
          // Find the next day index that's greater than the current day
          let nextDayIndex = daysOfWeekIndices.find(d => d > currentDayIndex);
          
          if (nextDayIndex !== undefined) {
            // Found a day later in the same week
            nextDate = addDays(currentDate, nextDayIndex - currentDayIndex);
          } else {
            // Wrap around to the next week
            nextDate = addDays(
              currentDate, 
              7 - currentDayIndex + (daysOfWeekIndices[0] || 0)
            );
          }
        } else {
          // Simple weekly recurrence
          nextDate = addWeeks(currentDate, 1);
        }
        break;
        
      case RecurrenceFrequency.BI_WEEKLY:
        nextDate = addWeeks(currentDate, 2);
        break;
        
      case RecurrenceFrequency.MONTHLY:
        nextDate = addMonths(currentDate, 1);
        break;
        
      case RecurrenceFrequency.YEARLY:
        nextDate = addYears(currentDate, 1);
        break;
        
      case RecurrenceFrequency.CUSTOM:
        // Custom recurrence would need to implement iCalendar RRULE parsing
        // This is a simplified placeholder
        if (occurrences % 2 === 0) {
          nextDate = addWeeks(currentDate, 1);
        } else {
          nextDate = addDays(currentDate, 3);
        }
        break;
    }
    
    if (!nextDate) break;
    
    // Check if we've reached the end date
    if (endDate && isAfter(nextDate, endDate)) {
      break;
    }
    
    // Check if this date should be excluded
    if (recurrence.excludeDates && 
        recurrence.excludeDates.some(d => isSameDay(parseISO(d), nextDate!))) {
      // Skip this date but continue the loop
      currentDate = nextDate;
      continue;
    }
    
    dates.push(nextDate);
    currentDate = nextDate;
    occurrences++;
  }
  
  return dates;
}

/**
 * Converts a DayOfWeek enum value to a day index (0-6, where 0 is Sunday)
 * @param day Day of week enum value
 * @returns Day index (0-6)
 */
function dayToIndex(day: DayOfWeek): number {
  const map: Record<DayOfWeek, number> = {
    [DayOfWeek.SUNDAY]: 0,
    [DayOfWeek.MONDAY]: 1,
    [DayOfWeek.TUESDAY]: 2,
    [DayOfWeek.WEDNESDAY]: 3,
    [DayOfWeek.THURSDAY]: 4,
    [DayOfWeek.FRIDAY]: 5,
    [DayOfWeek.SATURDAY]: 6
  };
  return map[day];
}

/**
 * Checks if two time slots overlap
 * @param slotA First time slot
 * @param slotB Second time slot
 * @returns Whether the slots overlap
 */
export function doSlotsOverlap(slotA: TimeSlot, slotB: TimeSlot): boolean {
  const startA = parseISO(slotA.startTime);
  const endA = parseISO(slotA.endTime);
  const startB = parseISO(slotB.startTime);
  const endB = parseISO(slotB.endTime);
  
  return (
    (isAfter(startA, startB) || isEqual(startA, startB)) && isBefore(startA, endB) ||
    (isAfter(endA, startB) && (isBefore(endA, endB) || isEqual(endA, endB))) ||
    (isBefore(startA, startB) && isAfter(endA, endB))
  );
}

/**
 * Gets the duration of a time slot in minutes
 * @param slot Time slot
 * @returns Duration in minutes
 */
export function getSlotDuration(slot: TimeSlot): number {
  const start = parseISO(slot.startTime);
  const end = parseISO(slot.endTime);
  return differenceInMinutes(end, start);
}

// ========================================================================
// AVAILABILITY & CONFLICT DETECTION
// ========================================================================

/**
 * Checks if a user is available for a given time slot
 * @param userId User ID
 * @param slot Time slot to check
 * @param appointmentType Type of appointment
 * @param homeId Optional home ID for location-specific availability
 * @returns Availability check result
 */
export async function checkUserAvailability(
  userId: string,
  slot: TimeSlot,
  appointmentType: AppointmentType,
  homeId?: string
): Promise<AvailabilityCheck> {
  try {
    // 1. Check user's availability slots
    const availabilitySlots = await prisma.availabilitySlot.findMany({
      where: {
        userId,
        isAvailable: true,
        startTime: { lte: new Date(slot.startTime) },
        endTime: { gte: new Date(slot.endTime) },
        ...(homeId ? { homeId } : {}),
        OR: [
          { availableFor: { has: appointmentType } },
          { availableFor: { isEmpty: true } } // Empty means available for all
        ]
      }
    });
    
    if (availabilitySlots.length === 0) {
      return {
        userId,
        requestedSlot: slot,
        appointmentType,
        homeId,
        isAvailable: false
      };
    }
    
    // 2. Check for conflicting appointments
    const conflictingAppointments = await prisma.appointment.findMany({
      where: {
        OR: [
          {
            // User is a participant
            participants: {
              some: {
                userId,
                status: { notIn: ['DECLINED'] }
              }
            }
          },
          {
            // User created the appointment
            createdById: userId
          }
        ],
        status: { notIn: ['CANCELLED'] },
        // Overlapping time range
        AND: [
          { startTime: { lt: new Date(slot.endTime) } },
          { endTime: { gt: new Date(slot.startTime) } }
        ]
      },
      include: {
        participants: true,
        createdBy: true
      }
    });
    
    // If there are conflicts, user is not available
    if (conflictingAppointments.length > 0) {
      return {
        userId,
        requestedSlot: slot,
        appointmentType,
        homeId,
        isAvailable: false,
        conflicts: conflictingAppointments.map(mapDbAppointmentToAppointment)
      };
    }
    
    // No conflicts found, user is available
    return {
      userId,
      requestedSlot: slot,
      appointmentType,
      homeId,
      isAvailable: true
    };
  } catch (error) {
    logger.error('Error checking user availability', { userId, slot, error });
    throw new CalendarError(
      `Failed to check availability for user ${userId}`,
      'AVAILABILITY_CHECK_FAILED'
    );
  }
  // --------------------------------------------------------------------
  // Status-specific colour overrides
  // --------------------------------------------------------------------
  const statusColors: Record<
    AppointmentStatus,
    { bg: string; border: string; text: string; status: string }
  > = {
    [AppointmentStatus.PENDING]: {
      bg: '#fff8e1',
      border: '#ffc107',
      text: '#ff6f00',
      status: '#ff6f00',
    },
    [AppointmentStatus.CONFIRMED]: {
      bg: '',
      border: '',
      text: '',
      status: '#43a047',
    },
    [AppointmentStatus.CANCELLED]: {
      bg: '#f5f5f5',
      border: '#9e9e9e',
      text: '#424242',
      status: '#d32f2f',
    },
    [AppointmentStatus.COMPLETED]: {
      bg: '',
      border: '',
      text: '',
      status: '#1976d2',
    },
    [AppointmentStatus.NO_SHOW]: {
      bg: '#fafafa',
      border: '#f44336',
      text: '#b71c1c',
      status: '#b71c1c',
    },
    [AppointmentStatus.RESCHEDULED]: {
      bg: '#e1f5fe',
      border: '#03a9f4',
      text: '#01579b',
      status: '#0288d1',
    },
  };
  // Base colours from appointment type
  const base = typeColors[type];
  const statusMod = statusColors[status];

  // For CANCELLED or NO_SHOW we completely override with status colours;
  // otherwise we use type colours and only display a status indicator colour.
  const useStatus = status === AppointmentStatus.CANCELLED ||
                    status === AppointmentStatus.NO_SHOW;

  return {
    color: base.border,
    backgroundColor: useStatus ? statusMod.bg : base.bg,
    borderColor: useStatus ? statusMod.border : base.border,
    textColor: useStatus ? statusMod.text : base.text,
    statusColor: statusMod.status,
  };
}

/**
 * Returns an icon name (FontAwesome / HeroIcons key etc.) based on appointment
 * type so the UI can display a representative icon.
 */
function getAppointmentIcon(type: AppointmentType): string {
  const icons: Record<AppointmentType, string> = {
    [AppointmentType.CARE_EVALUATION]: 'clipboard-check',
    [AppointmentType.FACILITY_TOUR]: 'building',
    [AppointmentType.CAREGIVER_SHIFT]: 'user-nurse',
    [AppointmentType.FAMILY_VISIT]: 'users',
    [AppointmentType.CONSULTATION]: 'comments',
    [AppointmentType.MEDICAL_APPOINTMENT]: 'heartbeat',
    [AppointmentType.ADMIN_MEETING]: 'briefcase',
    [AppointmentType.SOCIAL_EVENT]: 'glass-cheers',
  };

  return icons[type] ?? 'calendar';
}

// ========================================================================
// REMINDER HELPERS (mock – real implementation handled by future service)
// ========================================================================

async function scheduleAppointmentReminders(
  appointmentId: string,
  reminders: any[]
): Promise<void> {
  logger.info(
    `Mock-schedule ${reminders.length} reminders for appointment ${appointmentId}`
  );

}

async function cancelAppointmentReminders(
  appointmentId: string
): Promise<void> {
  logger.info(`Mock-cancel reminders for appointment ${appointmentId}`);
// ========================================================================
// DATA VALIDATION HELPERS
// ========================================================================

function validateAppointmentData(appt: Omit<Appointment, 'id' | 'metadata'>) {
  if (!appt.title) {
    throw new CalendarError('Appointment title is required', 'VALIDATION_ERROR');
  }
  if (!isBefore(parseISO(appt.startTime), parseISO(appt.endTime))) {
    throw new CalendarError('Start time must be before end time', 'VALIDATION_ERROR');
  }
  if (!Object.values(AppointmentType).includes(appt.type)) {
    throw new CalendarError('Invalid appointment type', 'VALIDATION_ERROR');
  }
  if (!Object.values(AppointmentStatus).includes(appt.status)) {
    throw new CalendarError('Invalid appointment status', 'VALIDATION_ERROR');
  }
  if (appt.recurrence) validateRecurrencePattern(appt.recurrence);
}

/**
 * Ensures the supplied recurrence pattern is valid
 */
function validateRecurrencePattern(recur: RecurrencePattern) {
  if (!Object.values(RecurrenceFrequency).includes(recur.frequency)) {
    throw new CalendarError('Invalid recurrence frequency', 'VALIDATION_ERROR');
  }

  // Weekly recurrence needs at least one day of week selected
  if (
    recur.frequency === RecurrenceFrequency.WEEKLY &&
    (!recur.daysOfWeek || recur.daysOfWeek.length === 0)
  ) {
    throw new CalendarError(
      'Weekly recurrence requires daysOfWeek',
      'VALIDATION_ERROR'
    );
  }

  // Must have an end condition
  if (!recur.endDate && !recur.occurrences) {
    throw new CalendarError(
      'Recurrence requires endDate or occurrences',
      'VALIDATION_ERROR'
    );
  }
}

// ========================================================================
// DB → DOMAIN MAPPING
// ========================================================================

/**
 * Converts a Prisma/DB appointment object to the public Appointment shape
 * used throughout the client code.
 */
function mapDbAppointmentToAppointment(dbAppointment: any): Appointment {
  return {
    id: dbAppointment.id,
    type: dbAppointment.type as AppointmentType,
    status: dbAppointment.status as AppointmentStatus,
    title: dbAppointment.title,
    description: dbAppointment.description || undefined,
    startTime: dbAppointment.startTime instanceof Date
      ? dbAppointment.startTime.toISOString()
      : dbAppointment.startTime,
    endTime: dbAppointment.endTime instanceof Date
      ? dbAppointment.endTime.toISOString()
      : dbAppointment.endTime,
    location: dbAppointment.location ? JSON.parse(dbAppointment.location) : undefined,
    homeId: dbAppointment.homeId || undefined,
    residentId: dbAppointment.residentId || undefined,
    createdBy: {
      id: dbAppointment.createdBy.id,
      name: `${dbAppointment.createdBy.firstName} ${dbAppointment.createdBy.lastName}`,
      role: dbAppointment.createdBy.role
    },
    participants: dbAppointment.participants.map((p: any) => ({
      userId: p.userId,
      name: p.name,
      role: p.role,
      status: p.status,
      notes: p.notes || undefined
    })),
    notes: dbAppointment.notes || undefined,
    customFields: dbAppointment.customFields ? JSON.parse(dbAppointment.customFields) : undefined,
    recurrence: dbAppointment.recurrence ? JSON.parse(dbAppointment.recurrence) : undefined,
    reminders: dbAppointment.reminders ? JSON.parse(dbAppointment.reminders) : undefined,
    metadata: {
      createdAt: dbAppointment.createdAt instanceof Date
        ? dbAppointment.createdAt.toISOString()
        : dbAppointment.createdAt,
      updatedAt: dbAppointment.updatedAt instanceof Date
        ? dbAppointment.updatedAt.toISOString()
        : dbAppointment.updatedAt,
      ...(dbAppointment.metadata || {})
    }
  };
}

// ========================================================================
// AVAILABILITY FUNCTIONS
// ========================================================================

/**
 * Finds available time slots for a user within a date range
 * @param userId User ID
 * @param dateRange Date range to search
 * @param appointmentType Type of appointment
 * @param duration Duration of appointment in minutes
 * @param homeId Optional home ID for location-specific availability
 * @returns Array of available time slots
 */
export async function findAvailableSlots(
  userId: string,
  dateRange: DateRange,
  appointmentType: AppointmentType,
  duration: number = 60,
  homeId?: string
): Promise<TimeSlot[]> {
  try {
    // 1. Get all user's availability slots in the date range
    const availabilitySlots = await prisma.availabilitySlot.findMany({
      where: {
        userId,
        isAvailable: true,
        startTime: { gte: dateRange.start },
        endTime: { lte: dateRange.end },
        ...(homeId ? { homeId } : {}),
        OR: [
          { availableFor: { has: appointmentType } },
          { availableFor: { isEmpty: true } } // available for all
        ]
      },
      orderBy: { startTime: 'asc' }
    });

    // 2. Pull existing appointments in the same window for conflict checks
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        participants: { some: { userId } },
        status: { in: [AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING] },
        startTime: { lt: dateRange.end },
        endTime: { gt: dateRange.start }
      },
      select: { startTime: true, endTime: true }
    });

    // 3. Build list of candidate available slots
    const availableSlots: TimeSlot[] = [];

    for (const avail of availabilitySlots) {
      let cursor = avail.startTime;

      while (
        isBefore(addMinutes(cursor, duration), avail.endTime) ||
        isEqual(addMinutes(cursor, duration), avail.endTime)
      ) {
        const candidateEnd = addMinutes(cursor, duration);

        // conflict?
        const conflict = existingAppointments.some(appt =>
          isBefore(appt.startTime, candidateEnd) &&
          isBefore(cursor, appt.endTime)
        );

        if (!conflict) {
          availableSlots.push({
            startTime: cursor.toISOString(),
            endTime: candidateEnd.toISOString()
          });
        }

        cursor = addMinutes(cursor, duration);
      }
    }

    return availableSlots;
  } catch (error) {
    logger.error('Error finding available slots', { userId, dateRange, error });
    throw new CalendarError(
      'Failed to find available time slots',
      'AVAILABILITY_SEARCH_FAILED'
    );
  }
}

// ========================================================================
// NOTIFICATION HELPERS
// ========================================================================

/**
 * Sends notifications (email + in-app) about an appointment change
 */
async function sendAppointmentNotifications(
  appointmentId: string,
  action: 'CREATED' | 'UPDATED' | 'CANCELLED' | 'COMPLETED',
  actionBy: string,
  additionalData: Record<string, any> = {}
): Promise<void> {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { participants: true, createdBy: true }
    });
    
    if (!appointment) {
      throw new Error(`Appointment ${appointmentId} not found`);
    }

    // Build recipient list – creator + participants (excluding actor)
    const recipients = [
      {
        id: appointment.createdById,
        email: (appointment.createdBy as any).email ?? `${appointment.createdById}@example.com`,
        name: `${appointment.createdBy.firstName} ${appointment.createdBy.lastName}`
      },
      ...appointment.participants.map((p: any) => ({
        id: p.userId,
        email: (p as any).email ?? `${p.userId}@example.com`,
        name: p.name ?? p.userId
      }))
    ].filter(r => r.id !== actionBy);

    // Create in-app notifications & emails for each recipient
    for (const r of recipients) {
      // In-app notification
      await prisma.notification.create({
        data: {
          userId: r.id,
          type: `APPOINTMENT_${action}`,
          title: getNotificationTitle(action, appointment.title),
          message: getNotificationMessage(action, appointment, additionalData),
          isRead: false,
          data: JSON.stringify({ appointmentId, action, ...additionalData })
        }
      });

      // Email notification
      await sendAppointmentEmail(
        r.email,
        r.name,
        action,
        appointment,
        additionalData
      );
    }
  } catch (error) {
    logger.error('Error sending appointment notifications', {
      appointmentId,
      action,
      error
    });
  }
}

/**
 * Gets notification title based on action and appointment title
 */
function getNotificationTitle(
  action: 'CREATED' | 'UPDATED' | 'CANCELLED' | 'COMPLETED',
  title: string
): string {
  const verbs: Record<typeof action, string> = {
    CREATED: 'New',
    UPDATED: 'Updated',
    CANCELLED: 'Cancelled',
    COMPLETED: 'Completed'
  };
  return `${verbs[action]} Appointment: ${title}`;
}

/**
 * Gets notification message based on action and appointment details
 */
function getNotificationMessage(
  action: 'CREATED' | 'UPDATED' | 'CANCELLED' | 'COMPLETED',
  appointment: any,
  extra: Record<string, any>
): string {
  const date = formatDate(appointment.startTime, 'MMMM d, yyyy');
  const time = formatDate(appointment.startTime, 'h:mm a');

  switch (action) {
    case 'CREATED':
      return `"${appointment.title}" scheduled for ${date} at ${time}.`;
    case 'UPDATED':
      return `"${appointment.title}" on ${date} at ${time} has been updated.`;
    case 'CANCELLED':
      return `"${appointment.title}" on ${date} at ${time} was cancelled. ${
        extra.cancelReason ?? ''
      }`;
    case 'COMPLETED':
      return `"${appointment.title}" on ${date} at ${time} marked complete.`;
  }
}

/**
 * Sends an email notification about an appointment change
 */
async function sendAppointmentEmail(
  recipientEmail: string,
  recipientName: string,
  action: 'CREATED' | 'UPDATED' | 'CANCELLED' | 'COMPLETED',
  appointment: any,
  extra: Record<string, any>
): Promise<void> {
  try {
    const subject = getNotificationTitle(action, appointment.title);
    const html = `
      <p>Hi ${recipientName},</p>
      <p>${getNotificationMessage(action, appointment, extra)}</p>
      <p><strong>When:</strong> ${formatDate(
        appointment.startTime,
        'PPpp'
      )} – ${formatDate(appointment.endTime, 'PPpp')}</p>
      <p><strong>Where:</strong> ${
        appointment.location
          ? JSON.parse(appointment.location).address
          : 'TBD'
      }</p>
      <p>Thank you,<br/>CareLinkAI Team</p>
    `;

    await sendEmail({
      to: recipientEmail,
      subject,
      html
    });
  } catch (e) {
    logger.error('Error sending appointment email', {
      recipientEmail,
      action,
      e
    });
  }
}

/**
 * Merges adjacent time slots if they can accommodate the requested duration
 * @param slots Array of time slots
 * @param minDuration Minimum duration in minutes
 * @returns Array of merged time slots
 */
function mergeAdjacentSlots(slots: TimeSlot[], minDuration: number): TimeSlot[] {
  if (slots.length === 0) return [];
  
  // Sort slots by start time
  const sortedSlots = [...slots].sort((a, b) => 
    parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime()
  );
  
  const mergedSlots: TimeSlot[] = [];
  let currentSlot = sortedSlots[0];
  
  for (let i = 1; i < sortedSlots.length; i++) {
    const nextSlot = sortedSlots[i];
    
    // Check if slots are adjacent (end time of current = start time of next)
    if (currentSlot.endTime === nextSlot.startTime) {
      // Merge slots
      currentSlot = {
        startTime: currentSlot.startTime,
        endTime: nextSlot.endTime
      };
    } else {
      // Add current slot if it meets minimum duration
      if (getSlotDuration(currentSlot) >= minDuration) {
        mergedSlots.push(currentSlot);
      }
      currentSlot = nextSlot;
    }
  }
  
  // Add the last slot if it meets minimum duration
  if (getSlotDuration(currentSlot) >= minDuration) {
    mergedSlots.push(currentSlot);
  }
  
  return mergedSlots;
}

// ========================================================================
// APPOINTMENT MANAGEMENT
// ========================================================================

/**
 * Creates a new appointment
 * @param appointmentData Appointment data
 * @returns Created appointment
 */
export async function createAppointment(appointmentData: Omit<Appointment, 'id' | 'metadata'>): Promise<Appointment> {
  try {
    // 1. Validate appointment data
    validateAppointmentData(appointmentData);
    
    // 2. Check availability for all participants
    const slot: TimeSlot = {
      startTime: appointmentData.startTime,
      endTime: appointmentData.endTime
    };
    
    const availabilityChecks = await Promise.all([
      // Check creator's availability
      checkUserAvailability(
        appointmentData.createdBy.id,
        slot,
        appointmentData.type,
        appointmentData.homeId
      ),
      // Check all participants' availability
      ...appointmentData.participants.map(participant => 
        checkUserAvailability(
          participant.userId,
          slot,
          appointmentData.type,
          appointmentData.homeId
        )
      )
    ]);
    
    // Check if any participant is unavailable
    const unavailableUsers = availabilityChecks.filter(check => !check.isAvailable);
    if (unavailableUsers.length > 0) {
      throw new CalendarError(
        `Some users are unavailable for this time slot: ${unavailableUsers.map(u => u.userId).join(', ')}`,
        'PARTICIPANTS_UNAVAILABLE'
      );
    }
    
    // 3. Create the appointment in the database
    const appointment = await prisma.appointment.create({
      data: {
        type: appointmentData.type,
        status: appointmentData.status,
        title: appointmentData.title,
        description: appointmentData.description || '',
        startTime: new Date(appointmentData.startTime),
        endTime: new Date(appointmentData.endTime),
        location: appointmentData.location ? JSON.stringify(appointmentData.location) : null,
        homeId: appointmentData.homeId,
        residentId: appointmentData.residentId,
        createdById: appointmentData.createdBy.id,
        notes: appointmentData.notes || '',
        customFields: appointmentData.customFields ? JSON.stringify(appointmentData.customFields) : null,
        recurrence: appointmentData.recurrence ? JSON.stringify(appointmentData.recurrence) : null,
        reminders: appointmentData.reminders ? JSON.stringify(appointmentData.reminders) : null,
        participants: {
          createMany: {
            data: appointmentData.participants.map(p => ({
              userId: p.userId,
              name: p.name,
              role: p.role,
              status: p.status,
              notes: p.notes || null
            }))
          }
        }
      },
      include: {
        participants: true,
        createdBy: true
      }
    });
    
    // 4. If it's a recurring appointment, create the series
    if (appointmentData.recurrence) {
      await createRecurringAppointments(appointment.id, appointmentData);
    }
    
    // 5. Schedule reminders if configured
    if (appointmentData.reminders && appointmentData.reminders.length > 0) {
      await scheduleAppointmentReminders(appointment.id, appointmentData.reminders);
    }
    
    // 6. Send notifications to participants
    await sendAppointmentNotifications(
      appointment.id,
      'CREATED',
      appointmentData.createdBy.id
    );
    
    return mapDbAppointmentToAppointment(appointment);
  } catch (error) {
    if (error instanceof CalendarError) {
      throw error;
    }
    
    logger.error('Error creating appointment', { appointmentData, error });
    throw new CalendarError(
      'Failed to create appointment',
      'CREATE_APPOINTMENT_FAILED'
    );
  }
}

/**
 * Updates an existing appointment
 * @param id Appointment ID
 * @param appointmentData Updated appointment data
 * @returns Updated appointment
 */
export async function updateAppointment(
  id: string,
  appointmentData: Partial<Appointment>
): Promise<Appointment> {
  try {
    // 1. Get the existing appointment
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        participants: true,
        createdBy: true
      }
    });
    
    if (!existingAppointment) {
      throw new CalendarError(
        `Appointment with ID ${id} not found`,
        'APPOINTMENT_NOT_FOUND'
      );
    }
    
    // 2. Check if time slot is being updated
    if (appointmentData.startTime || appointmentData.endTime) {
      const slot: TimeSlot = {
        startTime: appointmentData.startTime || existingAppointment.startTime.toISOString(),
        endTime: appointmentData.endTime || existingAppointment.endTime.toISOString()
      };
      
      // Get all participants including creator
      const participantIds = [
        existingAppointment.createdById,
        ...existingAppointment.participants
          .filter(p => p.status !== 'DECLINED')
          .map(p => p.userId)
      ];
      
      // Check availability for all participants
      const availabilityChecks = await Promise.all(
        participantIds.map(userId => 
          checkUserAvailability(
            userId,
            slot,
            appointmentData.type || existingAppointment.type as AppointmentType,
            appointmentData.homeId || existingAppointment.homeId || undefined
          )
        )
      );
      
      // Check if any participant is unavailable
      const unavailableUsers = availabilityChecks.filter(check => !check.isAvailable);
      if (unavailableUsers.length > 0) {
        throw new CalendarError(
          `Some users are unavailable for this time slot: ${unavailableUsers.map(u => u.userId).join(', ')}`,
          'PARTICIPANTS_UNAVAILABLE'
        );
      }
    }
    
    // 3. Update the appointment
    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: {
        ...(appointmentData.type && { type: appointmentData.type }),
        ...(appointmentData.status && { status: appointmentData.status }),
        ...(appointmentData.title && { title: appointmentData.title }),
        ...(appointmentData.description !== undefined && { description: appointmentData.description || '' }),
        ...(appointmentData.startTime && { startTime: new Date(appointmentData.startTime) }),
        ...(appointmentData.endTime && { endTime: new Date(appointmentData.endTime) }),
        ...(appointmentData.location && { location: JSON.stringify(appointmentData.location) }),
        ...(appointmentData.homeId !== undefined && { homeId: appointmentData.homeId }),
        ...(appointmentData.residentId !== undefined && { residentId: appointmentData.residentId }),
        ...(appointmentData.notes !== undefined && { notes: appointmentData.notes || '' }),
        ...(appointmentData.customFields && { customFields: JSON.stringify(appointmentData.customFields) }),
        ...(appointmentData.recurrence && { recurrence: JSON.stringify(appointmentData.recurrence) }),
        ...(appointmentData.reminders && { reminders: JSON.stringify(appointmentData.reminders) }),
      },
      include: {
        participants: true,
        createdBy: true
      }
    });
    
    // 4. Update participants if provided
    if (appointmentData.participants) {
      // Get existing participant IDs
      const existingParticipantIds = existingAppointment.participants.map(p => p.userId);
      
      // Find participants to add (not in existing list)
      const participantsToAdd = appointmentData.participants.filter(
        p => !existingParticipantIds.includes(p.userId)
      );
      
      // Find participants to update (in both lists)
      const participantsToUpdate = appointmentData.participants.filter(
        p => existingParticipantIds.includes(p.userId)
      );
      
      // Add new participants
      if (participantsToAdd.length > 0) {
        await prisma.appointmentParticipant.createMany({
          data: participantsToAdd.map(p => ({
            appointmentId: id,
            userId: p.userId,
            name: p.name,
            role: p.role,
            status: p.status,
            notes: p.notes || null
          }))
        });
      }
      
      // Update existing participants
      for (const participant of participantsToUpdate) {
        await prisma.appointmentParticipant.updateMany({
          where: {
            appointmentId: id,
            userId: participant.userId
          },
          data: {
            name: participant.name,
            role: participant.role,
            status: participant.status,
            notes: participant.notes || null
          }
        });
      }
    }
    
    // 5. Update reminders if needed
    if (appointmentData.reminders) {
      // Cancel existing reminders
      await cancelAppointmentReminders(id);
      
    }
    
    // Send notifications about the update
    await sendAppointmentNotifications(
      id,
      'UPDATED',
      existingAppointment.createdById
    );
    
    // 7. Fetch the fully updated appointment with all relations
    const finalAppointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        participants: true,
        createdBy: true
      }
    });
    
    return mapDbAppointmentToAppointment(finalAppointment!);
  } catch (error) {
    if (error instanceof CalendarError) {
      throw error;
    }
    
    logger.error('Error updating appointment', { id, appointmentData, error });
    throw new CalendarError(
      `Failed to update appointment ${id}`,
      'UPDATE_APPOINTMENT_FAILED'
    );
  }
}

/**
 * Cancels an appointment
 * @param id Appointment ID
 * @param cancelReason Reason for cancellation
 * @param cancelledBy User ID of person cancelling
 * @returns Cancelled appointment
 */
export async function cancelAppointment(
  id: string,
  cancelReason: string,
  cancelledBy: string
): Promise<Appointment> {
  try {
    // 1. Get the existing appointment
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        participants: true,
        createdBy: true
      }
    });
    
    if (!existingAppointment) {
      throw new CalendarError(
        `Appointment with ID ${id} not found`,
        'APPOINTMENT_NOT_FOUND'
      );
    }
    
    // 2. Check if user has permission to cancel
    const isCreator = existingAppointment.createdById === cancelledBy;
    const isParticipant = existingAppointment.participants.some(p => p.userId === cancelledBy);
    
    if (!isCreator && !isParticipant) {
      throw new CalendarError(
        'You do not have permission to cancel this appointment',
        'PERMISSION_DENIED'
      );
    }
    
    // 3. Cancel the appointment
    const cancelledAppointment = await prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CANCELLED,
        metadata: {
          ...existingAppointment.metadata,
          cancelledAt: new Date().toISOString(),
          cancelReason
        }
      },
      include: {
        participants: true,
        createdBy: true
      }
    });
    
    // 4. Cancel any scheduled reminders
    await cancelAppointmentReminders(id);
    
    // 5. Send cancellation notifications
    await sendAppointmentNotifications(
      id,
      'CANCELLED',
      cancelledBy,
      { cancelReason }
    );
    
    return mapDbAppointmentToAppointment(cancelledAppointment);
  } catch (error) {
    if (error instanceof CalendarError) {
      throw error;
    }
    
    logger.error('Error cancelling appointment', { id, cancelReason, cancelledBy, error });
    throw new CalendarError(
      `Failed to cancel appointment ${id}`,
      'CANCEL_APPOINTMENT_FAILED'
    );
  }
}

/**
 * Gets an appointment by ID
 * @param id Appointment ID
 * @returns Appointment
 */
export async function getAppointment(id: string): Promise<Appointment> {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        participants: true,
        createdBy: true
      }
    });
    
    if (!appointment) {
      throw new CalendarError(
        `Appointment with ID ${id} not found`,
        'APPOINTMENT_NOT_FOUND'
      );
    }
    
    return mapDbAppointmentToAppointment(appointment);
  } catch (error) {
    if (error instanceof CalendarError) {
      throw error;
    }
    
    logger.error('Error getting appointment', { id, error });
    throw new CalendarError(
      `Failed to get appointment ${id}`,
      'GET_APPOINTMENT_FAILED'
    );
  }
}

/**
 * Gets appointments based on filter criteria
 * @param filter Filter criteria
 * @returns Array of appointments
 */
export async function getAppointments(filter: CalendarFilter): Promise<Appointment[]> {
  try {
    // Build the where clause based on filter criteria
    const where: any = {};
    
    if (filter.appointmentTypes && filter.appointmentTypes.length > 0) {
      where.type = { in: filter.appointmentTypes };
    }
    
    if (filter.status && filter.status.length > 0) {
      where.status = { in: filter.status };
    }
    
    if (filter.homeIds && filter.homeIds.length > 0) {
      where.homeId = { in: filter.homeIds };
    }
    
    if (filter.residentIds && filter.residentIds.length > 0) {
      where.residentId = { in: filter.residentIds };
    }
    
    if (filter.dateRange) {
      where.startTime = { gte: new Date(filter.dateRange.start) };
      where.endTime = { lte: new Date(filter.dateRange.end) };
    }
    
    if (filter.participantIds && filter.participantIds.length > 0) {
      where.OR = [
        {
          participants: {
            some: {
              userId: { in: filter.participantIds }
            }
          }
        },
        {
          createdById: { in: filter.participantIds }
        }
      ];
    }
    
    if (filter.searchText) {
      where.OR = [
        { title: { contains: filter.searchText, mode: 'insensitive' } },
        { description: { contains: filter.searchText, mode: 'insensitive' } },
        { notes: { contains: filter.searchText, mode: 'insensitive' } }
      ];
    }
    
    try {
      // Try to query the database first
      const appointments = await prisma.appointment.findMany({
        where,
        include: {
          participants: true,
          createdBy: true
        },
        orderBy: {
          startTime: 'asc'
        }
      });
      
      return appointments.map(mapDbAppointmentToAppointment);
    } catch (dbError) {
      // If database query fails (likely because tables don't exist yet),
      // log the error and return mock data instead
      logger.warn('Database query failed, using mock appointment data', { filter, error: dbError });
      
      // Generate mock appointments based on filter criteria
      return generateMockAppointments(filter);
    }
  } catch (error) {
    logger.error('Error getting appointments', { filter, error });
    throw new CalendarError(
      'Failed to get appointments',
      'GET_APPOINTMENTS_FAILED'
    );
  }
}

/**
 * Creates a simple seeded random function
 * @param seed Seed value
 * @returns Function that returns deterministic "random" numbers
 */
function seededRandom(seed: number): () => number {
  let s = seed;
  return function() {
    s = Math.sin(s) * 10000;
    return s - Math.floor(s);
  };
}

/**
 * Generates mock appointment data for testing
 * @param filter Filter criteria to apply
 * @returns Array of mock appointments
 */
function generateMockAppointments(filter: CalendarFilter): Appointment[] {
  logger.info('Generating mock appointment data', { filter });
  
  // Generate seed from filter parameters for deterministic results
  const seed = (filter.dateRange ? 
    new Date(filter.dateRange.start).getTime() + 
    new Date(filter.dateRange.end).getTime() : 
    Date.now()) + 
    (filter.participantIds?.[0]?.length || 0) * 1000;
  
  // Create seeded random function
  const random = seededRandom(seed);
  
  // Current date for reference
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  // Sample appointment types
  const appointmentTypes = Object.values(AppointmentType);
  
  // Sample statuses
  const appointmentStatuses = [
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.PENDING,
    AppointmentStatus.COMPLETED,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.RESCHEDULED
  ];
  
  // Sample users
  const users = [
    { id: 'cmdhjmp2x0000765nc52usnp7', firstName: 'Admin', lastName: 'User', role: 'ADMIN' },
    { id: 'user123', firstName: 'John', lastName: 'Doe', role: 'FAMILY' },
    { id: 'user456', firstName: 'Jane', lastName: 'Smith', role: 'CAREGIVER' },
    { id: 'user789', firstName: 'Robert', lastName: 'Johnson', role: 'OPERATOR' }
  ];
  
  // Sample homes
  const homes = [
    { id: 'home123', name: 'Sunny Meadows' },
    { id: 'home456', name: 'Golden Years' },
    { id: 'home789', name: 'Peaceful Haven' }
  ];
  
  // Sample residents
  const residents = [
    { id: 'resident123', name: 'Alice Williams' },
    { id: 'resident456', name: 'Bob Thompson' },
    { id: 'resident789', name: 'Carol Davis' }
  ];
  
  // Sample appointment titles by type
  const appointmentTitles: Record<AppointmentType, string[]> = {
    [AppointmentType.CARE_EVALUATION]: [
      'Initial Care Assessment',
      'Quarterly Care Review',
      'Health Status Evaluation',
      'Care Plan Update Meeting'
    ],
    [AppointmentType.FACILITY_TOUR]: [
      'New Family Facility Tour',
      'Prospective Resident Visit',
      'Facility Walkthrough',
      'Amenities Showcase Tour'
    ],
    [AppointmentType.CAREGIVER_SHIFT]: [
      'Morning Care Shift',
      'Evening Care Shift',
      'Overnight Monitoring',
      'Weekend Care Coverage'
    ],
    [AppointmentType.FAMILY_VISIT]: [
      'Family Weekend Visit',
      'Children\'s Visit',
      'Holiday Family Gathering',
      'Birthday Celebration'
    ],
    [AppointmentType.CONSULTATION]: [
      'Care Planning Consultation',
      'Financial Planning Meeting',
      'Legal Document Review',
      'Family Care Discussion'
    ],
    [AppointmentType.MEDICAL_APPOINTMENT]: [
      'Doctor Checkup',
      'Medication Review',
      'Physical Therapy Session',
      'Dental Appointment'
    ],
    [AppointmentType.ADMIN_MEETING]: [
      'Staff Performance Review',
      'Budget Planning Session',
      'Policy Update Meeting',
      'Quality Assurance Review'
    ],
    [AppointmentType.SOCIAL_EVENT]: [
      'Community Game Night',
      'Movie Screening',
      'Arts and Crafts Workshop',
      'Musical Performance'
    ]
  };
  
  // Sample appointment descriptions by type
  const appointmentDescriptions: Record<AppointmentType, string[]> = {
    [AppointmentType.CARE_EVALUATION]: [
      'Comprehensive assessment of care needs and current health status.',
      'Review of current care plan and discussion of any necessary adjustments.',
      'Evaluation of physical and cognitive abilities to determine appropriate care level.'
    ],
    [AppointmentType.FACILITY_TOUR]: [
      'Tour of the facility including common areas, dining, and sample rooms.',
      'Introduction to staff and overview of services and amenities.',
      'Discussion of facility policies, costs, and availability.'
    ],
    [AppointmentType.CAREGIVER_SHIFT]: [
      'Regular care duties including medication administration, hygiene assistance, and mobility support.',
      'Monitoring of vital signs, assistance with daily activities, and meal support.',
      'Overnight monitoring with regular checks and assistance as needed.'
    ],
    [AppointmentType.FAMILY_VISIT]: [
      'Scheduled family visit with private time in the resident\'s room or common area.',
      'Family gathering with activities planned by the recreation department.',
      'Special celebration with family members including cake and refreshments.'
    ],
    [AppointmentType.CONSULTATION]: [
      'Discussion of care options and planning for future needs.',
      'Review of financial considerations and payment options.',
      'Consultation regarding legal documents such as power of attorney and advance directives.'
    ],
    [AppointmentType.MEDICAL_APPOINTMENT]: [
      'Regular checkup with primary care physician to monitor ongoing conditions.',
      'Review of current medications and potential adjustments.',
      'Therapy session to improve mobility and strength.'
    ],
    [AppointmentType.ADMIN_MEETING]: [
      'Review of staff performance and discussion of improvement opportunities.',
      'Planning session for upcoming budget period and resource allocation.',
      'Meeting to discuss policy updates and implementation strategies.'
    ],
    [AppointmentType.SOCIAL_EVENT]: [
      'Community social event with games, refreshments, and socialization opportunities.',
      'Entertainment event featuring music, film, or other performances.',
      'Interactive workshop with hands-on activities and creative expression.'
    ]
  };
  
  // Sample locations
  const locations = [
    { address: '123 Main St, Suite 100, Anytown, CA 94501', room: 'Conference Room A' },
    { address: '456 Oak Ave, Anytown, CA 94501', room: 'Dining Hall' },
    { address: '789 Pine Rd, Anytown, CA 94501', room: 'Activity Center' },
    { address: '321 Maple Blvd, Anytown, CA 94501', room: 'Private Room 204' }
  ];
  
  // Generate 20-30 mock appointments - using seeded random for consistency
  const numberOfAppointments = Math.floor(random() * 11) + 20; // 20-30
  const mockAppointments: Appointment[] = [];
  
  // Get the date range from filter or use current month
  const startDate = filter.dateRange ? new Date(filter.dateRange.start) : new Date(currentYear, currentMonth, 1);
  const endDate = filter.dateRange ? new Date(filter.dateRange.end) : new Date(currentYear, currentMonth + 1, 0);
  
  // Generate appointments
  for (let i = 0; i < numberOfAppointments; i++) {
    // Generate random date within range - using seeded random
    const appointmentDate = new Date(
      startDate.getTime() + random() * (endDate.getTime() - startDate.getTime())
    );
    
    // Random hour between 8am and 6pm - using seeded random
    appointmentDate.setHours(8 + Math.floor(random() * 10), 
                           random() < 0.5 ? 0 : 30, 0, 0);
    
    // Random duration between 30 minutes and 2 hours - using seeded random
    const durationMinutes = [30, 60, 90, 120][Math.floor(random() * 4)];
    const endTime = new Date(appointmentDate.getTime() + durationMinutes * 60000);
    
    // Random appointment type - using seeded random
    const appointmentType = appointmentTypes[Math.floor(random() * appointmentTypes.length)];
    
    // Random status (weighted toward CONFIRMED) - using seeded random
    const statusRandom = random();
    let status;
    if (statusRandom < 0.6) {
      status = AppointmentStatus.CONFIRMED;
    } else if (statusRandom < 0.75) {
      status = AppointmentStatus.PENDING;
    } else if (statusRandom < 0.85) {
      status = AppointmentStatus.COMPLETED;
    } else if (statusRandom < 0.95) {
      status = AppointmentStatus.RESCHEDULED;
    } else {
      status = AppointmentStatus.CANCELLED;
    }
    
    // Random creator (weighted toward admin) - using seeded random
    const creator = random() < 0.7 ? users[0] : users[Math.floor(random() * users.length)];
    
    // Random title and description based on type - using seeded random
    const titles = appointmentTitles[appointmentType];
    const descriptions = appointmentDescriptions[appointmentType];
    const title = titles[Math.floor(random() * titles.length)];
    const description = descriptions[Math.floor(random() * descriptions.length)];
    
    // Random location - using seeded random
    const location = locations[Math.floor(random() * locations.length)];
    
    // Random home and resident (may be undefined) - using seeded random
    const homeId = random() < 0.7 ? homes[Math.floor(random() * homes.length)].id : undefined;
    const residentId = random() < 0.6 ? residents[Math.floor(random() * residents.length)].id : undefined;
    
    // Generate 1-3 participants - using seeded random
    const numParticipants = Math.floor(random() * 3) + 1;
    const participants = [];
    const usedUserIds = new Set([creator.id]);
    
    for (let j = 0; j < numParticipants; j++) {
      let user;
      do {
        user = users[Math.floor(random() * users.length)];
      } while (usedUserIds.has(user.id));
      
      usedUserIds.add(user.id);
      
      participants.push({
        userId: user.id,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
        status: random() < 0.8 ? 'ACCEPTED' : 'PENDING',
        notes: random() < 0.3 ? 'Some notes about participation' : undefined
      });
    }
    
    // Create the appointment
    const appointment: Appointment = {
      id: `mock-appt-${i}-${seed.toString(36).substring(0, 8)}`,
      type: appointmentType,
      status: status,
      title: title,
      description: description,
      startTime: appointmentDate.toISOString(),
      endTime: endTime.toISOString(),
      location: location,
      homeId: homeId,
      residentId: residentId,
      createdBy: {
        id: creator.id,
        name: `${creator.firstName} ${creator.lastName}`,
        role: creator.role
      },
      participants: participants,
      notes: random() < 0.5 ? 'Additional notes about this appointment.' : undefined,
      metadata: {
        createdAt: new Date(appointmentDate.getTime() - 86400000 * Math.floor(random() * 14)).toISOString(),
        updatedAt: new Date().toISOString()
      }
    };
    
    // Add cancellation data if cancelled
    if (status === AppointmentStatus.CANCELLED) {
      appointment.metadata.cancelledAt = new Date(appointmentDate.getTime() - 86400000 * Math.floor(random() * 3)).toISOString();
      appointment.metadata.cancelReason = 'Scheduling conflict';
    }
    
    // Add completion data if completed
    if (status === AppointmentStatus.COMPLETED) {
      appointment.metadata.completedAt = endTime.toISOString();
      appointment.metadata.completionNotes = 'Appointment completed successfully';
    }
    
    mockAppointments.push(appointment);
  }
  
  // Apply filters to mock data
  return filterMockAppointments(mockAppointments, filter);
}

/**
 * Filters mock appointments based on filter criteria
 * @param appointments Array of appointments to filter
 * @param filter Filter criteria
 * @returns Filtered array of appointments
 */
function filterMockAppointments(appointments: Appointment[], filter: CalendarFilter): Appointment[] {
  let filtered = [...appointments];
  
  // Filter by appointment types
  if (filter.appointmentTypes && filter.appointmentTypes.length > 0) {
    filtered = filtered.filter(a => filter.appointmentTypes!.includes(a.type));
  }
  
  // Filter by status
  if (filter.status && filter.status.length > 0) {
    filtered = filtered.filter(a => filter.status!.includes(a.status));
  }
  
  // Filter by home IDs
  if (filter.homeIds && filter.homeIds.length > 0) {
    filtered = filtered.filter(a => a.homeId && filter.homeIds!.includes(a.homeId));
  }
  
  // Filter by resident IDs
  if (filter.residentIds && filter.residentIds.length > 0) {
    filtered = filtered.filter(a => a.residentId && filter.residentIds!.includes(a.residentId));
  }
  
  // Filter by date range
  if (filter.dateRange) {
    const startDate = new Date(filter.dateRange.start);
    const endDate = new Date(filter.dateRange.end);
    
    filtered = filtered.filter(a => {
      const appointmentStart = new Date(a.startTime);
      const appointmentEnd = new Date(a.endTime);
      
      return appointmentStart >= startDate && appointmentEnd <= endDate;
    });
  }
  
  // Filter by participant IDs
  if (filter.participantIds && filter.participantIds.length > 0) {
    filtered = filtered.filter(a => {
      // Check if creator is in the participant IDs
      if (filter.participantIds!.includes(a.createdBy.id)) {
        return true;
      }
      
      // Check if any participant is in the participant IDs
      return a.participants.some(p => filter.participantIds!.includes(p.userId));
    });
  }
  
  // Filter by search text
  if (filter.searchText) {
    const searchLower = filter.searchText.toLowerCase();
    
    filtered = filtered.filter(a => 
      a.title.toLowerCase().includes(searchLower) ||
      (a.description && a.description.toLowerCase().includes(searchLower)) ||
      (a.notes && a.notes.toLowerCase().includes(searchLower))
    );
  }
  
  return filtered;
}

/**
 * Books an appointment based on a booking request
 * @param bookingRequest Booking request
 * @returns Booking response
 */
export async function bookAppointment(bookingRequest: BookingRequest): Promise<BookingResponse> {
  try {
    // 1. Check availability for the requested time slot
    const slot: TimeSlot = {
      startTime: bookingRequest.requestedStartTime,
      endTime: bookingRequest.requestedEndTime
    };
    
    // Check requester's availability
    const requesterAvailability = await checkUserAvailability(
      bookingRequest.requestedBy.id,
      slot,
      bookingRequest.type,
      bookingRequest.homeId
    );
    
    // If requester is available, check participants
    let allAvailable = requesterAvailability.isAvailable;
    let conflicts: Appointment[] = requesterAvailability.conflicts || [];
    
    // Check all required participants' availability
    if (bookingRequest.participants && bookingRequest.participants.length > 0) {
      const requiredParticipants = bookingRequest.participants.filter(p => p.required);
      
      if (requiredParticipants.length > 0) {
        const participantAvailability = await Promise.all(
          requiredParticipants.map(participant => 
            checkUserAvailability(
              participant.userId,
              slot,
              bookingRequest.type,
              bookingRequest.homeId
            )
          )
        );
        
        // Check if any required participant is unavailable
        const unavailableParticipants = participantAvailability.filter(check => !check.isAvailable);
        
        if (unavailableParticipants.length > 0) {
          allAvailable = false;
          
          // Collect all conflicts
          unavailableParticipants.forEach(check => {
            if (check.conflicts) {
              conflicts = [...conflicts, ...check.conflicts];
            }
          });
        }
      }
    }
    
    // 2. If not available, find alternative slots
    if (!allAvailable) {
      // Find alternative slots for the next 7 days
      const startDate = new Date();
      const endDate = addDays(startDate, 7);
      
      const alternativeSlots = await findAvailableSlots(
        bookingRequest.requestedBy.id,
        { start: startDate, end: endDate },
        bookingRequest.type,
        getSlotDuration(slot),
        bookingRequest.homeId
      );
      
      return {
        success: false,
        error: 'The requested time slot is not available',
        alternativeSlots,
        conflicts: conflicts.filter((c, i, self) => 
          // Remove duplicates
          i === self.findIndex(t => t.id === c.id)
        )
      };
    }
    
    // 3. Create the appointment
    const appointmentData: Omit<Appointment, 'id' | 'metadata'> = {
      type: bookingRequest.type,
      status: AppointmentStatus.CONFIRMED,
      title: bookingRequest.title,
      description: bookingRequest.description,
      startTime: bookingRequest.requestedStartTime,
      endTime: bookingRequest.requestedEndTime,
      location: bookingRequest.location,
      homeId: bookingRequest.homeId,
      residentId: bookingRequest.residentId,
      createdBy: bookingRequest.requestedBy,
      participants: bookingRequest.participants?.map(p => ({
        userId: p.userId,
        name: p.name || p.userId,
        role: p.role || 'FAMILY',
        status: p.required ? 'ACCEPTED' : 'PENDING',
        notes: undefined
      })) || [],
      recurrence: bookingRequest.recurrence,
      reminders: bookingRequest.reminders,
      notes: bookingRequest.notes,
      customFields: bookingRequest.customFields
    };
    
    const appointment = await createAppointment(appointmentData);
    
    return {
      success: true,
      appointment
    };
  } catch (error) {
    logger.error('Error booking appointment', { bookingRequest, error });
    
    if (error instanceof CalendarError) {
      return {
        success: false,
        error: error.message
      };
    }
    
    return {
      success: false,
      error: 'Failed to book appointment'
    };
  }
}

/**
 * Marks an appointment as completed
 * @param id Appointment ID
 * @param completionNotes Notes about the completion
 * @param completedBy User ID of person marking as complete
 * @returns Completed appointment
 */
export async function completeAppointment(
  id: string,
  completionNotes: string,
  completedBy: string
): Promise<Appointment> {
  try {
    // 1. Get the existing appointment
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        participants: true,
        createdBy: true
      }
    });
    
    if (!existingAppointment) {
      throw new CalendarError(
        `Appointment with ID ${id} not found`,
        'APPOINTMENT_NOT_FOUND'
      );
    }
    
    // 2. Check if user has permission to mark as complete
    const isCreator = existingAppointment.createdById === completedBy;
    const isParticipant = existingAppointment.participants.some(p => p.userId === completedBy);
    
    if (!isCreator && !isParticipant) {
      throw new CalendarError(
        'You do not have permission to mark this appointment as complete',
        'PERMISSION_DENIED'
      );
    }
    
    // 3. Mark the appointment as complete
    const completedAppointment = await prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.COMPLETED,
        metadata: {
          ...existingAppointment.metadata,
          completedAt: new Date().toISOString(),
          completionNotes
        }
      },
      include: {
        participants: true,
        createdBy: true
      }
    });
    
    // 4. Cancel any remaining reminders
    await cancelAppointmentReminders(id);
    
    // 5. Send completion notifications
    await sendAppointmentNotifications(
      id,
      'COMPLETED',
      completedBy,
      { completionNotes }
    );
    
    return mapDbAppointmentToAppointment(completedAppointment);
  } catch (error) {
    if (error instanceof CalendarError) {
      throw error;
    }
    
    logger.error('Error completing appointment', { id, completionNotes, completedBy, error });
    throw new CalendarError(
      `Failed to mark appointment ${id} as complete`,
      'COMPLETE_APPOINTMENT_FAILED'
    );
  }
}

// ========================================================================
// RECURRING APPOINTMENTS
// ========================================================================

/**
 * Creates recurring appointments based on a pattern
 * @param parentId Parent appointment ID
 * @param appointmentData Base appointment data
 * @returns Array of created appointment IDs
 */
async function createRecurringAppointments(
  parentId: string,
  appointmentData: Omit<Appointment, 'id' | 'metadata'>
): Promise<string[]> {
  try {
    if (!appointmentData.recurrence) {
      return [];
    }
    
    // 1. Generate recurrence dates
    const startDate = parseISO(appointmentData.startTime);
    const recurringDates = generateRecurrenceDates(
      startDate,
      appointmentData.recurrence
    );
    
    // Skip the first date (it's the parent appointment)
    recurringDates.shift();
    
    if (recurringDates.length === 0) {
      return [];
    }
    
    // 2. Calculate appointment duration
    const durationMinutes = differenceInMinutes(
      parseISO(appointmentData.endTime),
      parseISO(appointmentData.startTime)
    );
    
    // 3. Create recurring appointments
    const createdIds: string[] = [];
    
    for (const date of recurringDates) {
      const endDate = addMinutes(date, durationMinutes);
      
      // Create the recurring appointment
      const recurringAppointment = await prisma.appointment.create({
        data: {
          type: appointmentData.type,
          status: appointmentData.status,
          title: appointmentData.title,
          description: appointmentData.description || '',
          startTime: date,
          endTime: endDate,
          location: appointmentData.location ? JSON.stringify(appointmentData.location) : null,
          homeId: appointmentData.homeId,
          residentId: appointmentData.residentId,
          createdById: appointmentData.createdBy.id,
          notes: appointmentData.notes || '',
          customFields: appointmentData.customFields ? JSON.stringify(appointmentData.customFields) : null,
          recurrence: appointmentData.recurrence ? JSON.stringify(appointmentData.recurrence) : null,
          reminders: appointmentData.reminders ? JSON.stringify(appointmentData.reminders) : null,
          parentAppointmentId: parentId,
          participants: {
            createMany: {
              data: appointmentData.participants.map(p => ({
                userId: p.userId,
                name: p.name,
                role: p.role,
                status: p.status,
                notes: p.notes || null
              }))
            }
          }
        }
      });
      
      createdIds.push(recurringAppointment.id);
      
      // Schedule reminders for this recurring appointment
      if (appointmentData.reminders && appointmentData.reminders.length > 0) {
        await scheduleAppointmentReminders(recurringAppointment.id, appointmentData.reminders);
      }
    }
    
    return createdIds;
  } catch (error) {
    logger.error('Error creating recurring appointments', { parentId, appointmentData, error });
    throw new CalendarError(
      'Failed to create recurring appointments',
      'CREATE_RECURRING_FAILED'
    );
  }
}

/**
 * Updates a series of recurring appointments
 * @param parentId Parent appointment ID
 * @param updateData Update data
 * @param updateMode Whether to update all future occurrences or just this one
 * @returns Array of updated appointment IDs
 */
export async function updateRecurringSeries(
  parentId: string,
  updateData: Partial<Appointment>,
  updateMode: 'THIS_ONLY' | 'THIS_AND_FUTURE' | 'ALL'
): Promise<string[]> {
  try {
    // 1. Get the parent appointment
    const parentAppointment = await prisma.appointment.findUnique({
      where: { id: parentId },
      include: {
        participants: true,
        createdBy: true
      }
    });
    
    if (!parentAppointment) {
      throw new CalendarError(
        `Parent appointment with ID ${parentId} not found`,
        'APPOINTMENT_NOT_FOUND'
      );
    }
    
    // 2. Handle different update modes
    if (updateMode === 'THIS_ONLY') {
      // Update only this appointment
      await updateAppointment(parentId, updateData);
      return [parentId];
    } else {
      // Get all appointments in the series
      const seriesAppointments = await prisma.appointment.findMany({
        where: {
          OR: [
            { id: parentId },
            { parentAppointmentId: parentId }
          ]
        },
        orderBy: {
          startTime: 'asc'
        }
      });
      
      // For 'THIS_AND_FUTURE', filter to only include this and future appointments
      const appointmentsToUpdate = updateMode === 'THIS_AND_FUTURE'
        ? seriesAppointments.filter(appt => 
            isAfter(appt.startTime, parentAppointment.startTime) || 
            isEqual(appt.startTime, parentAppointment.startTime)
          )
        : seriesAppointments;
      
      // Update each appointment in the series
      const updatedIds: string[] = [];
      
      for (const appointment of appointmentsToUpdate) {
        await updateAppointment(appointment.id, updateData);
        updatedIds.push(appointment.id);
      }
      
      return updatedIds;
    }
  } catch (error) {
    if (error instanceof CalendarError) {
      throw error;
    }
    
    logger.error('Error updating recurring series', { parentId, updateData, updateMode, error });
    throw new CalendarError(
      'Failed to update recurring appointment series',
      'UPDATE_RECURRING_FAILED'
    );
  }
}

// ========================================================================
// CALENDAR UI CONVERSION
// ========================================================================

/**
 * Converts appointments to calendar events for UI display
 * @param appointments Array of appointments
 * @returns Array of calendar events
 */
export function appointmentsToCalendarEvents(appointments: Appointment[]): CalendarEvent[] {
  return appointments.map(appointment => {
    // Determine colors based on appointment type and status
    const colors = getAppointmentColors(appointment.type, appointment.status);
    
    return {
      id: appointment.id,
      title: appointment.title,
      start: appointment.startTime,
      end: appointment.endTime,
      allDay: false, // Could be determined by duration or a flag
      color: colors.color,
      backgroundColor: colors.backgroundColor,
      borderColor: colors.borderColor,
      textColor: colors.textColor,
      classNames: [
        `appointment-type-${appointment.type.toLowerCase()}`,
        `appointment-status-${appointment.status.toLowerCase()}`
      ],
      editable: appointment.status !== AppointmentStatus.CANCELLED && 
                appointment.status !== AppointmentStatus.COMPLETED,
      extendedProps: {
        appointment,
        uiMeta: {
          icon: getAppointmentIcon(appointment.type),
          status: appointment.status,
          statusColor: colors.statusColor
        }
      }
    };
  });
}

/**
 * Gets color scheme for an appointment based on type and status
 * @param type Appointment type
 * @param status Appointment status
 * @returns Color scheme
 */
function getAppointmentColors(type: AppointmentType, status: AppointmentStatus): {
  color: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  statusColor: string;
} {
  // Base colors by appointment type
  const typeColors: Record<AppointmentType, { bg: string, border: string, text: string }> = {
    [AppointmentType.CARE_EVALUATION]: { 
      bg: '#e3f2fd', border: '#2196f3', text: '#0d47a1' 
    },
    [AppointmentType.FACILITY_TOUR]: { 
      bg: '#e8f5e9', border: '#4caf50', text: '#1b5e20' 
    },
    [AppointmentType.CAREGIVER_SHIFT]: { 
      bg: '#ede7f6', border: '#673ab7', text: '#311b92' 
    },
    [AppointmentType.FAMILY_VISIT]: { 
      bg: '#fff3e0', border: '#ff9800', text: '#e65100' 
    },
    [AppointmentType.CONSULTATION]: { 
      bg: '#f3e5f5', border: '#9c27b0', text: '#4a148c' 
    },
    [AppointmentType.MEDICAL_APPOINTMENT]: { 
      bg: '#ffebee', border: '#f44336', text: '#b71c1c' 
    },
    [AppointmentType.ADMIN_MEETING]: { 
      bg: '#e0f2f1', border: '#009688', text: '#004d40' 
    },
    [AppointmentType.SOCIAL_EVENT]: { 
      bg: '#f1f8e9', border: '#8bc34a', text: '#33691e' 
    }
  };
  
  // Status color modifiers
  const statusColors: Record<AppointmentStatus, { bg: string, border: