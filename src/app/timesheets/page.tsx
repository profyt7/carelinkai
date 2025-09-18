"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { 
  FiClock, 
  FiCalendar,
  FiHome,
  FiAlertCircle,
  FiCheckCircle,
  FiFileText,
  FiCoffee
} from "react-icons/fi";

// API response interfaces
interface ApiTimesheet {
  id: string;
  shiftId: string;
  startTime: string;
  endTime: string | null;
  breakMinutes: number;
  status: string;
  notes: string | null;
  approvedAt: string | null;
  shift?: {
    id: string;
    startTime: string;
    endTime: string;
    home?: {
      id: string;
      name: string;
    };
  };
}

interface ApiResponse {
  timesheets: ApiTimesheet[];
}

// App state interface
interface Timesheet {
  id: string;
  shiftId: string;
  homeName: string | null;
  startTime: Date;
  endTime: Date | null;
  breakMinutes: number;
  status: string;
  notes: string | null;
  approvedAt: Date | null;
}

// Format date and time - handle both Date objects and strings
const formatDateTime = (date: Date | string | null) => {
  if (!date) return 'Not recorded';
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Format date - handle both Date objects and strings
const formatDate = (date: Date | string | null) => {
  if (!date) return 'Not recorded';
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

export default function TimesheetsPage() {
  const { data: session, status: authStatus } = useSession();
  
  // State for API data
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState<string | null>(null);

  // Determine if user is an operator (has timesheets to approve)
  const [isOperator, setIsOperator] = useState(false);

  // Fetch timesheets
  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    
    const fetchTimesheets = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/timesheets');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch timesheets: ${response.statusText}`);
        }
        
        const data: ApiResponse = await response.json();
        
        // Check if user is an operator by looking for SUBMITTED timesheets
        // that have a shift with a home that belongs to this operator
        const hasApprovableTimesheets = data.timesheets.some(
          ts => ts.status === 'SUBMITTED' && ts.shift?.home
        );
        setIsOperator(hasApprovableTimesheets);
        
        // Convert API data to app state format
        const formattedTimesheets = data.timesheets.map(timesheet => ({
          id: timesheet.id,
          shiftId: timesheet.shiftId,
          homeName: timesheet.shift?.home?.name || null,
          startTime: new Date(timesheet.startTime),
          endTime: timesheet.endTime ? new Date(timesheet.endTime) : null,
          breakMinutes: timesheet.breakMinutes,
          status: timesheet.status,
          notes: timesheet.notes,
          approvedAt: timesheet.approvedAt ? new Date(timesheet.approvedAt) : null
        }));
        
        setTimesheets(formattedTimesheets);
      } catch (err) {
        console.error('Error fetching timesheets:', err);
        setError('Failed to load timesheets. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTimesheets();
  }, [authStatus]);

  // Handle approving a timesheet
  const handleApproveTimesheet = async (id: string) => {
    if (authStatus !== 'authenticated') return;
    
    setIsApproving(id);
    setError(null);
    
    try {
      const response = await fetch(`/api/timesheets/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to approve timesheet: ${response.statusText}`);
      }
      
      // Refresh timesheets after approval
      const timesheetsResponse = await fetch('/api/timesheets');
      
      if (timesheetsResponse.ok) {
        const data: ApiResponse = await timesheetsResponse.json();
        
        // Update state with new data
        const formattedTimesheets = data.timesheets.map(timesheet => ({
          id: timesheet.id,
          shiftId: timesheet.shiftId,
          homeName: timesheet.shift?.home?.name || null,
          startTime: new Date(timesheet.startTime),
          endTime: timesheet.endTime ? new Date(timesheet.endTime) : null,
          breakMinutes: timesheet.breakMinutes,
          status: timesheet.status,
          notes: timesheet.notes,
          approvedAt: timesheet.approvedAt ? new Date(timesheet.approvedAt) : null
        }));
        
        setTimesheets(formattedTimesheets);
      }
    } catch (err) {
      console.error('Error approving timesheet:', err);
      setError(err instanceof Error ? err.message : 'Failed to approve timesheet. Please try again later.');
    } finally {
      setIsApproving(null);
    }
  };

  // Status badge color mapping
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-blue-100 text-blue-800';
      case 'SUBMITTED':
        return 'bg-amber-100 text-amber-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Loading component
  const LoadingState = () => (
    <div className="flex justify-center items-center p-12">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
    </div>
  );

  // Error component
  const ErrorState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <FiAlertCircle className="text-red-500 text-3xl mb-2" />
      <p className="text-gray-700">{message}</p>
      <button 
        onClick={() => window.location.reload()}
        className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
      >
        Try Again
      </button>
    </div>
  );

  return (
    <DashboardLayout title="Timesheets">
      <div className="p-4 md:p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Timesheets</h1>
          {!isLoading && (
            <div className="text-sm text-gray-500">{timesheets.length} timesheets</div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
            {error}
          </div>
        )}

        {/* Timesheets Section */}
        {isLoading ? (
          <LoadingState />
        ) : timesheets.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No timesheets found.</p>
            <a 
              href="/shifts"
              className="mt-4 px-4 py-2 inline-block bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              Go to Shifts
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {timesheets.map((timesheet) => (
              <div key={timesheet.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-900">
                      {timesheet.homeName || 'Unknown Location'}
                    </h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(timesheet.status)}`}>
                      {timesheet.status}
                    </span>
                  </div>
                  
                  <div className="flex items-start space-x-2 text-sm text-gray-500 mb-2">
                    <FiHome className="mt-0.5 flex-shrink-0" />
                    <span>{timesheet.homeName || 'Unknown Location'}</span>
                  </div>
                  
                  <div className="flex items-start space-x-2 text-sm text-gray-500 mb-2">
                    <FiCalendar className="mt-0.5 flex-shrink-0" />
                    <span>{formatDate(timesheet.startTime)}</span>
                  </div>
                  
                  <div className="flex items-start space-x-2 text-sm text-gray-500 mb-2">
                    <FiClock className="mt-0.5 flex-shrink-0" />
                    <span>
                      {formatDateTime(timesheet.startTime)} - {formatDateTime(timesheet.endTime)}
                    </span>
                  </div>
                  
                  <div className="flex items-start space-x-2 text-sm text-gray-500 mb-2">
                    <FiCoffee className="mt-0.5 flex-shrink-0" />
                    <span>Break: {timesheet.breakMinutes} minutes</span>
                  </div>
                  
                  {timesheet.notes && (
                    <div className="flex items-start space-x-2 text-sm text-gray-500 mb-4">
                      <FiFileText className="mt-0.5 flex-shrink-0" />
                      <span>{timesheet.notes}</span>
                    </div>
                  )}
                  
                  {isOperator && timesheet.status === 'SUBMITTED' && (
                    <button 
                      className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center disabled:bg-primary-400"
                      onClick={() => handleApproveTimesheet(timesheet.id)}
                      disabled={isApproving === timesheet.id}
                    >
                      {isApproving === timesheet.id ? (
                        <>
                          <span className="mr-2 h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                          Approving...
                        </>
                      ) : (
                        <>
                          Approve Timesheet
                          <FiCheckCircle className="ml-2" />
                        </>
                      )}
                    </button>
                  )}
                  
                  {timesheet.status === 'APPROVED' && (
                    <div className="text-sm text-gray-500 mt-2">
                      Approved: {formatDate(timesheet.approvedAt)} at {formatDateTime(timesheet.approvedAt)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
