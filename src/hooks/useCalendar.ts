/**
 * Calendar Hook
 * 
 * A comprehensive React hook for interacting with the CareLinkAI calendar system.
 * Provides functions for managing appointments, checking availability,
 * and handling calendar-related operations with proper state management.
 * 
 * @module hooks/useCalendar
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { format, parseISO, isAfter, isBefore } from 'date-fns';

import { AppointmentType, AppointmentStatus } from '@/lib/types/calendar';
import { getMockAppointments, filterMockAppointments } from '@/lib/mock/calendar';
import type {
  Appointment,
  CalendarEvent,
  CalendarFilter,
  TimeSlot,
  AvailabilitySlot,
  BookingRequest,
  BookingResponse,
  RecurrencePattern
} from '@/lib/types/calendar';

/**
 * Interface for calendar hook state
 */
interface CalendarState {
  appointments: Appointment[];
  events: CalendarEvent[];
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isCancelling: boolean;
  isCheckingAvailability: boolean;
  error: string | null;
}

/**
 * Interface for calendar hook return value
 */
interface CalendarHook {
  // State
  appointments: Appointment[];
  events: CalendarEvent[];
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isCancelling: boolean;
  isCheckingAvailability: boolean;
  error: string | null;
  
  // Filter state
  filter: CalendarFilter;
  setFilter: (filter: Partial<CalendarFilter>) => void;
  
  // Appointment functions
  fetchAppointments: (filter?: Partial<CalendarFilter>) => Promise<Appointment[]>;
  getAppointment: (id: string) => Promise<Appointment | null>;
  createAppointment: (data: Omit<Appointment, 'id' | 'metadata' | 'createdBy'>) => Promise<Appointment | null>;
  updateAppointment: (
    id: string, 
    data: Partial<Appointment>, 
    updateMode?: 'THIS_ONLY' | 'THIS_AND_FUTURE' | 'ALL'
  ) => Promise<Appointment | null>;
  cancelAppointment: (
    id: string, 
    reason?: string, 
    cancelMode?: 'THIS_ONLY' | 'THIS_AND_FUTURE' | 'ALL'
  ) => Promise<Appointment | null>;
  completeAppointment: (id: string, notes?: string) => Promise<Appointment | null>;
  
  // Booking functions
  bookAppointment: (request: Omit<BookingRequest, 'requestedBy'>) => Promise<BookingResponse>;
  
  // Availability functions
  checkAvailability: (
    userId: string, 
    slot: TimeSlot, 
    appointmentType: AppointmentType,
    homeId?: string
  ) => Promise<{ isAvailable: boolean; conflicts?: Appointment[] }>;
  findAvailableSlots: (
    userId: string,
    startDate: Date,
    endDate: Date,
    appointmentType: AppointmentType,
    duration?: number,
    homeId?: string,
    options?: {
      excludeWeekends?: boolean;
      businessHoursOnly?: boolean;
      timezone?: string;
    }
  ) => Promise<{
    availableSlots: TimeSlot[];
    slotsByDay: Record<string, TimeSlot[]>;
  }>;
  
  // Utility functions
  refreshCalendar: () => Promise<void>;
  getEventById: (eventId: string) => CalendarEvent | undefined;
  getAppointmentById: (appointmentId: string) => Appointment | undefined;
  convertToEvents: (appointments: Appointment[]) => CalendarEvent[];
  formatAppointmentTime: (appointment: Appointment) => string;
  formatAppointmentDate: (appointment: Appointment) => string;
  getAppointmentStatusText: (status: AppointmentStatus) => string;
  getAppointmentTypeText: (type: AppointmentType) => string;
}

/**
 * Custom hook for calendar functionality
 */
