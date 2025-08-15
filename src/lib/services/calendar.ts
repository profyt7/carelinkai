// @ts-nocheck
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

import type { 
  Appointment, AppointmentStatus, AppointmentType,
  AvailabilitySlot, BookingRequest, BookingResponse,
  CalendarEvent, CalendarFilter, DateRange,
  RecurrenceFrequency, RecurrencePattern, TimeSlot,
  DayOfWeek, AvailabilityCheck
} from '@/lib/types/calendar';

// Needed for AvailabilitySlot.userRole until real role lookup is added
import { UserRole } from '@prisma/client';

// Default timezone placeholder
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
  return format(dateObj, formatStr);
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
// AVAILABILITY UTILITIES
// ========================================================================

/**
 * Check if a user is available for a requested slot.
 *
 * Very light-weight mock implementation that consults getAppointments()
 * and uses doSlotsOverlap to detect conflicts.
 */
export async function checkUserAvailability(
  userId: string,
  requestedSlot: TimeSlot,
  appointmentType: AppointmentType,
  homeId?: string
): Promise<AvailabilityCheck> {
  // Build a filter covering the requested slot
  const filter: CalendarFilter = {
    participantIds: [userId],
    dateRange: {
      start: requestedSlot.startTime,
      end: requestedSlot.endTime
    }
  };

  // Fetch appointments that may conflict
  const existing = await getAppointments(filter);

  const conflicts = existing.filter(appt =>
    doSlotsOverlap(
      { startTime: appt.startTime, endTime: appt.endTime },
      requestedSlot
    )
  );

  return {
    userId,
    requestedSlot,
    appointmentType,
    homeId,
    isAvailable: conflicts.length === 0,
    conflicts
  };
}

/**
 * Find available slots inside a range, stepping every 30 minutes.
 * Simplistic implementation suitable for initial build pass.
 */
