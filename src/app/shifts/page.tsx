"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { 
  FiMapPin, 
  FiClock, 
  FiDollarSign, 
  FiCalendar,
  FiArrowRight,
  FiAlertCircle
} from "react-icons/fi";

// API response interfaces
interface ApiShift {
  id: string;
  homeId: string;
  homeName: string;
  address: string;
  startTime: string;
  endTime: string;
  hourlyRate: string;
  status: string;
}

interface ApiResponse {
  shifts: ApiShift[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// App state interface
interface Shift {
  id: string;
  homeId: string;
  homeName: string;
  address: string;
  startTime: Date;
  endTime: Date;
  hourlyRate: number;
  status: string;
}

// Format date and time - handle both Date objects and strings
const formatDateTime = (date: Date | string) => {
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Format date - handle both Date objects and strings
const formatDate = (date: Date | string) => {
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

export default function ShiftsPage() {
  const { data: session, status: authStatus } = useSession();
  const [activeTab, setActiveTab] = useState<'open' | 'my'>('open');
  
  // State for API data
  const [openShifts, setOpenShifts] = useState<Shift[]>([]);
  const [myShifts, setMyShifts] = useState<Shift[]>([]);
  const [isLoadingOpen, setIsLoadingOpen] = useState(true);
  const [isLoadingMy, setIsLoadingMy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClaimingShift, setIsClaimingShift] = useState<string | null>(null);

  // Fetch open shifts
  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    
    const fetchOpenShifts = async () => {
      setIsLoadingOpen(true);
      setError(null);
      
      try {
        const response = await fetch('/api/shifts/open');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch open shifts: ${response.statusText}`);
        }
        
        const data: ApiResponse = await response.json();
        
        // Convert API data to app state format
        const formattedShifts = data.shifts.map(shift => ({
          id: shift.id,
          homeId: shift.homeId,
          homeName: shift.homeName,
          address: shift.address,
          startTime: new Date(shift.startTime),
          endTime: new Date(shift.endTime),
          hourlyRate: parseFloat(shift.hourlyRate),
          status: shift.status
        }));
        
        setOpenShifts(formattedShifts);
      } catch (err) {
        console.error('Error fetching open shifts:', err);
        setError('Failed to load open shifts. Please try again later.');
      } finally {
        setIsLoadingOpen(false);
      }
    };
    
    fetchOpenShifts();
  }, [authStatus]);

  // Fetch my shifts
  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    
    const fetchMyShifts = async () => {
      setIsLoadingMy(true);
      setError(null);
      
      try {
        const response = await fetch('/api/shifts/my');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch my shifts: ${response.statusText}`);
        }
        
        const data: ApiResponse = await response.json();
        
        // Convert API data to app state format
        const formattedShifts = data.shifts.map(shift => ({
          id: shift.id,
          homeId: shift.homeId,
          homeName: shift.homeName,
          address: shift.address,
          startTime: new Date(shift.startTime),
          endTime: new Date(shift.endTime),
          hourlyRate: parseFloat(shift.hourlyRate),
          status: shift.status
        }));
        
        setMyShifts(formattedShifts);
      } catch (err) {
        console.error('Error fetching my shifts:', err);
        setError('Failed to load your shifts. Please try again later.');
      } finally {
        setIsLoadingMy(false);
      }
    };
    
    fetchMyShifts();
  }, [authStatus]);

