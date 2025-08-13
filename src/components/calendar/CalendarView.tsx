/**
 * Calendar View Component
 * 
 * A comprehensive calendar UI component using FullCalendar.
 * Features include multiple view options, appointment creation/editing,
 * drag and drop functionality, filters, and responsive design.
 * 
 * @module components/calendar/CalendarView
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { format, parseISO, addMinutes } from 'date-fns';
import { toast } from 'react-hot-toast';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle, Transition } from '@headlessui/react';
import { useCalendar } from '@/hooks/useCalendar';
import { 
  FiPlus, FiFilter, FiSearch, FiCalendar, FiClock, FiMapPin, 
  FiUsers, FiX, FiCheck, FiEdit, FiTrash2, FiRefreshCw, 
  FiAlertCircle, FiChevronDown, FiChevronUp, FiGrid, FiList,
  FiMenu, FiMoreVertical, FiSave, FiInfo
} from 'react-icons/fi';

// Import FullCalendar and plugins
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';

// Import types
import {
  AppointmentType,
  AppointmentStatus,
  RecurrenceFrequency,
} from '@/lib/types/calendar';
import type {
  Appointment,
  CalendarEvent,
  BookingRequest,
  RecurrencePattern,
} from '@/lib/types/calendar';
import { UserRole } from '@prisma/client';

// Calendar view options
type CalendarViewOption = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek';

// Props for the CalendarView component
interface CalendarViewProps {
  defaultView?: CalendarViewOption;
  height?: string | number;
  showHeader?: boolean;
  showFilters?: boolean;
  showSearch?: boolean;
  showToolbar?: boolean;
  homeId?: string;
  residentId?: string;
  userId?: string;
  onEventClick?: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
  onViewChange?: (view: CalendarViewOption) => void;
  className?: string;
  // Filter props
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  typeFilters?: AppointmentType[];
  onTypeFiltersChange?: (types: AppointmentType[]) => void;
  statusFilters?: AppointmentStatus[];
  onStatusFiltersChange?: (statuses: AppointmentStatus[]) => void;
  /**
   * Callback fired any time calendar data (appointments) mutates
   * so that parent components can immediately refresh dependent UI
   * (e.g., the Upcoming-Appointments sidebar).
   */
  onDataChange?: () => void;
}

/**
 * Calendar View Component
 */
