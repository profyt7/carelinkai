"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { format, parseISO, addDays, isAfter, isBefore } from "date-fns";
import { toast } from "react-hot-toast";
import { 
  FiCalendar, FiClock, FiPlus, FiFilter, FiUsers, 
  FiCheckCircle, FiXCircle, FiAlertCircle, FiCoffee,
  FiDownload, FiGrid, FiList, FiSettings
} from "react-icons/fi";

import DashboardLayout from "@/components/layout/DashboardLayout";
import CalendarView from "@/components/calendar/CalendarView";
import { useCalendar } from "@/hooks/useCalendar";
import { AppointmentStatus, AppointmentType } from "@/lib/types/calendar";
import type { Appointment } from "@/lib/types/calendar";
import { UserRole } from "@prisma/client";

// Calendar page with comprehensive features
export default function CalendarPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isCreatingAppointment, setIsCreatingAppointment] = useState(false);
  const [activeTab, setActiveTab] = useState<"calendar" | "upcoming" | "availability">("calendar");
  const [calendarHeight, setCalendarHeight] = useState<string>("700px");
  const [isLoading, setIsLoading] = useState(true);
  
  // Add state for filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilters, setTypeFilters] = useState<AppointmentType[]>([]);
  const [statusFilters, setStatusFilters] = useState<AppointmentStatus[]>([]);
  const [refreshKey, setRefreshKey] = useState(0); // Used to force refresh

  // Get calendar data using our hook
  const {
    appointments,
    events,
    isLoading: isCalendarLoading,
    fetchAppointments,
    getAppointmentStatusText,
    getAppointmentTypeText,
    formatAppointmentDate,
    formatAppointmentTime,
    filter,
    setFilter
  } = useCalendar();

  /**
   * Callback fired by CalendarView whenever it creates / updates / cancels
   * an appointment.  We immediately refetch appointments and bump the
   * refreshKey so all child components (e.g., Upcoming sidebar) rerender.
   */
  const handleDataChange = useCallback(async () => {
    await fetchAppointments();
    setRefreshKey((prev) => prev + 1);
  }, [fetchAppointments]);

  // Handle filter changes
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    const partial = { searchText: query || undefined };
    setFilter(partial);
    // Immediately refetch with the updated filter
    fetchAppointments(partial);
  }, [setFilter, fetchAppointments]);

  const handleTypeFilterChange = useCallback((types: AppointmentType[]) => {
    setTypeFilters(types);
    const partial = { appointmentTypes: types.length > 0 ? types : undefined };
    setFilter(partial);
    fetchAppointments(partial);
  }, [setFilter, fetchAppointments]);

  const handleStatusFilterChange = useCallback((statuses: AppointmentStatus[]) => {
    setStatusFilters(statuses);
    const partial = { status: statuses.length > 0 ? statuses : undefined };
    setFilter(partial);
    fetchAppointments(partial);
  }, [setFilter, fetchAppointments]);

  // Check authentication
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    } else if (status === "authenticated") {
      setIsLoading(false);
    }
  }, [status, router]);

  // Calculate calendar height based on window size
  useEffect(() => {
    const handleResize = () => {
      const windowHeight = window.innerHeight;
      const topOffset = 320; // Approximate height of the top sections
      const minHeight = 500; // Minimum calendar height
      const calculatedHeight = Math.max(windowHeight - topOffset, minHeight);
      setCalendarHeight(`${calculatedHeight}px`);
    };

    handleResize(); // Call once on mount
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Calculate statistics
  const stats = {
    total: appointments.length,
    // Upcoming includes CONFIRMED, PENDING and RESCHEDULED appointments in the future
    upcoming: appointments.filter((apt) => {
      const future = isAfter(new Date(apt.startTime), new Date());
      const allowedStatuses = [
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.PENDING,
        AppointmentStatus.RESCHEDULED,
      ];
      return future && allowedStatuses.includes(apt.status);
    }).length,
    completed: appointments.filter((apt) => apt.status === AppointmentStatus.COMPLETED).length,
    cancelled: appointments.filter((apt) => apt.status === AppointmentStatus.CANCELLED).length,
  };

  // Get upcoming appointments for the next 7 days
  const upcomingAppointments = appointments
    .filter(
      (apt) => {
        const future = isAfter(new Date(apt.startTime), new Date());
        const withinWeek = isBefore(new Date(apt.startTime), addDays(new Date(), 7));
        const allowedStatuses = [
          AppointmentStatus.CONFIRMED,
          AppointmentStatus.PENDING,
          AppointmentStatus.RESCHEDULED,
        ];
        return future && withinWeek && allowedStatuses.includes(apt.status);
      }
    )
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 5); // Show only next 5 appointments

  // Handle export calendar
  const handleExportCalendar = () => {
    // This would be implemented to export to iCal/Google Calendar
    toast.success("Calendar export feature coming soon!");
  };

  // Loading state
  if (isLoading) {
    return (
      <DashboardLayout title="Calendar">
        <div className="flex h-96 items-center justify-center">
          <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Calendar & Scheduling">
      {/* Stats Section */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-500">Total Appointments</p>
              <p className="mt-1 text-2xl font-semibold text-neutral-800">{stats.total}</p>
            </div>
            <div className="rounded-full bg-blue-50 p-3 text-blue-500">
              <FiCalendar size={24} />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-500">Upcoming</p>
              <p className="mt-1 text-2xl font-semibold text-neutral-800">{stats.upcoming}</p>
            </div>
            <div className="rounded-full bg-amber-50 p-3 text-amber-500">
              <FiClock size={24} />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-500">Completed</p>
              <p className="mt-1 text-2xl font-semibold text-neutral-800">{stats.completed}</p>
            </div>
            <div className="rounded-full bg-green-50 p-3 text-green-500">
              <FiCheckCircle size={24} />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-500">Cancelled</p>
              <p className="mt-1 text-2xl font-semibold text-neutral-800">{stats.cancelled}</p>
            </div>
            <div className="rounded-full bg-red-50 p-3 text-red-500">
              <FiXCircle size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions & Tabs */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab("calendar")}
            className={`flex items-center rounded-md px-3 py-2 text-sm font-medium ${
              activeTab === "calendar"
                ? "bg-primary-500 text-white"
                : "bg-white text-neutral-700 hover:bg-neutral-100"
            }`}
          >
            <FiGrid className="mr-1.5" /> Calendar View
          </button>
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`flex items-center rounded-md px-3 py-2 text-sm font-medium ${
              activeTab === "upcoming"
                ? "bg-primary-500 text-white"
                : "bg-white text-neutral-700 hover:bg-neutral-100"
            }`}
          >
            <FiList className="mr-1.5" /> Upcoming
          </button>
          {(session?.user?.role === UserRole.ADMIN || 
            session?.user?.role === UserRole.STAFF || 
            session?.user?.role === UserRole.OPERATOR) && (
            <button
              onClick={() => setActiveTab("availability")}
              className={`flex items-center rounded-md px-3 py-2 text-sm font-medium ${
                activeTab === "availability"
                  ? "bg-primary-500 text-white"
                  : "bg-white text-neutral-700 hover:bg-neutral-100"
              }`}
            >
              <FiUsers className="mr-1.5" /> Staff Availability
            </button>
          )}
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => setIsCreatingAppointment(true)}
            className="flex items-center rounded-md bg-primary-500 px-3 py-2 text-sm font-medium text-white hover:bg-primary-600"
          >
            <FiPlus className="mr-1.5" /> New Appointment
          </button>
          <button
            onClick={handleExportCalendar}
            className="flex items-center rounded-md bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            <FiDownload className="mr-1.5" /> Export
          </button>
          <button
            onClick={() => toast.success("Calendar settings coming soon!")}
            className="flex items-center rounded-md bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            <FiSettings className="mr-1.5" /> Settings
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Sidebar - Upcoming Appointments */}
        <div className={`lg:col-span-1 ${activeTab !== "upcoming" && activeTab !== "availability" ? "hidden lg:block" : ""}`}>
          <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-200 p-4">
              <h3 className="text-lg font-medium text-neutral-800">Upcoming Appointments</h3>
              <p className="text-sm text-neutral-500">Next 7 days</p>
            </div>

            <div className="divide-y divide-neutral-100">
              {upcomingAppointments.length > 0 ? (
                upcomingAppointments.map((appointment) => (
                  <div key={`${appointment.id}-${refreshKey}`} className="p-4 hover:bg-neutral-50">
                    <div className="mb-1 flex items-center justify-between">
                      <h4 className="font-medium text-neutral-800">{appointment.title}</h4>
                      <span
                        className="inline-block rounded-full px-2 py-1 text-xs font-medium"
                        style={{
                          backgroundColor: getAppointmentTypeColor(appointment.type),
                          color: getAppointmentTypeTextColor(appointment.type),
                        }}
                      >
                        {getAppointmentTypeText(appointment.type)}
                      </span>
                    </div>
                    <div className="mb-2 text-sm text-neutral-500">
                      <div className="flex items-center">
                        <FiCalendar className="mr-1.5" size={14} />
                        {formatAppointmentDate(appointment)}
                      </div>
                      <div className="flex items-center">
                        <FiClock className="mr-1.5" size={14} />
                        {formatAppointmentTime(appointment)}
                      </div>
                    </div>
                    {appointment.location?.address && (
                      <div className="text-xs text-neutral-500">
                        📍 {appointment.location.address}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <FiCoffee size={32} className="mb-2 text-neutral-400" />
                  <p className="text-neutral-500">No upcoming appointments</p>
                  <p className="text-sm text-neutral-400">Time for a coffee break!</p>
                </div>
              )}
            </div>

            {upcomingAppointments.length > 0 && (
              <div className="border-t border-neutral-200 p-4">
                <button
                  onClick={() => setActiveTab("upcoming")}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-center text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  View All Appointments
                </button>
              </div>
            )}
          </div>

          {/* Role-based features */}
          {(session?.user?.role === UserRole.ADMIN || session?.user?.role === UserRole.STAFF) && (
            <div className="mt-6 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-medium text-neutral-800">Admin Tools</h3>
              <div className="space-y-2">
                <button
                  onClick={() => toast.success("Calendar management coming soon!")}
                  className="flex w-full items-center rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                >
                  <FiSettings className="mr-2" /> Manage Calendars
                </button>
                <button
                  onClick={() => toast.success("Staff scheduling coming soon!")}
                  className="flex w-full items-center rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                >
                  <FiUsers className="mr-2" /> Staff Scheduling
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Main Calendar View */}
        <div 
          className={`${
            activeTab === "calendar" ? "lg:col-span-3" : "hidden"
          }`}
        >
          <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
            <CalendarView 
              key={`calendar-view-${refreshKey}`} // Force re-render when data changes
              height={calendarHeight}
              showHeader={true}
              showFilters={true}
              showSearch={true}
              showToolbar={true}
              userId={session?.user?.id}
              /* Only pass filter state, not data */
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              typeFilters={typeFilters}
              onTypeFiltersChange={handleTypeFilterChange}
              statusFilters={statusFilters}
              onStatusFiltersChange={handleStatusFilterChange}
              /* notify parent when calendar data mutates */
              onDataChange={handleDataChange}
            />
          </div>
        </div>

        {/* Upcoming Appointments Tab (Mobile Friendly) */}
        <div className={`lg:col-span-3 ${activeTab === "upcoming" ? "" : "hidden"}`}>
          <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-200 p-4">
              <h3 className="text-lg font-medium text-neutral-800">All Upcoming Appointments</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                      Title
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                      Time
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 bg-white">
                  {appointments
                    .filter((apt) => isAfter(new Date(apt.startTime), new Date()))
                    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                    .map((appointment) => (
                      <tr key={`${appointment.id}-${refreshKey}`} className="hover:bg-neutral-50">
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="text-sm font-medium text-neutral-800">{appointment.title}</div>
                          {appointment.location?.address && (
                            <div className="text-xs text-neutral-500">{appointment.location.address}</div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span
                            className="inline-block rounded-full px-2 py-1 text-xs font-medium"
                            style={{
                              backgroundColor: getAppointmentTypeColor(appointment.type),
                              color: getAppointmentTypeTextColor(appointment.type),
                            }}
                          >
                            {getAppointmentTypeText(appointment.type)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-500">
                          {format(parseISO(appointment.startTime), "MMM d, yyyy")}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-500">
                          {format(parseISO(appointment.startTime), "h:mm a")} - 
                          {format(parseISO(appointment.endTime), "h:mm a")}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span
                            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                            style={{
                              backgroundColor: getAppointmentStatusColor(appointment.status),
                              color: getAppointmentStatusTextColor(appointment.status),
                            }}
                          >
                            {getAppointmentStatusIcon(appointment.status)}
                            {getAppointmentStatusText(appointment.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>

              {appointments.filter((apt) => isAfter(new Date(apt.startTime), new Date())).length === 0 && (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <FiCalendar size={32} className="mb-2 text-neutral-400" />
                  <p className="text-neutral-500">No upcoming appointments found</p>
                  <button
                    onClick={() => setIsCreatingAppointment(true)}
                    className="mt-4 rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
                  >
                    <FiPlus className="mr-1.5 inline-block" /> Schedule New Appointment
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Staff Availability Tab (Admin/Staff/Operator Only) */}
        <div className={`lg:col-span-3 ${activeTab === "availability" ? "" : "hidden"}`}>
          <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="mb-6 text-center">
              <h3 className="text-lg font-medium text-neutral-800">Staff Availability Management</h3>
              <p className="text-neutral-500">
                View and manage staff availability for scheduling appointments
              </p>
            </div>

            <div className="flex flex-col items-center justify-center space-y-4 p-8 text-center">
              <FiUsers size={48} className="text-primary-300" />
              <h3 className="text-lg font-medium text-neutral-800">Staff Availability Coming Soon</h3>
              <p className="max-w-md text-neutral-500">
                This feature will allow you to view and manage staff availability, set working hours,
                and handle time-off requests.
              </p>
              <button
                onClick={() => toast.success("Staff availability feature coming soon!")}
                className="mt-2 rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
              >
                Notify Me When Available
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar creation modal would be implemented here */}
      {isCreatingAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold">Create New Appointment</h2>
            <p className="mb-4 text-neutral-600">
              This modal would contain the appointment creation form.
              For now, we're using the calendar's built-in appointment creation.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsCreatingAppointment(false)}
                className="rounded-md bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setIsCreatingAppointment(false);
                  toast.success("Please use the calendar to create appointments");
                }}
                className="rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

// Helper functions for appointment styling
function getAppointmentTypeColor(type: AppointmentType): string {
  const colorMap: Record<AppointmentType, string> = {
    CARE_EVALUATION: "#e3f2fd",
    FACILITY_TOUR: "#e8f5e9",
    CAREGIVER_SHIFT: "#ede7f6",
    FAMILY_VISIT: "#fff3e0",
    CONSULTATION: "#f3e5f5",
    MEDICAL_APPOINTMENT: "#ffebee",
    ADMIN_MEETING: "#e0f2f1",
    SOCIAL_EVENT: "#f1f8e9",
  };
  return colorMap[type] || "#f5f5f5";
}

function getAppointmentTypeTextColor(type: AppointmentType): string {
  const colorMap: Record<AppointmentType, string> = {
    CARE_EVALUATION: "#0d47a1",
    FACILITY_TOUR: "#1b5e20",
    CAREGIVER_SHIFT: "#311b92",
    FAMILY_VISIT: "#e65100",
    CONSULTATION: "#4a148c",
    MEDICAL_APPOINTMENT: "#b71c1c",
    ADMIN_MEETING: "#004d40",
    SOCIAL_EVENT: "#33691e",
  };
  return colorMap[type] || "#212121";
}

function getAppointmentStatusColor(status: AppointmentStatus): string {
  const colorMap: Record<AppointmentStatus, string> = {
    PENDING: "#fff8e1",
    CONFIRMED: "#e8f5e9",
    CANCELLED: "#ffebee",
    COMPLETED: "#e1f5fe",
    NO_SHOW: "#fafafa",
    RESCHEDULED: "#e1f5fe",
  };
  return colorMap[status] || "#f5f5f5";
}

function getAppointmentStatusTextColor(status: AppointmentStatus): string {
  const colorMap: Record<AppointmentStatus, string> = {
    PENDING: "#ff6f00",
    CONFIRMED: "#1b5e20",
    CANCELLED: "#b71c1c",
    COMPLETED: "#01579b",
    NO_SHOW: "#b71c1c",
    RESCHEDULED: "#01579b",
  };
  return colorMap[status] || "#212121";
}

function getAppointmentStatusIcon(status: AppointmentStatus) {
  switch (status) {
    case AppointmentStatus.CONFIRMED:
      return <FiCheckCircle className="mr-1" size={12} />;
    case AppointmentStatus.CANCELLED:
      return <FiXCircle className="mr-1" size={12} />;
    case AppointmentStatus.PENDING:
      return <FiClock className="mr-1" size={12} />;
    case AppointmentStatus.COMPLETED:
      return <FiCheckCircle className="mr-1" size={12} />;
    case AppointmentStatus.NO_SHOW:
      return <FiAlertCircle className="mr-1" size={12} />;
    case AppointmentStatus.RESCHEDULED:
      return <FiCalendar className="mr-1" size={12} />;
    default:
      return null;
  }
}
