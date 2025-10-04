"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import RealTimeInquiryUpdates from '../../../components/inquiries/RealTimeInquiryUpdates';
import { 
  FiFilter, 
  FiMessageSquare, 
  FiCalendar, 
  FiClock, 
  FiCheck, 
  FiX, 
  FiChevronRight, 
  FiSearch,
  FiPlus,
  FiMoreVertical,
  FiStar,
  FiHome,
  FiUsers,
  FiShare2,
  FiAlertCircle,
  FiCheckCircle,
  FiClock as FiClockOutline,
  FiPhone,
  FiMail,
  FiRefreshCw,
  FiTrash2,
  FiHelpCircle
} from 'react-icons/fi';

// Inquiry status types
type InquiryStatus = 
  | 'SUBMITTED' 
  | 'CONTACTED' 
  | 'TOUR_SCHEDULED' 
  | 'FOLLOW_UP' 
  | 'DECIDED' 
  | 'CANCELLED';

// Inquiry type definition
interface Inquiry {
  id: string;
  home: {
    id: string;
    name: string;
    address: string;
    image: string;
  };
  status: InquiryStatus;
  submittedDate: string;
  tourDate?: string;
  tourTime?: string;
  lastUpdated: string;
  unreadMessages: number;
  notes?: string;
  sharedWith?: { name: string; email: string }[];
  careNeeded: string[];
  moveInTimeframe: string;
  contactName?: string;
  contactMethod?: 'EMAIL' | 'PHONE' | 'BOTH';
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
}

// Mock data for inquiries
const MOCK_INQUIRIES: Inquiry[] = [
  {
    id: "inq-001",
    home: {
      id: "1",
      name: "Sunshine Care Home",
      address: "123 Maple Street, San Francisco, CA 94102",
      image: "https://placehold.co/300x200/e9ecef/495057?text=Sunshine+Care"
    },
    status: "TOUR_SCHEDULED",
    submittedDate: "2025-07-20T14:30:00Z",
    tourDate: "2025-08-02",
    tourTime: "10:00 AM",
    lastUpdated: "2025-07-24T09:15:00Z",
    unreadMessages: 2,
    careNeeded: ["Assisted Living", "Medication Management"],
    moveInTimeframe: "1-3 months",
    contactName: "Sarah Johnson",
    contactMethod: "BOTH",
    priority: "HIGH"
  },
  {
    id: "inq-002",
    home: {
      id: "2",
      name: "Golden Years Living",
      address: "456 Oak Avenue, San Francisco, CA 94103",
      image: "https://placehold.co/300x200/e9ecef/495057?text=Golden+Years"
    },
    status: "CONTACTED",
    submittedDate: "2025-07-18T10:15:00Z",
    lastUpdated: "2025-07-23T16:45:00Z",
    unreadMessages: 0,
    notes: "Waiting for tour availability",
    careNeeded: ["Memory Care"],
    moveInTimeframe: "Immediately",
    contactName: "Michael Rodriguez",
    contactMethod: "PHONE",
    priority: "MEDIUM"
  },
  {
    id: "inq-003",
    home: {
      id: "3",
      name: "Serenity House",
      address: "789 Pine Street, San Francisco, CA 94104",
      image: "https://placehold.co/300x200/e9ecef/495057?text=Serenity+House"
    },
    status: "SUBMITTED",
    submittedDate: "2025-07-24T08:45:00Z",
    lastUpdated: "2025-07-24T08:45:00Z",
    unreadMessages: 0,
    careNeeded: ["Assisted Living", "Incontinence Care"],
    moveInTimeframe: "3-6 months",
    priority: "LOW"
  },
  {
    id: "inq-004",
    home: {
      id: "4",
      name: "Peaceful Haven",
      address: "101 Cedar Road, San Francisco, CA 94105",
      image: "https://placehold.co/300x200/e9ecef/495057?text=Peaceful+Haven"
    },
    status: "FOLLOW_UP",
    submittedDate: "2025-07-15T11:30:00Z",
    tourDate: "2025-07-22",
    tourTime: "2:00 PM",
    lastUpdated: "2025-07-22T15:10:00Z",
    unreadMessages: 3,
    notes: "Tour completed, following up on questions about pricing",
    sharedWith: [
      { name: "Robert Smith", email: "robert@example.com" }
    ],
    careNeeded: ["Assisted Living", "Medication Management", "Physical Therapy"],
    moveInTimeframe: "1-3 months",
    contactName: "Lisa Wong",
    contactMethod: "EMAIL",
    priority: "HIGH"
  },
  {
    id: "inq-005",
    home: {
      id: "5",
      name: "Harmony Gardens",
      address: "202 Birch Lane, San Francisco, CA 94106",
      image: "https://placehold.co/300x200/e9ecef/495057?text=Harmony+Gardens"
    },
    status: "DECIDED",
    submittedDate: "2025-07-10T09:00:00Z",
    tourDate: "2025-07-17",
    tourTime: "11:00 AM",
    lastUpdated: "2025-07-23T14:20:00Z",
    unreadMessages: 0,
    notes: "Selected this home, moving forward with paperwork",
    sharedWith: [
      { name: "Jennifer Lee", email: "jennifer@example.com" },
      { name: "David Lee", email: "david@example.com" }
    ],
    careNeeded: ["Memory Care", "Medication Management"],
    moveInTimeframe: "Immediately",
    contactName: "Thomas Chen",
    contactMethod: "BOTH",
    priority: "HIGH"
  },
  {
    id: "inq-006",
    home: {
      id: "6",
      name: "Riverside Retreat",
      address: "303 Willow Street, San Francisco, CA 94107",
      image: "https://placehold.co/300x200/e9ecef/495057?text=Riverside+Retreat"
    },
    status: "CANCELLED",
    submittedDate: "2025-07-12T13:45:00Z",
    lastUpdated: "2025-07-19T10:30:00Z",
    unreadMessages: 0,
    notes: "No longer interested, found another option",
    careNeeded: ["Assisted Living"],
    moveInTimeframe: "6+ months",
    priority: "LOW"
  }
];