export default function CalendarView({
  defaultView = 'dayGridMonth',
  height = 'auto',
  showHeader = true,
  showFilters = true,
  showSearch = true,
  showToolbar = true,
  homeId,
  residentId,
  userId,
  onEventClick,
  onDateClick,
  onViewChange,
  className = '',
  // Filter props
  searchQuery: propSearchQuery,
  onSearchChange,
  typeFilters: propTypeFilters,
  onTypeFiltersChange,
  statusFilters: propStatusFilters,
  onStatusFiltersChange,
  onDataChange,
}: CalendarViewProps) {
  // Get session for user info
  const { data: session } = useSession();
  
  // Calendar hook - use this for all data operations
  const {
    appointments,
    events,
    isLoading,
    isCreating,
    isUpdating,
    isCancelling,
    error,
    filter,
    setFilter,
    fetchAppointments,
    createAppointment,
    updateAppointment,
    cancelAppointment,
    completeAppointment,
    bookAppointment,
    checkAvailability,
    findAvailableSlots,
    refreshCalendar,
    getEventById,
    getAppointmentById,
    formatAppointmentTime,
    formatAppointmentDate,
    getAppointmentStatusText,
    getAppointmentTypeText
  } = useCalendar();
  
  // Refs
  const calendarRef = useRef<any>(null);
  
  // State
  const [currentView, setCurrentView] = useState<CalendarViewOption>(defaultView);
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState<{x: number, y: number} | null>(null);
  const [contextMenuEvent, setContextMenuEvent] = useState<CalendarEvent | null>(null);
  
  // Form state for creating/editing appointments
  const [appointmentForm, setAppointmentForm] = useState<Partial<Appointment>>({
    type: AppointmentType.CONSULTATION,
    title: '',
    description: '',
    startTime: new Date().toISOString(),
    endTime: addMinutes(new Date(), 60).toISOString(),
    status: AppointmentStatus.CONFIRMED,
    participants: [],
    location: {
      address: ''
    }
  });
  
  // Filter state - use internal state when props aren't provided
  const [internalTypeFilters, setInternalTypeFilters] = useState<AppointmentType[]>([]);
  const [internalStatusFilters, setInternalStatusFilters] = useState<AppointmentStatus[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Determine which filter values to use (props or internal)
  const searchQuery = propSearchQuery !== undefined ? propSearchQuery : internalSearchQuery;
  const typeFilters = propTypeFilters || internalTypeFilters;
  const statusFilters = propStatusFilters || internalStatusFilters;
  
  // Check if mobile on mount and window resize
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);
  
  // Apply filters when they change
  useEffect(() => {
    setFilter({
      appointmentTypes: typeFilters.length > 0 ? typeFilters : undefined,
      status: statusFilters.length > 0 ? statusFilters : undefined,
      homeIds: homeId ? [homeId] : undefined,
      residentIds: residentId ? [residentId] : undefined,
      participantIds: userId ? [userId] : undefined,
      searchText: searchQuery || undefined
    });
  }, [typeFilters, statusFilters, homeId, residentId, userId, searchQuery, setFilter]);
  
  // Set initial filter based on props
  useEffect(() => {
    const initialFilter: any = {};
    
    if (homeId) {
      initialFilter.homeIds = [homeId];
    }
    
    if (residentId) {
      initialFilter.residentIds = [residentId];
    }
    
    if (userId) {
      initialFilter.participantIds = [userId];
    } else if (session?.user?.id) {
      initialFilter.participantIds = [session.user.id];
    }
    
    setFilter(initialFilter);
  }, [homeId, residentId, userId, session?.user?.id, setFilter]);
  
  // Handle calendar view change
  const handleViewChange = useCallback((view: CalendarViewOption) => {
    setCurrentView(view);
    if (onViewChange) {
      onViewChange(view);
    }
    
    // Update the calendar's view
    if (calendarRef.current) {
      calendarRef.current.getApi().changeView(view);
    }
  }, [onViewChange]);
  
  // Handle date click
  const handleDateClick = useCallback((arg: any) => {
    const clickedDate = new Date(arg.date);
    setSelectedDate(clickedDate);
    
    // Set default appointment times
    const startTime = new Date(clickedDate);
    startTime.setHours(9, 0, 0, 0); // Default to 9 AM
    
    const endTime = new Date(clickedDate);
    endTime.setHours(10, 0, 0, 0); // Default to 10 AM (1 hour duration)
    
    // Reset form with default values
    setAppointmentForm({
      type: AppointmentType.CONSULTATION,
      title: '',
      description: '',
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      status: AppointmentStatus.CONFIRMED,
      participants: [],
      location: {
        address: ''
      },
      homeId: homeId,
      residentId: residentId
    });
    
    setIsEditMode(false);
    setIsAppointmentModalOpen(true);
    
    if (onDateClick) {
      onDateClick(clickedDate);
    }
  }, [onDateClick, homeId, residentId]);
  
  // Handle event click
  const handleEventClick = useCallback((arg: any) => {
    const eventId = arg.event.id;
    const event = getEventById(eventId);
    
    if (event) {
      setSelectedEvent(event);
      setIsDetailsModalOpen(true);
      
      if (onEventClick) {
        onEventClick(event);
      }
    }
  }, [getEventById, onEventClick]);
  
  // Handle event drag
  const handleEventDrop = useCallback(async (arg: any) => {
    const eventId = arg.event.id;
    const event = getEventById(eventId);
    
    if (!event) return;
    
    const appointment = event.extendedProps.appointment;
    
    // Don't allow dragging cancelled or completed appointments
    if (appointment.status === AppointmentStatus.CANCELLED || 
        appointment.status === AppointmentStatus.COMPLETED) {
      arg.revert();
      toast.error("Cannot reschedule cancelled or completed appointments");
      return;
    }
    
    // Calculate new times
    const newStartTime = arg.event.start.toISOString();
    const newEndTime = arg.event.end ? arg.event.end.toISOString() : 
      addMinutes(new Date(newStartTime), 60).toISOString();
    
    try {
      // Check availability before updating
      const availabilityCheck = await checkAvailability(
        appointment.createdBy.id,
        { startTime: newStartTime, endTime: newEndTime },
        appointment.type,
        appointment.homeId
      );
      
      if (!availabilityCheck.isAvailable) {
        arg.revert();
        toast.error("This time slot is not available");
        return;
      }
      
      // Update the appointment
      await updateAppointment(appointment.id, {
        startTime: newStartTime,
        endTime: newEndTime
      });
      
      toast.success("Appointment rescheduled successfully");
    } catch (error) {
      arg.revert();
      toast.error("Failed to reschedule appointment");
    }
  }, [getEventById, checkAvailability, updateAppointment]);
  
  // Handle event resize
  const handleEventResize = useCallback(async (arg: any) => {
    const eventId = arg.event.id;
    const event = getEventById(eventId);
    
    if (!event) return;
    
    const appointment = event.extendedProps.appointment;
    
    // Don't allow resizing cancelled or completed appointments
    if (appointment.status === AppointmentStatus.CANCELLED || 
        appointment.status === AppointmentStatus.COMPLETED) {
      arg.revert();
      toast.error("Cannot modify cancelled or completed appointments");
      return;
    }
    
    // Calculate new times
    const newStartTime = arg.event.start.toISOString();
    const newEndTime = arg.event.end.toISOString();
    
    try {
      // Check availability before updating
      const availabilityCheck = await checkAvailability(
        appointment.createdBy.id,
        { startTime: newStartTime, endTime: newEndTime },
        appointment.type,
        appointment.homeId
      );
      
      if (!availabilityCheck.isAvailable) {
        arg.revert();
        toast.error("This time slot is not available");
        return;
      }
      
      // Update the appointment
      await updateAppointment(appointment.id, {
        startTime: newStartTime,
        endTime: newEndTime
      });
      
      toast.success("Appointment duration updated successfully");
    } catch (error) {
      arg.revert();
      toast.error("Failed to update appointment duration");
    }
  }, [getEventById, checkAvailability, updateAppointment]);
  
  // Handle right-click on event (context menu)
  const handleEventRightClick = useCallback((arg: any) => {
    arg.jsEvent.preventDefault();
    
    const eventId = arg.event.id;
    const event = getEventById(eventId);
    
    if (event) {
      setContextMenuEvent(event);
      setContextMenuPosition({
        x: arg.jsEvent.clientX,
        y: arg.jsEvent.clientY
      });
    }
  }, [getEventById]);
  
  // Close context menu when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenuPosition(null);
      setContextMenuEvent(null);
    };
    
    if (contextMenuPosition) {
      document.addEventListener('click', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [contextMenuPosition]);
  
  // Handle appointment form submission
  const handleAppointmentSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isEditMode && selectedEvent) {
        // Update existing appointment
        const appointment = selectedEvent.extendedProps.appointment;
        await updateAppointment(appointment.id, appointmentForm);
        toast.success("Appointment updated successfully");
      } else {
        // Create new appointment
        const newAppointment = await createAppointment({
          ...appointmentForm as Omit<Appointment, 'id' | 'metadata' | 'createdBy'>,
          status: AppointmentStatus.CONFIRMED
        });
        
        if (newAppointment) {
          toast.success("Appointment created successfully");
        }
      }
      
      setIsAppointmentModalOpen(false);
      await refreshCalendar();
      // Notify parent that data has changed
      onDataChange?.();
    } catch (error) {
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} appointment`);
    }
  }, [appointmentForm, isEditMode, selectedEvent, updateAppointment, createAppointment, refreshCalendar]);
  
  // Handle appointment cancellation
  const handleCancelAppointment = useCallback(async () => {
    if (!selectedEvent) return;
    
    try {
      const appointment = selectedEvent.extendedProps.appointment;
      await cancelAppointment(appointment.id, deleteReason);
      toast.success("Appointment cancelled successfully");
      setIsDeleteModalOpen(false);
      setIsDetailsModalOpen(false);
      await refreshCalendar();
      onDataChange?.();
    } catch (error) {
      toast.error("Failed to cancel appointment");
    }
  }, [selectedEvent, deleteReason, cancelAppointment, refreshCalendar]);
  
  // Handle appointment completion
  const handleCompleteAppointment = useCallback(async () => {
    if (!selectedEvent) return;
    
    try {
      const appointment = selectedEvent.extendedProps.appointment;
      await completeAppointment(appointment.id, "Marked as completed");
      toast.success("Appointment marked as completed");
      setIsDetailsModalOpen(false);
      await refreshCalendar();
      onDataChange?.();
    } catch (error) {
      toast.error("Failed to mark appointment as completed");
    }
  }, [selectedEvent, completeAppointment, refreshCalendar]);
  
  // Handle edit button click
  const handleEditClick = useCallback(() => {
    if (!selectedEvent) return;
    
    const appointment = selectedEvent.extendedProps.appointment;
    
    setAppointmentForm({
      type: appointment.type,
      title: appointment.title,
      description: appointment.description,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      status: appointment.status,
      participants: appointment.participants,
      location: appointment.location,
      homeId: appointment.homeId,
      residentId: appointment.residentId,
      notes: appointment.notes,
      customFields: appointment.customFields
    });
    
    setIsEditMode(true);
    setIsDetailsModalOpen(false);
    setIsAppointmentModalOpen(true);
  }, [selectedEvent]);
  
  // Handle search input - use parent handler if provided, otherwise use internal
  const handleSearchInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (onSearchChange) {
      onSearchChange(newValue);
    } else {
      setInternalSearchQuery(newValue);
      // Directly update based on current `filter`
      setFilter({
        ...filter,
        searchText: newValue || undefined,
      });
      fetchAppointments();
    }
  }, [onSearchChange, setFilter, fetchAppointments]);
  
  // Handle filter toggle - use parent handler if provided, otherwise use internal
  const handleFilterToggle = useCallback((type: AppointmentType) => {
    if (onTypeFiltersChange) {
      // Use parent handler
      const newFilters = typeFilters.includes(type)
        ? typeFilters.filter(t => t !== type)
        : [...typeFilters, type];
      onTypeFiltersChange(newFilters);
    } else {
      // Use internal state
      setInternalTypeFilters(prev => {
        const newFilters = prev.includes(type)
          ? prev.filter(t => t !== type)
          : [...prev, type];

        // Update using current `filter`
        setFilter({
          ...filter,
          appointmentTypes: newFilters.length > 0 ? newFilters : undefined,
        });
        
        fetchAppointments();
        return newFilters;
      });
    }
  }, [typeFilters, onTypeFiltersChange, setFilter, fetchAppointments]);
  
  // Handle status filter toggle - use parent handler if provided, otherwise use internal
  const handleStatusFilterToggle = useCallback((status: AppointmentStatus) => {
    if (onStatusFiltersChange) {
      // Use parent handler
      const newFilters = statusFilters.includes(status)
        ? statusFilters.filter(s => s !== status)
        : [...statusFilters, status];
      onStatusFiltersChange(newFilters);
    } else {
      // Use internal state
      setInternalStatusFilters(prev => {
        const newFilters = prev.includes(status)
          ? prev.filter(s => s !== status)
          : [...prev, status];

        setFilter({
          ...filter,
          status: newFilters.length > 0 ? newFilters : undefined,
        });
        
        fetchAppointments();
        return newFilters;
      });
    }
  }, [statusFilters, onStatusFiltersChange, setFilter, fetchAppointments]);

  // Handle clear all filters
  const handleClearFilters = useCallback(() => {
    if (onTypeFiltersChange) {
      onTypeFiltersChange([]);
    } else {
      setInternalTypeFilters([]);
      // use direct object update to satisfy strict setter signature
      setFilter({ ...filter, appointmentTypes: undefined });
    }
    
    if (onStatusFiltersChange) {
      onStatusFiltersChange([]);
    } else {
      setInternalStatusFilters([]);
      setFilter({ ...filter, status: undefined });
    }
    
    if (onSearchChange) {
      onSearchChange('');
    } else {
      setInternalSearchQuery('');
      setFilter({ ...filter, searchText: undefined });
    }
    
    // Fetch updated appointments if using internal state
    if (!onTypeFiltersChange || !onStatusFiltersChange || !onSearchChange) {
      fetchAppointments();
    }
  }, [onTypeFiltersChange, onStatusFiltersChange, onSearchChange, setFilter, fetchAppointments]);
  
  // Calendar options
  const calendarOptions = useMemo(() => ({
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin],
    initialView: currentView,
    headerToolbar: false, // We'll create our own toolbar
    events: events,
    editable: true,
    selectable: true,
    selectMirror: true,
    dayMaxEvents: true,
    weekends: true,
    dateClick: handleDateClick,
    eventClick: handleEventClick,
    eventDrop: handleEventDrop,
    eventResize: handleEventResize,
    eventDidMount: (info: any) => {
      // Add right-click event listener for context menu
      info.el.addEventListener('contextmenu', (e: MouseEvent) => {
        e.preventDefault();
        const eventId = info.event.id;
        const event = getEventById(eventId);
        
        if (event) {
          setContextMenuEvent(event);
          setContextMenuPosition({
            x: e.clientX,
            y: e.clientY
          });
        }
      });
    },
    height: height,
    contentHeight: typeof height === 'string' ? height : undefined,
    aspectRatio: 1.8,
    expandRows: true,
    stickyHeaderDates: true,
    nowIndicator: true,
    businessHours: {
      daysOfWeek: [1, 2, 3, 4, 5], // Monday - Friday
      startTime: '08:00',
      endTime: '18:00'
    },
    slotMinTime: '07:00',
    slotMaxTime: '21:00',
    slotDuration: '00:30:00',
    slotLabelInterval: '01:00',
    allDaySlot: false,
    eventTimeFormat: {
      hour: 'numeric',
      minute: '2-digit',
      meridiem: true
    } as const,
    views: {
      dayGridMonth: {
        titleFormat: { year: 'numeric', month: 'long' }
      },
      timeGridWeek: {
        titleFormat: { year: 'numeric', month: 'short', day: 'numeric' },
        slotLabelFormat: {
          hour: 'numeric',
          minute: '2-digit',
          meridiem: true
        } as const
      },
      timeGridDay: {
        titleFormat: { year: 'numeric', month: 'long', day: 'numeric' },
        slotLabelFormat: {
          hour: 'numeric',
          minute: '2-digit',
          meridiem: true
        } as const
      },
      listWeek: {
        titleFormat: { year: 'numeric', month: 'long' }
      }
    }
  }), [
    currentView, events, handleDateClick, handleEventClick, 
    handleEventDrop, handleEventResize, height, getEventById
  ]);
  
  // Appointment type options with colors
  const appointmentTypeOptions = useMemo(() => [
    { value: AppointmentType.CARE_EVALUATION, label: 'Care Evaluation', color: '#2196f3' },
    { value: AppointmentType.FACILITY_TOUR, label: 'Facility Tour', color: '#4caf50' },
    { value: AppointmentType.CAREGIVER_SHIFT, label: 'Caregiver Shift', color: '#673ab7' },
    { value: AppointmentType.FAMILY_VISIT, label: 'Family Visit', color: '#ff9800' },
    { value: AppointmentType.CONSULTATION, label: 'Consultation', color: '#9c27b0' },
    { value: AppointmentType.MEDICAL_APPOINTMENT, label: 'Medical Appointment', color: '#f44336' },
    { value: AppointmentType.ADMIN_MEETING, label: 'Admin Meeting', color: '#009688' },
    { value: AppointmentType.SOCIAL_EVENT, label: 'Social Event', color: '#8bc34a' }
  ], []);
  
  // Appointment status options with colors
  const appointmentStatusOptions = useMemo(() => [
    { value: AppointmentStatus.PENDING, label: 'Pending', color: '#ff6f00' },
    { value: AppointmentStatus.CONFIRMED, label: 'Confirmed', color: '#43a047' },
    { value: AppointmentStatus.CANCELLED, label: 'Cancelled', color: '#d32f2f' },
    { value: AppointmentStatus.COMPLETED, label: 'Completed', color: '#1976d2' },
    { value: AppointmentStatus.NO_SHOW, label: 'No Show', color: '#b71c1c' },
    { value: AppointmentStatus.RESCHEDULED, label: 'Rescheduled', color: '#0288d1' }
  ], []);
  
  // Get selected appointment details
  const selectedAppointment = useMemo(() => {
    if (!selectedEvent) return null;
    return selectedEvent.extendedProps.appointment;
  }, [selectedEvent]);
  
  // Check if user can edit the selected appointment
  const canEditAppointment = useMemo(() => {
    if (!selectedAppointment || !session?.user) return false;
    
    // Admin and staff can edit any appointment
    if (session.user.role === UserRole.ADMIN || session.user.role === UserRole.STAFF) {
      return true;
    }
    
    // Creator can edit their own appointments
    if (selectedAppointment.createdBy.id === session.user.id) {
      return true;
    }
    
    // Appointment must not be cancelled or completed
    if (selectedAppointment.status === AppointmentStatus.CANCELLED || 
        selectedAppointment.status === AppointmentStatus.COMPLETED) {
      return false;
    }
    
    return false;
  }, [selectedAppointment, session?.user]);
  
  // Check if user can cancel the selected appointment
  const canCancelAppointment = useMemo(() => {
    if (!selectedAppointment || !session?.user) return false;
    
    // Admin and staff can cancel any appointment
    if (session.user.role === UserRole.ADMIN || session.user.role === UserRole.STAFF) {
      return true;
    }
    
    // Creator can cancel their own appointments
    if (selectedAppointment.createdBy.id === session.user.id) {
      return true;
    }
    
    // Appointment must not be already cancelled or completed
    if (selectedAppointment.status === AppointmentStatus.CANCELLED || 
        selectedAppointment.status === AppointmentStatus.COMPLETED) {
      return false;
    }
    
    return false;
  }, [selectedAppointment, session?.user]);
  
  // Check if user can complete the selected appointment
  const canCompleteAppointment = useMemo(() => {
    if (!selectedAppointment || !session?.user) return false;
    
    // Admin and staff can complete any appointment
    if (session.user.role === UserRole.ADMIN || session.user.role === UserRole.STAFF) {
      return true;
    }
    
    // Creator can complete their own appointments
    if (selectedAppointment.createdBy.id === session.user.id) {
      return true;
    }
    
    // Appointment must be confirmed and not cancelled or already completed
    if (selectedAppointment.status !== AppointmentStatus.CONFIRMED) {
      return false;
    }
    
    return false;
  }, [selectedAppointment, session?.user]);
  
  return (
    <div className={`calendar-view ${className}`}>
      {/* Calendar Header */}
      {showHeader && (
        <div className="calendar-header mb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
            <div className="flex items-center">
              <h2 className="text-xl font-semibold text-neutral-800 mr-2">Calendar</h2>
              {isLoading && (
                <div className="animate-spin h-4 w-4 border-2 border-primary-500 border-t-transparent rounded-full"></div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {/* View Selection */}
              <div className="view-selector flex border rounded-md overflow-hidden">
                <button
                  type="button"
                  onClick={() => handleViewChange('dayGridMonth')}
                  className={`px-3 py-1.5 text-sm ${
                    currentView === 'dayGridMonth'
                      ? 'bg-primary-500 text-white'
                      : 'bg-white text-neutral-700 hover:bg-neutral-100'
                  }`}
                  aria-label="Month view"
                >
                  <FiGrid className="inline mr-1" />
                  <span className={isMobile ? 'hidden' : 'inline'}>Month</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleViewChange('timeGridWeek')}
                  className={`px-3 py-1.5 text-sm ${
                    currentView === 'timeGridWeek'
                      ? 'bg-primary-500 text-white'
                      : 'bg-white text-neutral-700 hover:bg-neutral-100'
                  }`}
                  aria-label="Week view"
                >
                  <FiCalendar className="inline mr-1" />
                  <span className={isMobile ? 'hidden' : 'inline'}>Week</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleViewChange('timeGridDay')}
                  className={`px-3 py-1.5 text-sm ${
                    currentView === 'timeGridDay'
                      ? 'bg-primary-500 text-white'
                      : 'bg-white text-neutral-700 hover:bg-neutral-100'
                  }`}
                  aria-label="Day view"
                >
                  <FiClock className="inline mr-1" />
                  <span className={isMobile ? 'hidden' : 'inline'}>Day</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleViewChange('listWeek')}
                  className={`px-3 py-1.5 text-sm ${
                    currentView === 'listWeek'
                      ? 'bg-primary-500 text-white'
                      : 'bg-white text-neutral-700 hover:bg-neutral-100'
                  }`}
                  aria-label="List view"
                >
                  <FiList className="inline mr-1" />
                  <span className={isMobile ? 'hidden' : 'inline'}>List</span>
                </button>
              </div>
              
              {/* New Appointment Button */}
              <button
                type="button"
                onClick={() => {
                  setSelectedDate(new Date());
                  setAppointmentForm({
                    type: AppointmentType.CONSULTATION,
                    title: '',
                    description: '',
                    startTime: new Date().toISOString(),
                    endTime: addMinutes(new Date(), 60).toISOString(),
                    status: AppointmentStatus.CONFIRMED,
                    participants: [],
                    location: {
                      address: ''
                    },
                    homeId: homeId,
                    residentId: residentId
                  });
                  setIsEditMode(false);
                  setIsAppointmentModalOpen(true);
                }}
                className="bg-primary-500 hover:bg-primary-600 text-white px-3 py-1.5 rounded-md text-sm flex items-center"
                aria-label="Create new appointment"
              >
                <FiPlus className="mr-1" />
                <span className={isMobile ? 'hidden' : 'inline'}>New</span>
              </button>
              
              {/* Refresh Button */}
              <button
                type="button"
                onClick={refreshCalendar}
                className="border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700 p-1.5 rounded-md"
                aria-label="Refresh calendar"
                disabled={isLoading}
              >
                <FiRefreshCw className={isLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
          
          {/* Search and Filters */}
          {(showSearch || showFilters) && (
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
              {/* Search */}
              {showSearch && (
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="Search appointments..."
                    value={searchQuery}
                    onChange={handleSearchInput}
                    className="form-input pl-9 pr-4 py-2 w-full rounded-md border-neutral-300 focus:border-primary-500 focus:ring-primary-500"
                  />
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                </div>
              )}
              
              {/* Filters */}
              {showFilters && (
                <div className="relative w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                    className={`flex items-center px-3 py-2 rounded-md border ${
                      isFiltersOpen || typeFilters.length > 0 || statusFilters.length > 0
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    <FiFilter className="mr-1" />
                    <span>Filters</span>
                    <span className="ml-1 text-xs bg-neutral-200 text-neutral-800 rounded-full px-2 py-0.5">
                      {typeFilters.length + statusFilters.length}
                    </span>
                    {isFiltersOpen ? (
                      <FiChevronUp className="ml-2" />
                    ) : (
                      <FiChevronDown className="ml-2" />
                    )}
                  </button>
                  
                  {/* Filter Dropdown */}
                  {isFiltersOpen && (
                    <div className="absolute right-0 mt-2 w-64 sm:w-80 bg-white rounded-md shadow-lg z-10 p-4">
                      <h3 className="font-medium text-neutral-800 mb-2">Appointment Type</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                        {appointmentTypeOptions.map(option => (
                          <div key={option.value} className="flex items-center">
                            <input
                              type="checkbox"
                              id={`type-${option.value}`}
                              checked={typeFilters.includes(option.value)}
                              onChange={() => handleFilterToggle(option.value)}
                              className="form-checkbox h-4 w-4 text-primary-500 rounded focus:ring-primary-500"
                            />
                            <label
                              htmlFor={`type-${option.value}`}
                              className="ml-2 text-sm text-neutral-700 flex items-center"
                            >
                              <span
                                className="inline-block w-3 h-3 rounded-full mr-1"
                                style={{ backgroundColor: option.color }}
                              ></span>
                              {option.label}
                            </label>
                          </div>
                        ))}
                      </div>
                      
                      <h3 className="font-medium text-neutral-800 mb-2">Status</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {appointmentStatusOptions.map(option => (
                          <div key={option.value} className="flex items-center">
                            <input
                              type="checkbox"
                              id={`status-${option.value}`}
                              checked={statusFilters.includes(option.value)}
                              onChange={() => handleStatusFilterToggle(option.value)}
                              className="form-checkbox h-4 w-4 text-primary-500 rounded focus:ring-primary-500"
                            />
                            <label
                              htmlFor={`status-${option.value}`}
                              className="ml-2 text-sm text-neutral-700 flex items-center"
                            >
                              <span
                                className="inline-block w-3 h-3 rounded-full mr-1"
                                style={{ backgroundColor: option.color }}
                              ></span>
                              {option.label}
                            </label>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-4 flex justify-between">
                        <button
                          type="button"
                          onClick={handleClearFilters}
                          className="text-sm text-neutral-600 hover:text-neutral-800"
                        >
                          Clear all
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsFiltersOpen(false)}
                          className="text-sm text-primary-600 hover:text-primary-800 font-medium"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Calendar Toolbar */}
      {showToolbar && (
        <div className="calendar-toolbar flex flex-wrap justify-between items-center mb-4 gap-2">
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => {
                if (calendarRef.current) {
                  calendarRef.current.getApi().prev();
                }
              }}
              className="p-1.5 rounded-md border border-neutral-300 hover:bg-neutral-100"
              aria-label="Previous"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            
            <button
              type="button"
              onClick={() => {
                if (calendarRef.current) {
                  calendarRef.current.getApi().today();
                }
              }}
              className="mx-2 px-3 py-1.5 rounded-md border border-neutral-300 hover:bg-neutral-100"
            >
              Today
            </button>
            
            <button
              type="button"
              onClick={() => {
                if (calendarRef.current) {
                  calendarRef.current.getApi().next();
                }
              }}
              className="p-1.5 rounded-md border border-neutral-300 hover:bg-neutral-100"
              aria-label="Next"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
            
            <h2 className="ml-4 text-lg font-medium text-neutral-800">
              {calendarRef.current ? calendarRef.current.getApi().view.title : ''}
            </h2>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {/* Legend */}
            <div className="hidden sm:flex items-center">
              {appointmentTypeOptions.slice(0, 4).map(option => (
                <div key={option.value} className="flex items-center ml-2 text-xs">
                  <span
                    className="inline-block w-3 h-3 rounded-full mr-1"
                    style={{ backgroundColor: option.color }}
                  ></span>
                  <span className="text-neutral-600">{option.label}</span>
                </div>
              ))}
              {appointmentTypeOptions.length > 4 && (
                <div className="ml-2 text-xs text-neutral-600">
                  <span>+{appointmentTypeOptions.length - 4} more</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Calendar */}
      <div className={`calendar-container ${isLoading ? 'opacity-60' : ''}`}>
        <FullCalendar
          ref={calendarRef}
          {...calendarOptions}
        />
      </div>
      
      {/* Error Display */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 flex items-start">
          <FiAlertCircle className="mt-0.5 mr-2 flex-shrink-0" />
          <div>
            <p className="font-medium">Error loading calendar</p>
            <p className="text-sm">{error}</p>
            <button
              type="button"
              onClick={refreshCalendar}
              className="mt-2 text-sm text-red-700 font-medium hover:text-red-800 flex items-center"
            >
              <FiRefreshCw className="mr-1" /> Try again
            </button>
          </div>
        </div>
      )}
      
      {/* Context Menu */}
      {contextMenuPosition && contextMenuEvent && (
        <div
          className="absolute bg-white rounded-md shadow-lg z-50 py-1 w-48"
          style={{
            top: `${contextMenuPosition.y}px`,
            left: `${contextMenuPosition.x}px`,
          }}
        >
          <div className="px-3 py-2 border-b border-neutral-100">
            <p className="text-sm font-medium truncate" title={contextMenuEvent.title}>
              {contextMenuEvent.title}
            </p>
            <p className="text-xs text-neutral-500">
              {formatAppointmentTime(contextMenuEvent.extendedProps.appointment)}
            </p>
          </div>
          
          <button
            type="button"
            onClick={() => {
              setSelectedEvent(contextMenuEvent);
              setIsDetailsModalOpen(true);
              setContextMenuPosition(null);
            }}
            className="w-full text-left px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 flex items-center"
          >
            <FiInfo className="mr-2" /> View Details
          </button>
          
          {canEditAppointment && (
            <button
              type="button"
              onClick={() => {
                setSelectedEvent(contextMenuEvent);
                handleEditClick();
                setContextMenuPosition(null);
              }}
              className="w-full text-left px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 flex items-center"
            >
              <FiEdit className="mr-2" /> Edit
            </button>
          )}
          
          {canCancelAppointment && (
            <button
              type="button"
              onClick={() => {
                setSelectedEvent(contextMenuEvent);
                setIsDeleteModalOpen(true);
                setContextMenuPosition(null);
              }}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
            >
              <FiTrash2 className="mr-2" /> Cancel
            </button>
          )}
          
          {canCompleteAppointment && (
            <button
              type="button"
              onClick={() => {
                setSelectedEvent(contextMenuEvent);
                handleCompleteAppointment();
                setContextMenuPosition(null);
              }}
              className="w-full text-left px-3 py-2 text-sm text-green-600 hover:bg-green-50 flex items-center"
            >
              <FiCheck className="mr-2" /> Mark Complete
            </button>
          )}
        </div>
      )}
      
      {/* Create/Edit Appointment Modal */}
      <Transition show={isAppointmentModalOpen} as={React.Fragment}>
        <Dialog
          as="div"
          className="fixed inset-0 z-50 overflow-y-auto"
          onClose={() => setIsAppointmentModalOpen(false)}
        >
          <div className="min-h-screen px-4 text-center">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <DialogBackdrop className="fixed inset-0 bg-neutral-900 bg-opacity-50 transition-opacity" />
            </Transition.Child>
            
            {/* This element is to trick the browser into centering the modal contents. */}
            <span
              className="inline-block h-screen align-middle"
              aria-hidden="true"
            >
              &#8203;
            </span>
            
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="inline-block w-full max-w-xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <DialogTitle
                    as="h3"
                    className="text-lg font-medium text-neutral-900"
                  >
                    {isEditMode ? 'Edit Appointment' : 'Create Appointment'}
                  </DialogTitle>
                  <button
                    type="button"
                    onClick={() => setIsAppointmentModalOpen(false)}
                    className="text-neutral-500 hover:text-neutral-700"
                  >
                    <FiX size={20} />
                  </button>
                </div>
                
                <form onSubmit={handleAppointmentSubmit}>
                  {/* Title */}
                  <div className="mb-4">
                    <label
                      htmlFor="appointment-title"
                      className="block text-sm font-medium text-neutral-700 mb-1"
                    >
                      Title*
                    </label>
                    <input
                      type="text"
                      id="appointment-title"
                      value={appointmentForm.title || ''}
                      onChange={(e) => setAppointmentForm({...appointmentForm, title: e.target.value})}
                      className="form-input w-full rounded-md border-neutral-300 focus:border-primary-500 focus:ring-primary-500"
                      required
                    />
                  </div>
                  
                  {/* Type */}
                  <div className="mb-4">
                    <label
                      htmlFor="appointment-type"
                      className="block text-sm font-medium text-neutral-700 mb-1"
                    >
                      Type*
                    </label>
                    <select
                      id="appointment-type"
                      value={appointmentForm.type || AppointmentType.CONSULTATION}
                      onChange={(e) => setAppointmentForm({
                        ...appointmentForm,
                        type: e.target.value as AppointmentType
                      })}
                      className="form-select w-full rounded-md border-neutral-300 focus:border-primary-500 focus:ring-primary-500"
                      required
                    >
                      {appointmentTypeOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Date and Time */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label
                        htmlFor="appointment-start"
                        className="block text-sm font-medium text-neutral-700 mb-1"
                      >
                        Start Time*
                      </label>
                      <input
                        type="datetime-local"
                        id="appointment-start"
                        value={appointmentForm.startTime ? format(new Date(appointmentForm.startTime), "yyyy-MM-dd'T'HH:mm") : ''}
                        onChange={(e) => setAppointmentForm({
                          ...appointmentForm,
                          startTime: new Date(e.target.value).toISOString()
                        })}
                        className="form-input w-full rounded-md border-neutral-300 focus:border-primary-500 focus:ring-primary-500"
                        required
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="appointment-end"
                        className="block text-sm font-medium text-neutral-700 mb-1"
                      >
                        End Time*
                      </label>
                      <input
                        type="datetime-local"
                        id="appointment-end"
                        value={appointmentForm.endTime ? format(new Date(appointmentForm.endTime), "yyyy-MM-dd'T'HH:mm") : ''}
                        onChange={(e) => setAppointmentForm({
                          ...appointmentForm,
                          endTime: new Date(e.target.value).toISOString()
                        })}
                        className="form-input w-full rounded-md border-neutral-300 focus:border-primary-500 focus:ring-primary-500"
                        required
                      />
                    </div>
                  </div>
                  
                  {/* Location */}
                  <div className="mb-4">
                    <label
                      htmlFor="appointment-location"
                      className="block text-sm font-medium text-neutral-700 mb-1"
                    >
                      Location
                    </label>
                    <input
                      type="text"
                      id="appointment-location"
                      value={appointmentForm.location?.address || ''}
                      onChange={(e) => setAppointmentForm({
                        ...appointmentForm,
                        location: { ...appointmentForm.location, address: e.target.value }
                      })}
                      className="form-input w-full rounded-md border-neutral-300 focus:border-primary-500 focus:ring-primary-500"
                      placeholder="Enter address or meeting location"
                    />
                  </div>
                  
                  {/* Description */}
                  <div className="mb-4">
                    <label
                      htmlFor="appointment-description"
                      className="block text-sm font-medium text-neutral-700 mb-1"
                    >
                      Description
                    </label>
                    <textarea
                      id="appointment-description"
                      value={appointmentForm.description || ''}
                      onChange={(e) => setAppointmentForm({
                        ...appointmentForm,
                        description: e.target.value
                      })}
                      className="form-textarea w-full rounded-md border-neutral-300 focus:border-primary-500 focus:ring-primary-500"
                      rows={3}
                      placeholder="Enter appointment details"
                    />
                  </div>
                  
                  {/* Participants */}
                  <div className="mb-6">
                    <label
                      htmlFor="appointment-participants"
                      className="block text-sm font-medium text-neutral-700 mb-1"
                    >
                      Participants
                    </label>
                    <div className="text-sm text-neutral-500 mb-2">
                      Participant management coming soon
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAppointmentModalOpen(false)}
                      className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-primary-500 border border-transparent rounded-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      disabled={isCreating || isUpdating}
                    >
                      {(isCreating || isUpdating) ? (
                        <>
                          <span className="inline-block animate-spin mr-1">⟳</span>
                          {isEditMode ? 'Saving...' : 'Creating...'}
                        </>
                      ) : (
                        isEditMode ? 'Save Changes' : 'Create Appointment'
                      )}
                    </button>
                  </div>
                </form>
              </DialogPanel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
      
      {/* Appointment Details Modal */}
      <Transition show={isDetailsModalOpen} as={React.Fragment}>
        <Dialog
          as="div"
          className="fixed inset-0 z-50 overflow-y-auto"
          onClose={() => setIsDetailsModalOpen(false)}
        >
          <div className="min-h-screen px-4 text-center">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <DialogBackdrop className="fixed inset-0 bg-neutral-900 bg-opacity-50 transition-opacity" />
            </Transition.Child>
            
            {/* This element is to trick the browser into centering the modal contents. */}
            <span
              className="inline-block h-screen align-middle"
              aria-hidden="true"
            >
              &#8203;
            </span>
            
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="inline-block w-full max-w-xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
                {selectedAppointment && (
                  <>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <DialogTitle
                          as="h3"
                          className="text-lg font-medium text-neutral-900"
                        >
                          {selectedAppointment.title}
                        </DialogTitle>
                        <p className="text-sm text-neutral-500">
                          {getAppointmentTypeText(selectedAppointment.type)}
                        </p>
                      </div>
                      <div className="flex items-center">
                        <span
                          className="inline-block px-2 py-1 text-xs font-medium rounded-full mr-2"
                          style={{
                            backgroundColor: getStatusColor(selectedAppointment.status),
                            color: 'white'
                          }}
                        >
                          {getAppointmentStatusText(selectedAppointment.status)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsDetailsModalOpen(false)}
                          className="text-neutral-500 hover:text-neutral-700"
                        >
                          <FiX size={20} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="bg-neutral-50 p-3 rounded-md mb-4">
                      <div className="flex items-center mb-2">
                        <FiCalendar className="text-neutral-600 mr-2" />
                        <span className="text-neutral-800">
                          {formatAppointmentDate(selectedAppointment)}
                        </span>
                      </div>
                      <div className="flex items-center mb-2">
                        <FiClock className="text-neutral-600 mr-2" />
                        <span className="text-neutral-800">
                          {formatAppointmentTime(selectedAppointment)}
                        </span>
                      </div>
                      {selectedAppointment.location?.address && (
                        <div className="flex items-center">
                          <FiMapPin className="text-neutral-600 mr-2" />
                          <span className="text-neutral-800">
                            {selectedAppointment.location.address}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {selectedAppointment.description && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-neutral-700 mb-1">Description</h4>
                        <p className="text-neutral-600 text-sm whitespace-pre-line">
                          {selectedAppointment.description}
                        </p>
                      </div>
                    )}
                    
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-neutral-700 mb-1">Participants</h4>
                      {selectedAppointment.participants.length > 0 ? (
                        <div className="space-y-2">
                          {selectedAppointment.participants.map((participant, index) => (
                            <div key={index} className="flex items-center justify-between bg-white p-2 rounded-md border border-neutral-200">
                              <div className="flex items-center">
                                <div className="h-8 w-8 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-600">
                                  {participant.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="ml-2">
                                  <p className="text-sm font-medium text-neutral-800">{participant.name}</p>
                                  <p className="text-xs text-neutral-500">{participant.role}</p>
                                </div>
                              </div>
                              <span
                                className="inline-block px-2 py-0.5 text-xs rounded-full"
                                style={{
                                  backgroundColor: participant.status === 'ACCEPTED' ? '#e8f5e9' : 
                                                  participant.status === 'DECLINED' ? '#ffebee' : '#fff8e1',
                                  color: participant.status === 'ACCEPTED' ? '#1b5e20' : 
                                         participant.status === 'DECLINED' ? '#b71c1c' : '#ff6f00'
                                }}
                              >
                                {participant.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-neutral-500 text-sm">No participants</p>
                      )}
                    </div>
                    
                    <div className="flex justify-between mt-6">
                      <div>
                        {canCancelAppointment && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsDetailsModalOpen(false);
                              setIsDeleteModalOpen(true);
                            }}
                            className="px-3 py-1.5 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50"
                          >
                            <FiTrash2 className="inline-block mr-1" />
                            Cancel Appointment
                          </button>
                        )}
                      </div>
                      <div className="space-x-2">
                        {canCompleteAppointment && (
                          <button
                            type="button"
                            onClick={handleCompleteAppointment}
                            className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
                          >
                            <FiCheck className="inline-block mr-1" />
                            Mark Complete
                          </button>
                        )}
                        
                        {canEditAppointment && (
                          <button
                            type="button"
                            onClick={handleEditClick}
                            className="px-3 py-1.5 text-sm font-medium text-white bg-primary-500 border border-transparent rounded-md hover:bg-primary-600"
                          >
                            <FiEdit className="inline-block mr-1" />
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </DialogPanel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
      
      {/* Delete Confirmation Modal */}
      <Transition show={isDeleteModalOpen} as={React.Fragment}>
        <Dialog
          as="div"
          className="fixed inset-0 z-50 overflow-y-auto"
          onClose={() => setIsDeleteModalOpen(false)}
        >
          <div className="min-h-screen px-4 text-center">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <DialogBackdrop className="fixed inset-0 bg-neutral-900 bg-opacity-50 transition-opacity" />
            </Transition.Child>
            
            {/* This element is to trick the browser into centering the modal contents. */}
            <span
              className="inline-block h-screen align-middle"
              aria-hidden="true"
            >
              &#8203;
            </span>
            
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
                <div className="flex justify-between items-start mb-4">
                  <DialogTitle
                    as="h3"
                    className="text-lg font-medium text-neutral-900"
                  >
                    Cancel Appointment
                  </DialogTitle>
                  <button
                    type="button"
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="text-neutral-500 hover:text-neutral-700"
                  >
                    <FiX size={20} />
                  </button>
                </div>
                
                <p className="text-neutral-600 mb-4">
                  Are you sure you want to cancel this appointment? This action cannot be undone.
                </p>
                
                <div className="mb-4">
                  <label
                    htmlFor="cancel-reason"
                    className="block text-sm font-medium text-neutral-700 mb-1"
                  >
                    Reason for cancellation (optional)
                  </label>
                  <textarea
                    id="cancel-reason"
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    className="form-textarea w-full rounded-md border-neutral-300 focus:border-primary-500 focus:ring-primary-500"
                    rows={2}
                    placeholder="Enter reason for cancellation"
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelAppointment}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    disabled={isCancelling}
                  >
                    {isCancelling ? (
                      <>
                        <span className="inline-block animate-spin mr-1">⟳</span>
                        Cancelling...
                      </>
                    ) : (
                      'Confirm Cancellation'
                    )}
                  </button>
                </div>
              </DialogPanel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}

/**
 * Helper function to get status color
 */
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
