/**
 * Calendar & Scheduling System Type Definitions
 * 
 * This module contains all TypeScript type definitions for the CareLinkAI
 * calendar and scheduling system, including appointments, availability,
 * booking requests, and calendar UI interfaces.
 * 
 * @module types/calendar
 */

import { UserRole } from "@prisma/client";

/**
 * Types of appointments that can be scheduled in the system
 * @enum {string}
 */
export enum AppointmentType {
  /** Initial evaluation of care needs */
  CARE_EVALUATION = "CARE_EVALUATION",
  
  /** Tour of an assisted living facility */
  FACILITY_TOUR = "FACILITY_TOUR",
  
  /** Work shift for a caregiver */
  CAREGIVER_SHIFT = "CAREGIVER_SHIFT",
  
  /** Family member visiting a resident */
  FAMILY_VISIT = "FAMILY_VISIT",
  
  /** Consultation between family and staff */
  CONSULTATION = "CONSULTATION",
  
  /** Medical appointment for a resident */
  MEDICAL_APPOINTMENT = "MEDICAL_APPOINTMENT",
  
  /** Administrative meeting */
  ADMIN_MEETING = "ADMIN_MEETING",
  
  /** Social activity or event */
  SOCIAL_EVENT = "SOCIAL_EVENT"
}

/**
 * Status of an appointment
 * @enum {string}
 */
export enum AppointmentStatus {
  /** Appointment requested but not confirmed */
  PENDING = "PENDING",
  
  /** Appointment has been confirmed */
  CONFIRMED = "CONFIRMED",
  
  /** Appointment was cancelled */
  CANCELLED = "CANCELLED",
  
  /** Appointment has been completed */
  COMPLETED = "COMPLETED",
  
  /** Scheduled person did not show up */
  NO_SHOW = "NO_SHOW",
  
  /** Appointment rescheduled to another time */
  RESCHEDULED = "RESCHEDULED"
}

/**
 * Frequency patterns for recurring appointments
 * @enum {string}
 */
export enum RecurrenceFrequency {
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  BI_WEEKLY = "BI_WEEKLY",
  MONTHLY = "MONTHLY",
  YEARLY = "YEARLY",
  CUSTOM = "CUSTOM"
}

/**
 * Days of the week for availability and recurring appointments
 * @enum {string}
 */
export enum DayOfWeek {
  MONDAY = "MONDAY",
  TUESDAY = "TUESDAY",
  WEDNESDAY = "WEDNESDAY",
  THURSDAY = "THURSDAY",
  FRIDAY = "FRIDAY",
  SATURDAY = "SATURDAY",
  SUNDAY = "SUNDAY"
}

/**
 * Interface for a time slot with start and end times
 */
export interface TimeSlot {
  /** Start time in ISO format */
  startTime: string;
  
  /** End time in ISO format */
  endTime: string;
}

/**
 * Pattern for recurring appointments
 */
export interface RecurrencePattern {
  /** Frequency of recurrence */
  frequency: RecurrenceFrequency;
  
  /** Days of week when the appointment recurs (for WEEKLY frequency) */
  daysOfWeek?: DayOfWeek[];
  
  /** Day of month when the appointment recurs (for MONTHLY frequency) */
  dayOfMonth?: number;
  
  /** Month of year when the appointment recurs (for YEARLY frequency) */
  monthOfYear?: number;
  
  /** Date when the recurrence ends, if any */
  endDate?: string;
  
  /** Number of occurrences, if limited */
  occurrences?: number;
  
  /** Custom recurrence rule in iCalendar RRULE format */
  customRule?: string;
  
  /** Specific dates to exclude from the recurrence pattern */
  excludeDates?: string[];
}

/**
 * Comprehensive appointment interface
 */
export interface Appointment {
  /** Unique identifier */
  id: string;
  
  /** Type of appointment */
  type: AppointmentType;
  
  /** Current status */
  status: AppointmentStatus;
  
  /** Title of the appointment */
  title: string;
  
  /** Detailed description */
  description?: string;
  
  /** Start time in ISO format */
  startTime: string;
  
  /** End time in ISO format */
  endTime: string;
  