export async function findAvailableSlots(
  userId: string,
  range: { start: Date; end: Date },
  appointmentType: AppointmentType,
  durationMinutes: number = 60,
  homeId?: string
): Promise<AvailabilitySlot[]> {
  // Pull existing appointments for the user in the range once
  const existing = await getAppointments({
    participantIds: [userId],
    dateRange: {
      start: range.start.toISOString(),
      end: range.end.toISOString()
    }
  });

  // Convert to simple slots for overlap checks
  const existingSlots = existing.map(appt => ({
    startTime: appt.startTime,
    endTime: appt.endTime
  }));

  const candidateSlots: AvailabilitySlot[] = [];
  let cursor = new Date(range.start);

  const stepMinutes = 30;

  while (cursor.getTime() + durationMinutes * 60000 <= range.end.getTime()) {
    const startISO = cursor.toISOString();
    const endISO = new Date(cursor.getTime() + durationMinutes * 60000).toISOString();

    const overlaps = existingSlots.some(slot =>
      doSlotsOverlap(slot, { startTime: startISO, endTime: endISO })
    );

    if (!overlaps) {
      candidateSlots.push({
        id: `avail-${candidateSlots.length}`,
        userId,
        userRole: UserRole.STAFF,
        startTime: startISO,
        endTime: endISO,
        isAvailable: true,
        homeId,
        availableFor: [appointmentType]
      });
    }

    // advance cursor
    cursor = addMinutes(cursor, stepMinutes);
  }

  return candidateSlots;
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
// MOCK DATA GENERATION
// ========================================================================

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

// Enhanced cache for mock appointments to ensure consistency across calls
// We store both the filter and appointments, plus a separate array for user-created appointments
interface MockAppointmentCache {
  filter: CalendarFilter;
  appointments: Appointment[];
  lastUpdated: Date;
}

let mockAppointmentsCache: MockAppointmentCache | null = null;
// Separate array to track user-created appointments that should persist across all filter changes
const userCreatedAppointments: Appointment[] = [];

/**
 * Checks if two filters are similar enough to use cached data
 * More flexible comparison that doesn't require exact matches
 */
function areFiltersSimilar(filter1: CalendarFilter, filter2: CalendarFilter): boolean {
  // If date ranges overlap significantly, consider them similar
  const dateRangeSimilar = filter1.dateRange && filter2.dateRange && 
    Math.abs(new Date(filter1.dateRange.start).getTime() - new Date(filter2.dateRange.start).getTime()) < 86400000 * 7;
  
  // If participant IDs include at least one common ID, consider them similar
  const participantOverlap = filter1.participantIds && filter2.participantIds && 
    filter1.participantIds.some(id => filter2.participantIds?.includes(id));
  
  return dateRangeSimilar || participantOverlap;
}

/**
 * Generates mock appointment data for testing
 * @param filter Filter criteria to apply
 * @returns Array of mock appointments
 */
function generateMockAppointments(filter: CalendarFilter): Appointment[] {
  logger.info('Generating mock appointment data', { filter });
  
  // Use cache if available with similar filter to ensure consistency
  if (mockAppointmentsCache) {
    const sameFilter = areFiltersSimilar(mockAppointmentsCache.filter, filter);
    
    if (sameFilter) {
      // Return filtered version of cached appointments
      const filteredAppointments = filterMockAppointments(mockAppointmentsCache.appointments, filter);
      
      // Always include user-created appointments that match the filter
      const filteredUserAppointments = filterMockAppointments(userCreatedAppointments, filter);
      
      // Combine filtered mock appointments with user-created ones
      // Use a Map to ensure no duplicates by ID
      const appointmentMap = new Map<string, Appointment>();
      
      // Add generated appointments first
      filteredAppointments.forEach(appt => {
        appointmentMap.set(appt.id, appt);
      });
      
      // Then add user-created appointments (will override any with same ID)
      filteredUserAppointments.forEach(appt => {
        appointmentMap.set(appt.id, appt);
      });
      
      return Array.from(appointmentMap.values());
    }
  }
  
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
  
  // Create a new combined array with both generated appointments and user-created ones
  const combinedAppointments = [...mockAppointments];
  
  // Add user-created appointments that match the filter
  const filteredUserAppointments = filterMockAppointments(userCreatedAppointments, filter);
  filteredUserAppointments.forEach(userAppt => {
    // Check if this ID already exists in the combined array
    const existingIndex = combinedAppointments.findIndex(a => a.id === userAppt.id);
    if (existingIndex !== -1) {
      // Replace with user-created version
      combinedAppointments[existingIndex] = userAppt;
    } else {
      // Add new user-created appointment
      combinedAppointments.push(userAppt);
    }
  });
  
  // Cache the combined appointments for consistency
  mockAppointmentsCache = {
    filter,
    appointments: [...combinedAppointments],
    lastUpdated: new Date()
  };
  
  // Apply filters to mock data
  return filterMockAppointments(combinedAppointments, filter);
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
 * Finds a mock appointment by ID
 * @param id Appointment ID to find
 * @returns The found appointment or null if not found
 */
function findMockAppointmentById(id: string): Appointment | null {
  // First check user-created appointments
  const userCreated = userCreatedAppointments.find(a => a.id === id);
  if (userCreated) return userCreated;
  
  // If we have a cache, search it next
  if (mockAppointmentsCache) {
    const found = mockAppointmentsCache.appointments.find(a => a.id === id);
    if (found) return found;
  }
  
  // Otherwise generate a standard set of appointments and search
  const defaultFilter: CalendarFilter = {
    dateRange: {
      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
      end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString()
    }
  };
  
  const appointments = generateMockAppointments(defaultFilter);
  return appointments.find(a => a.id === id) || null;
}

// ========================================================================
// APPOINTMENT MANAGEMENT
// ========================================================================

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
    
    /**
     * TEMPORARY DEV OVERRIDE
     * -------------------------------------------------------------
     * For UI testing we bypass the database and always return
     * deterministic mock data.  Remove this `return` when ready
     * to test against a real or local database again.
     */
    return generateMockAppointments(filter);

    /*  <-- keep for future DB testing
    try {
      const appointments = await prisma.appointment.findMany({
        where,
        include: {
          participants: true,
          createdBy: true
        },
        orderBy: { startTime: 'asc' }
      });
      return appointments.map(mapDbAppointmentToAppointment);
    } catch (dbError) {
      logger.warn('Database query failed, using mock appointment data', { filter, error: dbError });
      return generateMockAppointments(filter);
    }
    */
  } catch (error) {
    logger.error('Error getting appointments', { filter, error });
    throw new CalendarError(
      'Failed to get appointments',
      'GET_APPOINTMENTS_FAILED'
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
    /**
     * TEMPORARY DEV OVERRIDE
     * -------------------------------------------------------------
     * For UI testing we bypass the database and use mock data
     */
    const mockAppointment = findMockAppointmentById(id);
    if (mockAppointment) {
      return mockAppointment;
    }
    
    // If mock appointment not found, throw error
    throw new CalendarError(
      `Appointment with ID ${id} not found`,
      'APPOINTMENT_NOT_FOUND'
    );

    /* Keep for future DB testing
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
    */
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
 * Creates a new appointment
 * @param appointmentData Appointment data
 * @returns Created appointment
 */
export async function createAppointment(appointmentData: Omit<Appointment, 'id' | 'metadata'>): Promise<Appointment> {
  try {
    /**
     * TEMPORARY DEV OVERRIDE
     * -------------------------------------------------------------
     * For UI testing we bypass the database and simulate creating an appointment
     */
    // Generate a new unique ID
    const id = `mock-appt-new-${uuidv4().substring(0, 8)}`;
    
    // Create the appointment with current timestamps
    const now = new Date().toISOString();
    
    const newAppointment: Appointment = {
      ...appointmentData,
      id,
      metadata: {
        createdAt: now,
        updatedAt: now
      }
    };
    
    // Add to cache if it exists
    if (mockAppointmentsCache) {
      mockAppointmentsCache.appointments.push(newAppointment);
    }
    
    // Always add to user-created appointments array to ensure it persists across filter changes
    userCreatedAppointments.push(newAppointment);
    
    return newAppointment;

    /* Keep for future DB testing
    // Create the appointment in the database
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
    
    return mapDbAppointmentToAppointment(appointment);
    */
  } catch (error) {
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
    /**
     * TEMPORARY DEV OVERRIDE
     * -------------------------------------------------------------
     * For UI testing we bypass the database and simulate updating an appointment
     */
    // Find the appointment in mock data
    const existingAppointment = await getAppointment(id);
    
    // Update the appointment
    const updatedAppointment: Appointment = {
      ...existingAppointment,
      ...appointmentData,
      metadata: {
        ...existingAppointment.metadata,
        updatedAt: new Date().toISOString()
      }
    };
    
    // Update in cache if it exists
    if (mockAppointmentsCache) {
      const index = mockAppointmentsCache.appointments.findIndex(a => a.id === id);
      if (index !== -1) {
        mockAppointmentsCache.appointments[index] = updatedAppointment;
      }
    }
    
    // Update in userCreatedAppointments if it exists there
    const userCreatedIndex = userCreatedAppointments.findIndex(a => a.id === id);
    if (userCreatedIndex !== -1 || id.startsWith('mock-appt-new-')) {
      if (userCreatedIndex !== -1) {
        userCreatedAppointments[userCreatedIndex] = updatedAppointment;
      } else {
        // If this is a user-created appointment but not in the array yet, add it
        userCreatedAppointments.push(updatedAppointment);
      }
    }
    
    return updatedAppointment;

    /* Keep for future DB testing
    // Get the existing appointment
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
    
    // Update the appointment
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
    
    // Update participants if provided
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
    
    // Fetch the fully updated appointment with all relations
    const finalAppointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        participants: true,
        createdBy: true
      }
    });
    
    return mapDbAppointmentToAppointment(finalAppointment!);
    */
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
    /**
     * TEMPORARY DEV OVERRIDE
     * -------------------------------------------------------------
     * For UI testing we bypass the database and simulate cancelling an appointment
     */
    // Find the appointment in mock data
    const existingAppointment = await getAppointment(id);
    
    // Check if user has permission to cancel
    const isCreator = existingAppointment.createdBy.id === cancelledBy;
    const isParticipant = existingAppointment.participants.some(p => p.userId === cancelledBy);
    
    if (!isCreator && !isParticipant) {
      throw new CalendarError(
        'You do not have permission to cancel this appointment',
        'PERMISSION_DENIED'
      );
    }
    
    // Update the appointment with cancelled status
    const cancelledAppointment: Appointment = {
      ...existingAppointment,
      status: AppointmentStatus.CANCELLED,
      metadata: {
        ...existingAppointment.metadata,
        updatedAt: new Date().toISOString(),
        cancelledAt: new Date().toISOString(),
        cancelReason
      }
    };
    
    // Update in cache if it exists
    if (mockAppointmentsCache) {
      const index = mockAppointmentsCache.appointments.findIndex(a => a.id === id);
      if (index !== -1) {
        mockAppointmentsCache.appointments[index] = cancelledAppointment;
      }
    }
    
    // Update in userCreatedAppointments if it exists there
    const userCreatedIndex = userCreatedAppointments.findIndex(a => a.id === id);
    if (userCreatedIndex !== -1 || id.startsWith('mock-appt-new-')) {
      if (userCreatedIndex !== -1) {
        userCreatedAppointments[userCreatedIndex] = cancelledAppointment;
      } else {
        // If this is a user-created appointment but not in the array yet, add it
        userCreatedAppointments.push(cancelledAppointment);
      }
    }
    
    return cancelledAppointment;

    /* Keep for future DB testing
    // Get the existing appointment
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
    
    // Check if user has permission to cancel
    const isCreator = existingAppointment.createdById === cancelledBy;
    const isParticipant = existingAppointment.participants.some(p => p.userId === cancelledBy);
    
    if (!isCreator && !isParticipant) {
      throw new CalendarError(
        'You do not have permission to cancel this appointment',
        'PERMISSION_DENIED'
      );
    }
    
    // Cancel the appointment
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
    
    return mapDbAppointmentToAppointment(cancelledAppointment);
    */
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
    /**
     * TEMPORARY DEV OVERRIDE
     * -------------------------------------------------------------
     * For UI testing we bypass the database and simulate completing an appointment
     */
    // Find the appointment in mock data
    const existingAppointment = await getAppointment(id);
    
    // Check if user has permission to mark as complete
    const isCreator = existingAppointment.createdBy.id === completedBy;
    const isParticipant = existingAppointment.participants.some(p => p.userId === completedBy);
    
    if (!isCreator && !isParticipant) {
      throw new CalendarError(
        'You do not have permission to mark this appointment as complete',
        'PERMISSION_DENIED'
      );
    }
    
    // Update the appointment with completed status
    const completedAppointment: Appointment = {
      ...existingAppointment,
      status: AppointmentStatus.COMPLETED,
      metadata: {
        ...existingAppointment.metadata,
        updatedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        completionNotes
      }
    };
    
    // Update in cache if it exists
    if (mockAppointmentsCache) {
      const index = mockAppointmentsCache.appointments.findIndex(a => a.id === id);
      if (index !== -1) {
        mockAppointmentsCache.appointments[index] = completedAppointment;
      }
    }
    
    // Update in userCreatedAppointments if it exists there
    const userCreatedIndex = userCreatedAppointments.findIndex(a => a.id === id);
    if (userCreatedIndex !== -1 || id.startsWith('mock-appt-new-')) {
      if (userCreatedIndex !== -1) {
        userCreatedAppointments[userCreatedIndex] = completedAppointment;
      } else {
        // If this is a user-created appointment but not in the array yet, add it
        userCreatedAppointments.push(completedAppointment);
      }
    }
    
    return completedAppointment;

    /* Keep for future DB testing
    // Get the existing appointment
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
    
    // Check if user has permission to mark as complete
    const isCreator = existingAppointment.createdById === completedBy;
    const isParticipant = existingAppointment.participants.some(p => p.userId === completedBy);
    
    if (!isCreator && !isParticipant) {
      throw new CalendarError(
        'You do not have permission to mark this appointment as complete',
        'PERMISSION_DENIED'
      );
    }
    
    // Mark the appointment as complete
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
    
    return mapDbAppointmentToAppointment(completedAppointment);
    */
  } catch (error) {
    if (error instanceof CalendarError) {
      throw error;
    }
    
    logger.error('Error completing appointment', { id, completionNotes, completedBy, error });
    throw new CalendarError(
      `Failed to complete appointment ${id}`,
      'COMPLETE_APPOINTMENT_FAILED'
    );
  }
}

/**
 * Converts an appointment to a calendar event for UI display
 * @param appointment Appointment to convert
 * @returns Calendar event
 */
export function appointmentToCalendarEvent(appointment: Appointment): CalendarEvent {
  // Get color scheme based on appointment type and status
  const colors = getAppointmentColors(appointment.type, appointment.status);
  
  return {
    id: appointment.id,
    title: appointment.title,
    start: appointment.startTime,
    end: appointment.endTime,
    allDay: false,
    backgroundColor: colors.backgroundColor,
    borderColor: colors.borderColor,
    textColor: colors.textColor,
    extendedProps: {
      type: appointment.type,
      status: appointment.status,
      description: appointment.description,
      location: appointment.location,
      participants: appointment.participants,
      createdBy: appointment.createdBy,
      notes: appointment.notes,
      metadata: appointment.metadata
    }
  };
}

/**
 * Gets color scheme for an appointment based on type and status
 */
function getAppointmentColors(
  type: AppointmentType,
  status: AppointmentStatus
): { backgroundColor: string; borderColor: string; textColor: string; color: string } {
  // Type color definitions
  const typeColors: Record<AppointmentType, { bg: string, border: string, text: string }> = {
    [AppointmentType.CARE_EVALUATION]: { 
      bg: '#e3f2fd', border: '#2196f3', text: '#0d47a1' 
    },
    [AppointmentType.FACILITY_TOUR]: { 
      bg: '#e8f5e9', border: '#4caf50', text: '#1b5e20' 
    },
    [AppointmentType.CAREGIVER_SHIFT]: { 
      bg: '#f3e5f5', border: '#9c27b0', text: '#4a148c' 
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
  const statusColors: Record<AppointmentStatus, { bg: string, border: string, text: string, status: string }> = {
    [AppointmentStatus.PENDING]: { 
      bg: '#fff8e1', border: '#ffc107', text: '#ff6f00', status: '#ff6f00' 
    },
    [AppointmentStatus.CONFIRMED]: { 
      bg: '', border: '', text: '', status: '#43a047' 
    },
    [AppointmentStatus.CANCELLED]: { 
      bg: '#f5f5f5', border: '#9e9e9e', text: '#424242', status: '#d32f2f' 
    },
    [AppointmentStatus.COMPLETED]: { 
      bg: '', border: '', text: '', status: '#1976d2' 
    },
    [AppointmentStatus.NO_SHOW]: { 
      bg: '#fafafa', border: '#f44336', text: '#b71c1c', status: '#b71c1c' 
    },
    [AppointmentStatus.RESCHEDULED]: { 
      bg: '#e1f5fe', border: '#03a9f4', text: '#01579b', status: '#0288d1' 
    }
  };
  
  // Get base colors from type
  const baseColors = typeColors[type];
  
  // Apply status modifiers if needed
  const statusModifiers = statusColors[status];
  
  // For cancelled or no-show, use status colors instead of type colors
  const useStatusColors = status === AppointmentStatus.CANCELLED || 
                          status === AppointmentStatus.NO_SHOW;
  
  return {
    color: baseColors.border,
    backgroundColor: useStatusColors ? statusModifiers.bg : baseColors.bg,
    borderColor: useStatusColors ? statusModifiers.border : baseColors.border,
    textColor: useStatusColors ? statusModifiers.text : baseColors.text
  };
}

// Export all public functions
export {
  // These functions are already exported above
  // getAppointments,
  // getAppointment,
  // createAppointment,
  // updateAppointment,
  // cancelAppointment,
  // completeAppointment,
  // appointmentToCalendarEvent,
  // formatDate,
  // doSlotsOverlap,
  // getSlotDuration
};