// Status display information
const STATUS_INFO = {
  SUBMITTED: {
    label: "Submitted",
    color: "bg-blue-100 text-blue-800",
    icon: <FiClockOutline className="h-4 w-4" />,
    description: "Your inquiry has been submitted to the care home"
  },
  CONTACTED: {
    label: "Contacted",
    color: "bg-purple-100 text-purple-800",
    icon: <FiPhone className="h-4 w-4" />,
    description: "The care home has received your inquiry"
  },
  TOUR_SCHEDULED: {
    label: "Tour Scheduled",
    color: "bg-amber-100 text-amber-800",
    icon: <FiCalendar className="h-4 w-4" />,
    description: "You have a scheduled tour with this care home"
  },
  FOLLOW_UP: {
    label: "Follow-up",
    color: "bg-indigo-100 text-indigo-800",
    icon: <FiMessageSquare className="h-4 w-4" />,
    description: "Additional follow-up is needed"
  },
  DECIDED: {
    label: "Decided",
    color: "bg-green-100 text-green-800",
    icon: <FiCheckCircle className="h-4 w-4" />,
    description: "You've made a decision about this care home"
  },
  CANCELLED: {
    label: "Cancelled",
    color: "bg-neutral-100 text-neutral-800",
    icon: <FiX className="h-4 w-4" />,
    description: "This inquiry has been cancelled"
  }
};

// Priority badges
const PRIORITY_BADGES = {
  HIGH: { color: "bg-red-100 text-red-800", label: "High Priority" },
  MEDIUM: { color: "bg-amber-100 text-amber-800", label: "Medium Priority" },
  LOW: { color: "bg-blue-100 text-blue-800", label: "Low Priority" }
};