  /** Location information */
  location?: {
    /** Physical address or virtual meeting link */
    address?: string;
    
    /** Room or specific location within a facility */
    room?: string;
    
    /** Geographic coordinates */
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  
  /** Associated home ID if relevant */
  homeId?: string;
  
  /** Associated resident ID if relevant */
  residentId?: string;
  
  /** User who created the appointment */
  createdBy: {
    id: string;
    name: string;
    role: UserRole;
  };
  
  /** Participants in the appointment */
  participants: Array<{
    /** User ID */
    userId: string;
    
    /** Display name */
    name: string;
    
    /** User role */
    role: UserRole;
    
    /** Participation status */
    status: "PENDING" | "ACCEPTED" | "DECLINED" | "TENTATIVE";
    
    /** Optional notes from this participant */
    notes?: string;
  }>;
  
  /** For recurring appointments */
  recurrence?: RecurrencePattern;
  
  /** Reminder settings */
  reminders?: Array<{
    /** Time before appointment to send reminder (minutes) */
    minutesBefore: number;
    
    /** Reminder method */
    method: "EMAIL" | "SMS" | "PUSH" | "IN_APP";
    
    /** Whether the reminder has been sent */
    sent: boolean;
  }>;
  
  /** Notes or comments */
  notes?: string;
  
  /** Custom fields for specific appointment types */
  customFields?: Record<string, any>;
  
  /** Metadata */
  metadata: {
    createdAt: string;
    updatedAt: string;
    cancelledAt?: string;
    cancelReason?: string;
    completedAt?: string;
    completionNotes?: string;
  };
}

/**
 * Availability slot for scheduling
 */
export interface AvailabilitySlot {
  /** Unique identifier */
  id: string;
  
  /** User ID this availability belongs to */
  userId: string;
  
  /** User role */
  userRole: UserRole;
  
  /** Start time in ISO format */
  startTime: string;
  
  /** End time in ISO format */
  endTime: string;
  
  /** Whether this slot is available or blocked */
  isAvailable: boolean;
  
  /** For recurring availability */
  recurrence?: RecurrencePattern;
  
  /** Associated home ID if relevant (for operators/caregivers) */
  homeId?: string;
  
  /** Types of appointments this slot is available for */
  availableFor?: AppointmentType[];
  
  /** Notes about this availability */
  notes?: string;
  
  /** Buffer time before this slot (minutes) */
  bufferBefore?: number;
  
  /** Buffer time after this slot (minutes) */
  bufferAfter?: number;
}

/**
 * Calendar event for UI display
 */
export interface CalendarEvent {
  /** Unique identifier */
  id: string;
  
  /** Event title to display */
  title: string;
  
  /** Start time in ISO format */
  start: string;
  
  /** End time in ISO format */
  end: string;
  
  /** Whether the event spans the entire day */
  allDay?: boolean;
  
  /** URL for event details */
  url?: string;
  
  /** Event color for UI */
  color?: string;
  
  /** Text color for UI */
  textColor?: string;
  
  /** Background color for UI */
  backgroundColor?: string;
  
  /** Border color for UI */
  borderColor?: string;
  
  /** CSS classnames to apply */
  classNames?: string[];
  
  /** Whether the event is editable */
  editable?: boolean;
  
  /** Whether start time can be changed */
  startEditable?: boolean;
  
  /** Whether duration can be changed */
  durationEditable?: boolean;
  
  /** Display mode */
  display?: "auto" | "block" | "list-item" | "background" | "inverse-background" | "none";
  
  /** Associated appointment data */
  extendedProps: {
    /** Original appointment data */
    appointment: Appointment;
    
    /** Additional UI metadata */
    uiMeta?: {
      icon?: string;
      status?: string;
      statusColor?: string;
    };
  };
}

/**
 * Booking request for scheduling an appointment
 */
export interface BookingRequest {
  /** Type of appointment */
  type: AppointmentType;
  
  /** Title of the appointment */
  title: string;
  
  /** Detailed description */
  description?: string;
  
  /** Requested start time in ISO format */
  requestedStartTime: string;
  
  /** Requested end time in ISO format */
  requestedEndTime: string;
  
  /** Alternative time slots if primary is unavailable */
  alternativeTimeSlots?: TimeSlot[];
  