  // Handle claiming a shift
  const handleClaimShift = async (shiftId: string) => {
    if (authStatus !== 'authenticated') return;
    
    setIsClaimingShift(shiftId);
    setError(null);
    
    try {
      const response = await fetch(`/api/shifts/${shiftId}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to claim shift: ${response.statusText}`);
      }
      
      // Refresh both lists after claiming a shift
      const openResponse = await fetch('/api/shifts/open');
      const myResponse = await fetch('/api/shifts/my');
      
      if (openResponse.ok && myResponse.ok) {
        const openData: ApiResponse = await openResponse.json();
        const myData: ApiResponse = await myResponse.json();
        
        // Update state with new data
        setOpenShifts(openData.shifts.map(shift => ({
          id: shift.id,
          homeId: shift.homeId,
          homeName: shift.homeName,
          address: shift.address,
          startTime: new Date(shift.startTime),
          endTime: new Date(shift.endTime),
          hourlyRate: parseFloat(shift.hourlyRate),
          status: shift.status
        })));
        
        setMyShifts(myData.shifts.map(shift => ({
          id: shift.id,
          homeId: shift.homeId,
          homeName: shift.homeName,
          address: shift.address,
          startTime: new Date(shift.startTime),
          endTime: new Date(shift.endTime),
          hourlyRate: parseFloat(shift.hourlyRate),
          status: shift.status
        })));
        
        // Switch to "My Shifts" tab after successful claim
        setActiveTab('my');
      }
    } catch (err) {
      console.error('Error claiming shift:', err);
      setError(err instanceof Error ? err.message : 'Failed to claim shift. Please try again later.');
    } finally {
      setIsClaimingShift(null);
    }
  };

  // Status badge color mapping
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-blue-100 text-blue-800';
      case 'ASSIGNED':
        return 'bg-amber-100 text-amber-800';
      case 'IN_PROGRESS':
        return 'bg-purple-100 text-purple-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'CANCELED':
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
    <DashboardLayout title="Shifts">
      <div className="p-4 md:p-6">
        {/* Tab navigation */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            className={`py-2 px-4 font-medium text-sm ${
              activeTab === 'open'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('open')}
          >
            Open Shifts
          </button>
          <button
            className={`py-2 px-4 font-medium text-sm ${
              activeTab === 'my'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('my')}
          >
            My Shifts
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
            {error}
          </div>
        )}

        {/* Open Shifts Section */}
        {activeTab === 'open' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Available Shifts</h2>
              {!isLoadingOpen && (
                <div className="text-sm text-gray-500">{openShifts.length} shifts available</div>
              )}
            </div>

            {isLoadingOpen ? (
              <LoadingState />
            ) : openShifts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No open shifts available at this time.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {openShifts.map((shift) => (
                  <div key={shift.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-gray-900">{shift.homeName}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(shift.status)}`}>
                          {shift.status}
                        </span>
                      </div>
                      
                      <div className="flex items-start space-x-2 text-sm text-gray-500 mb-2">
                        <FiMapPin className="mt-0.5 flex-shrink-0" />
                        <span>{shift.address}</span>
                      </div>
                      
                      <div className="flex items-start space-x-2 text-sm text-gray-500 mb-2">
                        <FiCalendar className="mt-0.5 flex-shrink-0" />
                        <span>{formatDate(shift.startTime)}</span>
                      </div>
                      
                      <div className="flex items-start space-x-2 text-sm text-gray-500 mb-2">
                        <FiClock className="mt-0.5 flex-shrink-0" />
                        <span>{formatDateTime(shift.startTime)} - {formatDateTime(shift.endTime)}</span>
                      </div>
                      
                      <div className="flex items-start space-x-2 text-sm text-gray-500 mb-4">
                        <FiDollarSign className="mt-0.5 flex-shrink-0" />
                        <span>${shift.hourlyRate.toFixed(2)}/hr</span>
                      </div>
                      
                      <button 
                        className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center disabled:bg-primary-400"
                        onClick={() => handleClaimShift(shift.id)}
                        disabled={isClaimingShift === shift.id}
                      >
                        {isClaimingShift === shift.id ? (
                          <>
                            <span className="mr-2 h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                            Applying...
                          </>
                        ) : (
                          <>
                            Apply for Shift
                            <FiArrowRight className="ml-2" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* My Shifts Section */}
        {activeTab === 'my' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">My Shifts</h2>
              {!isLoadingMy && (
                <div className="text-sm text-gray-500">{myShifts.length} shifts</div>
              )}
            </div>

            {isLoadingMy ? (
              <LoadingState />
            ) : myShifts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">You haven't claimed any shifts yet.</p>
                <button 
                  onClick={() => setActiveTab('open')}
                  className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Browse Open Shifts
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myShifts.map((shift) => (
                  <div key={shift.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-gray-900">{shift.homeName}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(shift.status)}`}>
                          {shift.status}
                        </span>
                      </div>
                      
                      <div className="flex items-start space-x-2 text-sm text-gray-500 mb-2">
                        <FiMapPin className="mt-0.5 flex-shrink-0" />
                        <span>{shift.address}</span>
                      </div>
                      
                      <div className="flex items-start space-x-2 text-sm text-gray-500 mb-2">
                        <FiCalendar className="mt-0.5 flex-shrink-0" />
                        <span>{formatDate(shift.startTime)}</span>
                      </div>
                      
                      <div className="flex items-start space-x-2 text-sm text-gray-500 mb-2">
                        <FiClock className="mt-0.5 flex-shrink-0" />
                        <span>{formatDateTime(shift.startTime)} - {formatDateTime(shift.endTime)}</span>
                      </div>
                      
                      <div className="flex items-start space-x-2 text-sm text-gray-500 mb-4">
                        <FiDollarSign className="mt-0.5 flex-shrink-0" />
                        <span>${shift.hourlyRate.toFixed(2)}/hr</span>
                      </div>
                      
                      <button className={`w-full ${
                        shift.status === 'COMPLETED' 
                          ? 'bg-gray-100 text-gray-700' 
                          : 'bg-primary-600 hover:bg-primary-700 text-white'
                      } font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center`}
                      disabled={shift.status === 'COMPLETED'}>
                        {shift.status === 'COMPLETED' ? 'Completed' : 'View Details'}
                        {shift.status !== 'COMPLETED' && <FiArrowRight className="ml-2" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