export function useCalendar(): CalendarHook {
  const { data: session } = useSession();
  
  // State
  const [state, setState] = useState<CalendarState>({
    appointments: [],
    events: [],
    isLoading: false,
    isCreating: false,
    isUpdating: false,
    isCancelling: false,
    isCheckingAvailability: false,
    error: null
  });
  
  // Filter state
  const [filter, setFilterState] = useState<CalendarFilter>({
    dateRange: {
      start: new Date().toISOString(),
      end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
    },
    // Default to an empty array so admins (and others) see all appointments
    participantIds: []
  });
  
  // Update filter with partial changes
  const setFilter = useCallback((partialFilter: Partial<CalendarFilter>) => {
    setFilterState(prevFilter => ({
      ...prevFilter,
      ...partialFilter
    }));
  }, []);

  // Convert appointments to calendar events
  const convertToEvents = useCallback((appointments: Appointment[]): CalendarEvent[] => {
    return appointments.map(appointment => {
      // Determine colors based on appointment type and status
      let backgroundColor = '#e3f2fd';
      let borderColor = '#2196f3';
      let textColor = '#0d47a1';
      
      // Set colors based on appointment type
      switch (appointment.type) {
        case AppointmentType.CARE_EVALUATION:
          backgroundColor = '#e3f2fd';
          borderColor = '#2196f3';
          textColor = '#0d47a1';
          break;
        case AppointmentType.FACILITY_TOUR:
          backgroundColor = '#e8f5e9';
          borderColor = '#4caf50';
          textColor = '#1b5e20';
          break;
        case AppointmentType.CAREGIVER_SHIFT:
          backgroundColor = '#ede7f6';
          borderColor = '#673ab7';
          textColor = '#311b92';
          break;
        case AppointmentType.FAMILY_VISIT:
          backgroundColor = '#fff3e0';
          borderColor = '#ff9800';
          textColor = '#e65100';
          break;
        case AppointmentType.CONSULTATION:
          backgroundColor = '#f3e5f5';
          borderColor = '#9c27b0';
          textColor = '#4a148c';
          break;
        case AppointmentType.MEDICAL_APPOINTMENT:
          backgroundColor = '#ffebee';
          borderColor = '#f44336';
          textColor = '#b71c1c';
          break;
        case AppointmentType.ADMIN_MEETING:
          backgroundColor = '#e0f2f1';
          borderColor = '#009688';
          textColor = '#004d40';
          break;
        case AppointmentType.SOCIAL_EVENT:
          backgroundColor = '#f1f8e9';
          borderColor = '#8bc34a';
          textColor = '#33691e';
          break;
      }
      
      // Modify colors based on status
      if (appointment.status === AppointmentStatus.CANCELLED) {
        backgroundColor = '#f5f5f5';
        borderColor = '#9e9e9e';
        textColor = '#424242';
      } else if (appointment.status === AppointmentStatus.PENDING) {
        backgroundColor = '#fff8e1';
        borderColor = '#ffc107';
        textColor = '#ff6f00';
      } else if (appointment.status === AppointmentStatus.NO_SHOW) {
        backgroundColor = '#fafafa';
        borderColor = '#f44336';
        textColor = '#b71c1c';
      }
      
      // Create the calendar event
      return {
        id: appointment.id,
        title: appointment.title,
        start: appointment.startTime,
        end: appointment.endTime,
        allDay: false,
        color: borderColor,
        backgroundColor,
        borderColor,
        textColor,
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
            statusColor: getStatusColor(appointment.status)
          }
        }
      };
    });
  }, []);
  
  // Fetch appointments based on filter
  const fetchAppointments = useCallback(async (
    partialFilter?: Partial<CalendarFilter>
  ): Promise<Appointment[]> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Apply any new filter changes
      const currentFilter = partialFilter 
        ? { ...filter, ...partialFilter }
        : filter;
      
      // Check runtime mock mode first
      // Calendar shows mock data if either:
      // 1. General mock mode is enabled (show: true)
      // 2. Marketplace mocks are enabled (showMarketplace: true) - since calendar shares similar mock data needs
      try {
        const mockRes = await fetch('/api/runtime/mocks', { cache: 'no-store', credentials: 'include' as RequestCredentials });
        if (mockRes.ok) {
          const mj = await mockRes.json();
          if (mj?.show || mj?.showMarketplace) {
            const all = getMockAppointments();
            const filtered = filterMockAppointments(all, currentFilter);
            setState(prev => ({
              ...prev,
              appointments: filtered,
              events: convertToEvents(filtered),
              isLoading: false,
            }));
            return filtered;
          }
        }
      } catch {}
      
      // Build query string from filter
      const params = new URLSearchParams();
      
      if (currentFilter.dateRange) {
        params.append('startDate', currentFilter.dateRange.start);
        params.append('endDate', currentFilter.dateRange.end);
      }
      
      if (currentFilter.appointmentTypes?.length) {
        currentFilter.appointmentTypes.forEach(type => {
          params.append('type', type);
        });
      }
      
      if (currentFilter.status?.length) {
        currentFilter.status.forEach(status => {
          params.append('status', status);
        });
      }
      
      if (currentFilter.homeIds?.length && currentFilter.homeIds[0]) {
        params.append('homeId', currentFilter.homeIds[0]);
      }
      
      if (currentFilter.residentIds?.length && currentFilter.residentIds[0]) {
        params.append('residentId', currentFilter.residentIds[0]);
      }
      
      if (currentFilter.participantIds?.length && currentFilter.participantIds[0]) {
        params.append('participantId', currentFilter.participantIds[0]);
      }
      
      if (currentFilter.searchText) {
        params.append('search', currentFilter.searchText);
      }
      
      // Make API request
      const response = await fetch(`/api/calendar/appointments?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch appointments');
      }
      
      const data = await response.json();
      
      // Update state with fetched appointments
      setState(prev => ({ 
        ...prev, 
        appointments: data.data,
        events: convertToEvents(data.data),
        isLoading: false 
      }));
      
      return data.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));
      toast.error(`Failed to load appointments: ${errorMessage}`);
      return [];
    }
  }, [filter, convertToEvents]);
  
  // Refresh calendar data
  const refreshCalendar = useCallback(async () => {
    await fetchAppointments();
  }, [fetchAppointments]);

  // Get a single appointment by ID
  const getAppointment = useCallback(async (id: string): Promise<Appointment | null> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await fetch(`/api/calendar/appointments?id=${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch appointment');
      }
      
      const data = await response.json();
      setState(prev => ({ ...prev, isLoading: false }));
      return data.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));
      toast.error(`Failed to load appointment: ${errorMessage}`);
      return null;
    }
  }, []);
  
  // Create a new appointment
  const createAppointment = useCallback(async (
    data: Omit<Appointment, 'id' | 'metadata' | 'createdBy'>
  ): Promise<Appointment | null> => {
    try {
      setState(prev => ({ ...prev, isCreating: true, error: null }));
      
      const response = await fetch('/api/calendar/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create appointment');
      }
      
      const responseData = await response.json();
      
      // Add the new appointment to state
      setState(prev => {
        const newAppointment = responseData.data;
        const updatedAppointments = [...prev.appointments, newAppointment];
        return { 
          ...prev, 
          appointments: updatedAppointments,
          events: convertToEvents(updatedAppointments),
          isCreating: false 
        };
      });
      
      toast.success('Appointment created successfully');
      return responseData.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ 
        ...prev, 
        isCreating: false, 
        error: errorMessage 
      }));
      toast.error(`Failed to create appointment: ${errorMessage}`);
      return null;
    }
  }, [convertToEvents]);
  
  // Update an existing appointment
  const updateAppointment = useCallback(async (
    id: string,
    data: Partial<Appointment>,
    updateMode: 'THIS_ONLY' | 'THIS_AND_FUTURE' | 'ALL' = 'THIS_ONLY'
  ): Promise<Appointment | null> => {
    try {
      setState(prev => ({ ...prev, isUpdating: true, error: null }));
      
      const response = await fetch('/api/calendar/appointments', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id,
          ...data,
          updateMode
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update appointment');
      }
      
      const responseData = await response.json();
      
      // Update the appointment in state
      setState(prev => {
        const updatedAppointment = responseData.data;
        const updatedAppointments = prev.appointments.map(app => 
          app.id === id ? updatedAppointment : app
        );
        return { 
          ...prev, 
          appointments: updatedAppointments,
          events: convertToEvents(updatedAppointments),
          isUpdating: false 
        };
      });
      
      toast.success('Appointment updated successfully');
      
      // If it was a recurring update, refresh to get all updated instances
      if (updateMode !== 'THIS_ONLY') {
        refreshCalendar();
      }
      
      return responseData.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ 
        ...prev, 
        isUpdating: false, 
        error: errorMessage 
      }));
      toast.error(`Failed to update appointment: ${errorMessage}`);
      return null;
    }
  }, [convertToEvents, refreshCalendar]);
  
  // Cancel an appointment
  const cancelAppointment = useCallback(async (
    id: string,
    reason?: string,
    cancelMode: 'THIS_ONLY' | 'THIS_AND_FUTURE' | 'ALL' = 'THIS_ONLY'
  ): Promise<Appointment | null> => {
    try {
      setState(prev => ({ ...prev, isCancelling: true, error: null }));
      
      const response = await fetch(`/api/calendar/appointments?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason,
          cancelMode
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel appointment');
      }
      
      const responseData = await response.json();
      
      // Update the appointment in state
      setState(prev => {
        const cancelledAppointment = responseData.data;
        const updatedAppointments = prev.appointments.map(app => 
          app.id === id ? cancelledAppointment : app
        );
        return { 
          ...prev, 
          appointments: updatedAppointments,
          events: convertToEvents(updatedAppointments),
          isCancelling: false 
        };
      });
      
      toast.success('Appointment cancelled successfully');
      return responseData.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ 
        ...prev, 
        isCancelling: false, 
        error: errorMessage 
      }));
      toast.error(`Failed to cancel appointment: ${errorMessage}`);
      return null;
    }
  }, [convertToEvents]);
  
  // Mark an appointment as completed
  const completeAppointment = useCallback(async (
    id: string,
    notes?: string
  ): Promise<Appointment | null> => {
    try {
      setState(prev => ({ ...prev, isUpdating: true, error: null }));
      
      const response = await fetch('/api/calendar/appointments', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id,
          notes
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete appointment');
      }
      
      const responseData = await response.json();
      
      // Update the appointment in state
      setState(prev => {
        const completedAppointment = responseData.data;
        const updatedAppointments = prev.appointments.map(app => 
          app.id === id ? completedAppointment : app
        );
        return { 
          ...prev, 
          appointments: updatedAppointments,
          events: convertToEvents(updatedAppointments),
          isUpdating: false 
        };
      });
      
      toast.success('Appointment marked as completed');
      return responseData.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ 
        ...prev, 
        isUpdating: false, 
        error: errorMessage 
      }));
      toast.error(`Failed to complete appointment: ${errorMessage}`);
      return null;
    }
  }, [convertToEvents]);
  
  // Book an appointment (with availability check)
  const bookAppointment = useCallback(async (
    request: Omit<BookingRequest, 'requestedBy'>
  ): Promise<BookingResponse> => {
    try {
      setState(prev => ({ ...prev, isCreating: true, error: null }));
      
      const response = await fetch('/api/calendar/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to book appointment');
      }
      
      // If booking was successful, add the new appointment to state
      if (responseData.success && responseData.data) {
        setState(prev => {
          const newAppointment = responseData.data;
          const updatedAppointments = [...prev.appointments, newAppointment];
          return { 
            ...prev, 
            appointments: updatedAppointments,
            events: convertToEvents(updatedAppointments),
            isCreating: false 
          };
        });
        
        toast.success('Appointment booked successfully');
      } else {
        setState(prev => ({ ...prev, isCreating: false }));
        
        if (responseData.alternativeSlots?.length) {
          toast.error('Requested time is not available. Alternative times suggested.');
        } else {
          toast.error(responseData.error || 'Failed to book appointment');
        }
      }
      
      return responseData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ 
        ...prev, 
        isCreating: false, 
        error: errorMessage 
      }));
      toast.error(`Failed to book appointment: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }, [convertToEvents]);
  
  // Check if a user is available for a specific time slot
  const checkAvailability = useCallback(async (
    userId: string,
    slot: TimeSlot,
    appointmentType: AppointmentType,
    homeId?: string
  ): Promise<{ isAvailable: boolean; conflicts?: Appointment[] }> => {
    try {
      setState(prev => ({ ...prev, isCheckingAvailability: true, error: null }));
      
      const params = new URLSearchParams({
        userId,
        startTime: slot.startTime,
        endTime: slot.endTime,
        appointmentType
      });
      
      if (homeId) {
        params.append('homeId', homeId);
      }
      
      const response = await fetch(`/api/calendar/availability?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to check availability');
      }
      
      const data = await response.json();
      setState(prev => ({ ...prev, isCheckingAvailability: false }));
      
      return {
        isAvailable: data.data.isAvailable,
        conflicts: data.data.conflicts
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ 
        ...prev, 
        isCheckingAvailability: false, 
        error: errorMessage 
      }));
      toast.error(`Failed to check availability: ${errorMessage}`);
      
      return {
        isAvailable: false
      };
    }
  }, []);
  
  // Find available time slots for a user
  const findAvailableSlots = useCallback(async (
    userId: string,
    startDate: Date,
    endDate: Date,
    appointmentType: AppointmentType,
    duration: number = 60,
    homeId?: string,
    options?: {
      excludeWeekends?: boolean;
      businessHoursOnly?: boolean;
      timezone?: string;
    }
  ): Promise<{
    availableSlots: TimeSlot[];
    slotsByDay: Record<string, TimeSlot[]>;
  }> => {
    try {
      setState(prev => ({ ...prev, isCheckingAvailability: true, error: null }));
      
      const response = await fetch('/api/calendar/availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          appointmentType,
          duration,
          homeId,
          excludeWeekends: options?.excludeWeekends,
          businessHoursOnly: options?.businessHoursOnly,
          timezone: options?.timezone
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to find available slots');
      }
      
      const data = await response.json();
      setState(prev => ({ ...prev, isCheckingAvailability: false }));
      
      return {
        availableSlots: data.data.availableSlots,
        slotsByDay: data.data.slotsByDay
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ 
        ...prev, 
        isCheckingAvailability: false, 
        error: errorMessage 
      }));
      toast.error(`Failed to find available slots: ${errorMessage}`);
      
      return {
        availableSlots: [],
        slotsByDay: {}
      };
    }
  }, []);
  
  // Derive stable keys for effect dependencies
  const sessionUserId = session?.user?.id;
  const dateStart = filter.dateRange?.start;
  const dateEnd   = filter.dateRange?.end;
  const typesKey        = useMemo(() => (filter.appointmentTypes ?? []).join(','), [filter.appointmentTypes]);
  const statusKey       = useMemo(() => (filter.status ?? []).join(','), [filter.status]);
  const homeIdsKey      = useMemo(() => (filter.homeIds ?? []).join(','), [filter.homeIds]);
  const residentIdsKey  = useMemo(() => (filter.residentIds ?? []).join(','), [filter.residentIds]);
  const participantIdsKey = useMemo(() => (filter.participantIds ?? []).join(','), [filter.participantIds]);

  // Get an event by ID
  const getEventById = useCallback((eventId: string) => {
    return state.events.find(event => event.id === eventId);
  }, [state.events]);
  
  // Get an appointment by ID
  const getAppointmentById = useCallback((appointmentId: string) => {
    return state.appointments.find(appointment => appointment.id === appointmentId);
  }, [state.appointments]);
  
  
  // Format appointment time
  const formatAppointmentTime = useCallback((appointment: Appointment): string => {
    try {
      const start = parseISO(appointment.startTime);
      const end = parseISO(appointment.endTime);
      return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`;
    } catch (error) {
      return 'Invalid time';
    }
  }, []);
  
  // Format appointment date
  const formatAppointmentDate = useCallback((appointment: Appointment): string => {
    try {
      const date = parseISO(appointment.startTime);
      return format(date, 'EEEE, MMMM d, yyyy');
    } catch (error) {
      return 'Invalid date';
    }
  }, []);
  
  // Get human-readable appointment status
  const getAppointmentStatusText = useCallback((status: AppointmentStatus): string => {
    const statusMap: Record<AppointmentStatus, string> = {
      [AppointmentStatus.PENDING]: 'Pending',
      [AppointmentStatus.CONFIRMED]: 'Confirmed',
      [AppointmentStatus.CANCELLED]: 'Cancelled',
      [AppointmentStatus.COMPLETED]: 'Completed',
      [AppointmentStatus.NO_SHOW]: 'No Show',
      [AppointmentStatus.RESCHEDULED]: 'Rescheduled'
    };
    
    return statusMap[status] || 'Unknown';
  }, []);
  
  // Get human-readable appointment type
  const getAppointmentTypeText = useCallback((type: AppointmentType): string => {
    const typeMap: Record<AppointmentType, string> = {
      [AppointmentType.CARE_EVALUATION]: 'Care Evaluation',
      [AppointmentType.FACILITY_TOUR]: 'Facility Tour',
      [AppointmentType.CAREGIVER_SHIFT]: 'Caregiver Shift',
      [AppointmentType.FAMILY_VISIT]: 'Family Visit',
      [AppointmentType.CONSULTATION]: 'Consultation',
      [AppointmentType.MEDICAL_APPOINTMENT]: 'Medical Appointment',
      [AppointmentType.ADMIN_MEETING]: 'Admin Meeting',
      [AppointmentType.SOCIAL_EVENT]: 'Social Event'
    };
    
    return typeMap[type] || 'Unknown';
  }, []);
  
  // Helper function to get appointment icon
  function getAppointmentIcon(type: AppointmentType): string {
    const icons: Record<AppointmentType, string> = {
      [AppointmentType.CARE_EVALUATION]: 'clipboard-check',
      [AppointmentType.FACILITY_TOUR]: 'building',
      [AppointmentType.CAREGIVER_SHIFT]: 'user-nurse',
      [AppointmentType.FAMILY_VISIT]: 'users',
      [AppointmentType.CONSULTATION]: 'comments',
      [AppointmentType.MEDICAL_APPOINTMENT]: 'heartbeat',
      [AppointmentType.ADMIN_MEETING]: 'briefcase',
      [AppointmentType.SOCIAL_EVENT]: 'glass-cheers'
    };
    
    return icons[type] || 'calendar';
  }
  
  // Helper function to get status color
  function getStatusColor(status: AppointmentStatus): string {
    const statusColors: Record<AppointmentStatus, string> = {
      [AppointmentStatus.PENDING]: '#ff6f00',
      [AppointmentStatus.CONFIRMED]: '#43a047',
      [AppointmentStatus.CANCELLED]: '#d32f2f',
      [AppointmentStatus.COMPLETED]: '#1976d2',
      [AppointmentStatus.NO_SHOW]: '#b71c1c',
      [AppointmentStatus.RESCHEDULED]: '#0288d1'
    };
    
    return statusColors[status] || '#9e9e9e';
  }
  
  /**
   * Load appointments:
   *  • On initial mount (when a user session is available)
   *  • Whenever *meaningful* filter criteria change
   *
   * We intentionally avoid depending on the memoised `fetchAppointments`
   * callback itself (its identity changes any time `filter` mutates) to
   * prevent unnecessary extra fetch cycles that caused "cycling" data.
   *
   * NOTE: Arrays are converted to joined-string keys so React can do a
   * shallow comparison and avoid re-running when the content is unchanged.
   */
  useEffect(() => {
    if (!session?.user) return;

    fetchAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    sessionUserId,
    dateStart,
    dateEnd,
    typesKey,
    statusKey,
    homeIdsKey,
    residentIdsKey,
    participantIdsKey,
    filter.searchText
  ]);
  
  // Return the calendar hook interface
  return {
    // State
    appointments: state.appointments,
    events: state.events,
    isLoading: state.isLoading,
    isCreating: state.isCreating,
    isUpdating: state.isUpdating,
    isCancelling: state.isCancelling,
    isCheckingAvailability: state.isCheckingAvailability,
    error: state.error,
    
    // Filter state
    filter,
    setFilter,
    
    // Appointment functions
    fetchAppointments,
    getAppointment,
    createAppointment,
    updateAppointment,
    cancelAppointment,
    completeAppointment,
    
    // Booking functions
    bookAppointment,
    
    // Availability functions
    checkAvailability,
    findAvailableSlots,
    
    // Utility functions
    refreshCalendar,
    getEventById,
    getAppointmentById,
    convertToEvents,
    formatAppointmentTime,
    formatAppointmentDate,
    getAppointmentStatusText,
    getAppointmentTypeText
  };
}