export default function InquiriesDashboard() {
  const router = useRouter();
  
  // State for inquiries and filters
  const [inquiries, setInquiries] = useState<Inquiry[]>(MOCK_INQUIRIES);
  const [filteredInquiries, setFilteredInquiries] = useState<Inquiry[]>(MOCK_INQUIRIES);
  const [statusFilter, setStatusFilter] = useState<InquiryStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'name'>('date');
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Effect to handle filtering and sorting
  useEffect(() => {
    setIsLoading(true);
    
    // Filter by status and search query
    let filtered = inquiries;
    
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(inquiry => inquiry.status === statusFilter);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(inquiry => 
        inquiry.home.name.toLowerCase().includes(query) || 
        inquiry.home.address.toLowerCase().includes(query)
      );
    }
    
    // Sort inquiries
    switch (sortBy) {
      case 'date':
        filtered = [...filtered].sort((a, b) => 
          new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
        );
        break;
      case 'priority':
        const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1, undefined: 0 };
        filtered = [...filtered].sort((a, b) => 
          (priorityOrder[b.priority || 'undefined'] || 0) - (priorityOrder[a.priority || 'undefined'] || 0)
        );
        break;
      case 'name':
        filtered = [...filtered].sort((a, b) => 
          a.home.name.localeCompare(b.home.name)
        );
        break;
    }
    
    setFilteredInquiries(filtered);
    setIsLoading(false);
  }, [inquiries, statusFilter, searchQuery, sortBy]);

  // Handle inquiry click
  const handleInquiryClick = (inquiryId: string) => {
    router.push(`/dashboard/inquiries/${inquiryId}`);
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  // Get days since last update
  const getDaysSinceUpdate = (dateString: string) => {
    const updateDate = new Date(dateString);
    const today = new Date();
    const diffTime = today.getTime() - updateDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };
  
  // Get progress percentage based on status
  const getProgressPercentage = (status: InquiryStatus) => {
    const statusValues = {
      SUBMITTED: 20,
      CONTACTED: 40,
      TOUR_SCHEDULED: 60,
      FOLLOW_UP: 80,
      DECIDED: 100,
      CANCELLED: 100
    };
    
    return statusValues[status] || 0;
  };

  return (
    <DashboardLayout title="Inquiries">
      {/* Page header */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h1 className="text-2xl font-bold text-neutral-800">My Inquiries</h1>
              <p className="text-neutral-600">Track and manage your care home inquiries</p>
            </div>
            
            <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row">
              <div className="relative w-full rounded-md md:w-64">
                <input
                  type="text"
                  placeholder="Search inquiries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 pl-10 pr-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <FiSearch className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
              </div>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center justify-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                <FiFilter className="mr-2 h-4 w-4" />
                Filter
              </button>
              
              <Link
                href="/dashboard/inquiries/new"
                className="flex items-center justify-center rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
              >
                <FiPlus className="mr-2 h-4 w-4" />
                New Inquiry
              </Link>
            </div>
          </div>
          
          {/* Filter options */}
          {showFilters && (
            <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-4">
              <div className="flex flex-wrap gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700">Status</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setStatusFilter('ALL')}
                      className={`rounded-full px-3 py-1 text-sm font-medium ${
                        statusFilter === 'ALL'
                          ? 'bg-primary-100 text-primary-800'
                          : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                      }`}
                    >
                      All
                    </button>
                    {Object.entries(STATUS_INFO).map(([status, info]) => (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status as InquiryStatus)}
                        className={`flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                          statusFilter === status
                            ? 'bg-primary-100 text-primary-800'
                            : `${info.color} opacity-80 hover:opacity-100`
                        }`}
                      >
                        {info.icon}
                        <span className="ml-1">{info.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="ml-auto">
                  <label className="mb-1 block text-sm font-medium text-neutral-700">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'date' | 'priority' | 'name')}
                    className="rounded-md border border-neutral-300 py-1 pl-3 pr-8 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="date">Last Updated</option>
                    <option value="priority">Priority</option>
                    <option value="name">Home Name</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
    {/* Real-time inquiry updates */}
    <div className="container mx-auto px-4 py-6">
      <RealTimeInquiryUpdates className="mb-6" />
    </div>
    
      {/* Main content */}
      <div className="container mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-neutral-300 border-t-primary-500"></div>
          </div>
        ) : filteredInquiries.length === 0 ? (
          <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
              <FiSearch className="h-8 w-8 text-neutral-400" />
            </div>
            <h2 className="mb-2 text-lg font-medium text-neutral-800">No inquiries found</h2>
            <p className="mb-6 text-neutral-600">
              {statusFilter !== 'ALL' 
                ? `You don't have any inquiries with status "${STATUS_INFO[statusFilter].label}".` 
                : "You haven't made any inquiries yet."}
            </p>
            <Link
              href="/dashboard/inquiries/new"
              className="inline-flex items-center rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
            >
              <FiPlus className="mr-2 h-4 w-4" />
              Start a New Inquiry
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredInquiries.map((inquiry) => (
              <div
                key={inquiry.id}
                className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex flex-col md:flex-row">
                  {/* Home image (left side) */}
                  <div className="relative h-48 w-full md:h-auto md:w-48">
                    <Image
                      src={inquiry.home.image}
                      alt={inquiry.home.name}
                      fill
                      className="object-cover"
                    />
                    {inquiry.priority && (
                      <div className={`absolute top-2 left-2 rounded-full px-2 py-1 text-xs font-medium ${PRIORITY_BADGES[inquiry.priority].color}`}>
                        {PRIORITY_BADGES[inquiry.priority].label}
                      </div>
                    )}
                  </div>
                  
                  {/* Inquiry details (right side) */}
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h2 className="text-lg font-semibold text-neutral-800">{inquiry.home.name}</h2>
                        <p className="text-sm text-neutral-600">{inquiry.home.address}</p>
                      </div>
                      
                      <div className={`flex items-center rounded-full px-3 py-1 text-xs font-medium ${STATUS_INFO[inquiry.status].color}`}>
                        {STATUS_INFO[inquiry.status].icon}
                        <span className="ml-1">{STATUS_INFO[inquiry.status].label}</span>
                      </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="mt-3 mb-4">
                      <div className="mb-1 flex items-center justify-between">
                        <p className="text-xs text-neutral-600">Inquiry Progress</p>
                        <p className="text-xs font-medium text-neutral-700">
                          {inquiry.status !== 'CANCELLED' ? `${getProgressPercentage(inquiry.status)}%` : 'Cancelled'}
                        </p>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                        <div 
                          className={`h-full rounded-full ${
                            inquiry.status === 'CANCELLED' ? 'bg-neutral-400' : 'bg-primary-500'
                          }`}
                          style={{ width: `${getProgressPercentage(inquiry.status)}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Details grid */}
                    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                      <div>
                        <p className="text-xs text-neutral-500">Submitted</p>
                        <p className="text-sm font-medium text-neutral-700">{formatDate(inquiry.submittedDate)}</p>
                      </div>
                      
                      {inquiry.tourDate && (
                        <div>
                          <p className="text-xs text-neutral-500">Tour Date</p>
                          <p className="text-sm font-medium text-neutral-700">
                            {formatDate(inquiry.tourDate)} {inquiry.tourTime && `at ${inquiry.tourTime}`}
                          </p>
                        </div>
                      )}
                      
                      <div>
                        <p className="text-xs text-neutral-500">Last Updated</p>
                        <p className="text-sm font-medium text-neutral-700">{getDaysSinceUpdate(inquiry.lastUpdated)}</p>
                      </div>
                      
                      <div>
                        <p className="text-xs text-neutral-500">Care Needed</p>
                        <p className="text-sm font-medium text-neutral-700">
                          {inquiry.careNeeded.join(", ")}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-xs text-neutral-500">Move-in Timeframe</p>
                        <p className="text-sm font-medium text-neutral-700">{inquiry.moveInTimeframe}</p>
                      </div>
                      
                      {inquiry.contactName && (
                        <div>
                          <p className="text-xs text-neutral-500">Contact Person</p>
                          <p className="text-sm font-medium text-neutral-700">{inquiry.contactName}</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Notes (if any) */}
                    {inquiry.notes && (
                      <div className="mb-4 rounded-md bg-neutral-50 p-3">
                        <p className="text-xs font-medium text-neutral-700">Notes</p>
                        <p className="text-sm text-neutral-600">{inquiry.notes}</p>
                      </div>
                    )}
                    
                    {/* Action buttons */}
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-2">
                        {inquiry.unreadMessages > 0 && (
                          <div className="flex items-center rounded-full bg-primary-100 px-3 py-1 text-xs font-medium text-primary-800">
                            <FiMessageSquare className="mr-1 h-3 w-3" />
                            {inquiry.unreadMessages} new {inquiry.unreadMessages === 1 ? 'message' : 'messages'}
                          </div>
                        )}
                        
                        {inquiry.sharedWith && inquiry.sharedWith.length > 0 && (
                          <div className="flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
                            <FiUsers className="mr-1 h-3 w-3" />
                            Shared with {inquiry.sharedWith.length} {inquiry.sharedWith.length === 1 ? 'person' : 'people'}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <button 
                          onClick={() => router.push(`/dashboard/inquiries/${inquiry.id}/messages`)}
                          className="flex items-center rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                        >
                          <FiMessageSquare className="mr-1 h-3 w-3" />
                          Message
                        </button>
                        
                        {(inquiry.status === 'SUBMITTED' || inquiry.status === 'CONTACTED') && (
                          <button 
                            onClick={() => router.push(`/dashboard/inquiries/${inquiry.id}/schedule`)}
                            className="flex items-center rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                          >
                            <FiCalendar className="mr-1 h-3 w-3" />
                            Schedule Tour
                          </button>
                        )}
                        
                        <button 
                          onClick={() => handleInquiryClick(inquiry.id)}
                          className="flex items-center rounded-md bg-primary-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-600"
                        >
                          View Details
                          <FiChevronRight className="ml-1 h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Help section */}
      <div className="container mx-auto mt-6 px-4">
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <div className="flex items-start">
            <div className="mr-4 rounded-full bg-primary-100 p-3 text-primary-600">
              <FiHelpCircle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="mb-2 text-lg font-medium text-neutral-800">Need Help with Your Inquiries?</h3>
              <p className="mb-4 text-neutral-600">
                Our care advisors are available to help you manage your inquiries, schedule tours, and find the perfect home for your loved one.
              </p>
              <button className="flex items-center rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600">
                <FiMessageSquare className="mr-2 h-4 w-4" />
                Chat with a Care Advisor
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