  /** Location details */
  location?: {
    address?: string;
    room?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  
  /** Associated home ID if relevant */
  homeId?: string;
  
  /** Associated resident ID if relevant */
  residentId?: string;
  
  /** User making the request */
  requestedBy: {
    id: string;
    name: string;
    role: UserRole;
  };
  
  /** Participants to invite */
  participants?: Array<{
    userId: string;
    name?: string;
    role?: UserRole;
    required: boolean;
  }>;
  
  /** For recurring appointments */
  recurrence?: RecurrencePattern;
  
  /** Reminder settings */
  reminders?: Array<{
    minutesBefore: number;
    method: "EMAIL" | "SMS" | "PUSH" | "IN_APP";
  }>;
  
  /** Notes or special requests */
  notes?: string;
  
  /** Custom fields for specific booking types */
  customFields?: Record<string, any>;
}

/**
 * Response to a booking request
 */
export interface BookingResponse {
  /** Whether the booking was successful */
  success: boolean;
  
  /** Created appointment if successful */
  appointment?: Appointment;
  
  /** Error message if unsuccessful */
  error?: string;
  
  /** Alternative available slots if requested slot unavailable */
  alternativeSlots?: AvailabilitySlot[];
  
  /** Conflicts with existing appointments */
  conflicts?: Appointment[];
}

/**
 * Calendar view configuration
 */
export interface CalendarViewConfig {
  /** Default view */
  defaultView: "month" | "week" | "day" | "agenda" | "timeline";
  
  /** First day of week (0 = Sunday, 1 = Monday, etc.) */
  firstDay: number;
  
  /** Business hours to highlight */
  businessHours: {
    daysOfWeek: number[];
    startTime: string;
    endTime: string;
  };
  
  /** Minimum time to display */
  minTime: string;
  
  /** Maximum time to display */
  maxTime: string;
  
  /** Slot duration for time grid */
  slotDuration: string;
  
  /** Snap duration for event resizing/moving */
  snapDuration: string;
  
  /** Whether weekends are displayed */
  showWeekends: boolean;
  
  /** Whether to show week numbers */
  showWeekNumbers: boolean;
  
  /** Whether to show all-day slot */
  showAllDaySlot: boolean;
}

/**
 * Calendar filtering options
 */
export interface CalendarFilter {
  /** Filter by appointment types */
  appointmentTypes?: AppointmentType[];
  
  /** Filter by status */
  status?: AppointmentStatus[];
  
  /** Filter by participant */
  participantIds?: string[];
  
  /** Filter by home */
  homeIds?: string[];
  
  /** Filter by resident */
  residentIds?: string[];
  
  /** Filter by date range */
  dateRange?: {
    start: string;
    end: string;
  };
  
  /** Search text */
  searchText?: string;
}

/**
 * Utility type for calendar date calculations
 */
export type DateRange = {
  start: Date;
  end: Date;
};

/**
 * Utility type for availability checking
 */
export type AvailabilityCheck = {
  userId: string;
  requestedSlot: TimeSlot;
  appointmentType: AppointmentType;
  homeId?: string;
  isAvailable: boolean;
  conflicts?: Appointment[];
};

/**
 * Calendar notification preferences
 */
export interface CalendarNotificationPreferences {
  /** User ID */
  userId: string;
  
  /** Email notification settings */
  email: {
    /** New appointment invitations */
    newAppointment: boolean;
    
    /** Appointment updates */
    appointmentUpdated: boolean;
    
    /** Appointment cancellations */
    appointmentCancelled: boolean;
    
    /** Appointment reminders */
    reminders: boolean;
    
    /** How many minutes before to send reminders */
    reminderTiming: number[];
  };
  
  /** SMS notification settings */
  sms: {
    /** New appointment invitations */
    newAppointment: boolean;
    
    /** Appointment updates */
    appointmentUpdated: boolean;
    
    /** Appointment cancellations */
    appointmentCancelled: boolean;
    
    /** Appointment reminders */
    reminders: boolean;
    
    /** How many minutes before to send reminders */
    reminderTiming: number[];
  };
  
  /** Push notification settings */
  push: {
    /** New appointment invitations */
    newAppointment: boolean;
    
    /** Appointment updates */
    appointmentUpdated: boolean;
    
    /** Appointment cancellations */
    appointmentCancelled: boolean;
    
    /** Appointment reminders */
    reminders: boolean;
    
    /** How many minutes before to send reminders */
    reminderTiming: number[];
  };
}
