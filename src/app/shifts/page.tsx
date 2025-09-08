"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { 
  FiMapPin, 
  FiClock, 
  FiDollarSign, 
  FiCalendar,
  FiArrowRight
} from "react-icons/fi";

// Mock data for open shifts
const openShiftsMock = [
  {
    id: "os1",
    homeName: "Sunshine Care Home",
    address: "123 Main St, San Francisco, CA",
    startTime: new Date("2025-09-10T08:00:00"),
    endTime: new Date("2025-09-10T16:00:00"),
    hourlyRate: 25.50,
    status: "OPEN"
  },
  {
    id: "os2",
    homeName: "Golden Years Living",
    address: "456 Oak Ave, San Francisco, CA",
    startTime: new Date("2025-09-11T07:00:00"),
    endTime: new Date("2025-09-11T15:00:00"),
    hourlyRate: 27.00,
    status: "OPEN"
  },
  {
    id: "os3",
    homeName: "Serene Valley Care",
    address: "789 Pine Rd, Oakland, CA",
    startTime: new Date("2025-09-12T14:00:00"),
    endTime: new Date("2025-09-12T22:00:00"),
    hourlyRate: 26.50,
    status: "OPEN"
  },
  {
    id: "os4",
    homeName: "Bayside Assisted Living",
    address: "321 Harbor Blvd, Berkeley, CA",
    startTime: new Date("2025-09-13T09:00:00"),
    endTime: new Date("2025-09-13T17:00:00"),
    hourlyRate: 28.00,
    status: "OPEN"
  }
];

// Mock data for my shifts
const myShiftsMock = [
  {
    id: "ms1",
    homeName: "Harmony Care Center",
    address: "567 Elm St, San Jose, CA",
    startTime: new Date("2025-09-09T08:00:00"),
    endTime: new Date("2025-09-09T16:00:00"),
    hourlyRate: 26.00,
    status: "ASSIGNED"
  },
  {
    id: "ms2",
    homeName: "Sunshine Care Home",
    address: "123 Main St, San Francisco, CA",
    startTime: new Date("2025-09-14T09:00:00"),
    endTime: new Date("2025-09-14T17:00:00"),
    hourlyRate: 25.50,
    status: "ASSIGNED"
  },
  {
    id: "ms3",
    homeName: "Golden Years Living",
    address: "456 Oak Ave, San Francisco, CA",
    startTime: new Date("2025-09-08T07:00:00"),
    endTime: new Date("2025-09-08T15:00:00"),
    hourlyRate: 27.00,
    status: "COMPLETED"
  }
];

// Format date and time
const formatDateTime = (date: Date) => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Format date
const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

export default function ShiftsPage() {
  const [activeTab, setActiveTab] = useState<'open' | 'my'>('open');

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

        {/* Open Shifts Section */}
        {activeTab === 'open' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Available Shifts</h2>
              <div className="text-sm text-gray-500">{openShiftsMock.length} shifts available</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {openShiftsMock.map((shift) => (
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
                    
                    <button className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center">
                      Apply for Shift
                      <FiArrowRight className="ml-2" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Shifts Section */}
        {activeTab === 'my' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">My Shifts</h2>
              <div className="text-sm text-gray-500">{myShiftsMock.length} shifts</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myShiftsMock.map((shift) => (
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
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
