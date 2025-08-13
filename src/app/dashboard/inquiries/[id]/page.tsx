"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { 
  FiArrowLeft,
  FiMessageSquare, 
  FiCalendar, 
  FiClock, 
  FiCheck, 
  FiX, 
  FiChevronRight,
  FiShare2,
  FiPhone,
  FiHome,
  FiUsers,
  FiFileText,
  FiPaperclip,
  FiClock as FiClockOutline,
  FiPlus,
  FiUserPlus,
  FiEye,
  FiThumbsUp,
  FiShield,
  FiSettings,
  FiActivity,
  FiCheckCircle,
  FiMail,
  FiChevronDown,
  FiCopy,
  FiAlertCircle
} from 'react-icons/fi';
import DashboardLayout from '../../../../components/layout/DashboardLayout';

// Types
type InquiryStatus = 
  | 'SUBMITTED' 
  | 'CONTACTED' 
  | 'TOUR_SCHEDULED' 
  | 'FOLLOW_UP' 
  | 'DECIDED' 
  | 'CANCELLED';

// Permission levels for family members
type PermissionLevel = 'VIEW' | 'COMMENT' | 'VOTE' | 'ADMIN';

interface TimelineEvent {
  id: string;
  type: 'STATUS_CHANGE' | 'MESSAGE' | 'TOUR' | 'NOTE' | 'DOCUMENT' | 'COLLABORATION';
  date: string;
  title: string;
  description?: string;
  status?: InquiryStatus;
  user?: {
    name: string;
    role: string;
    avatar?: string;
  };
}

interface Message {
  id: string;
  sender: {
    id: string;
    name: string;
    role: 'USER' | 'CARE_HOME' | 'CARE_ADVISOR';
    avatar?: string;
  };
  content: string;
  timestamp: string;
  read: boolean;
  attachments?: {
    name: string;
    url: string;
    type: string;
  }[];
}

// Family member interface with permissions
interface FamilyMember {
  id: string;
  name: string; 
  email: string;
  relationship: string;
  permissionLevel: PermissionLevel;
  avatar?: string;
  lastActive?: string;
  isActive?: boolean;
}

interface Inquiry {
  id: string;
  home: {
    id: string;
    name: string;
    address: string;
    image: string;
    phone: string;
    email: string;
    contactPerson: string;
  };
  status: InquiryStatus;
  submittedDate: string;
  tourDate?: string;
  tourTime?: string;
  lastUpdated: string;
  unreadMessages: number;
  notes?: string;
  sharedWith?: FamilyMember[];
  careNeeded: string[];
  moveInTimeframe: string;
  contactName?: string;
  contactMethod?: 'EMAIL' | 'PHONE' | 'BOTH';
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  timeline: TimelineEvent[];
  messages: Message[];
  documents?: {
    id: string;
    name: string;
    type: string;
    uploadedBy: string;
    uploadedAt: string;
    url: string;
  }[];
  nextSteps?: {
    type: string;
    description: string;
    dueDate?: string;
    completed: boolean;
  }[];
}

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

// Permission level info
const PERMISSION_LEVELS = {
  VIEW: { 
    label: "Viewer", 
    color: "bg-blue-100 text-blue-800", 
    icon: <FiEye className="h-4 w-4" />,
    description: "Can view all inquiry details but cannot make changes"
  },
  COMMENT: { 
    label: "Commenter", 
    color: "bg-green-100 text-green-800", 
    icon: <FiMessageSquare className="h-4 w-4" />,
    description: "Can view and add comments/notes to the inquiry"
  },
  VOTE: { 
    label: "Decision Maker", 
    color: "bg-purple-100 text-purple-800", 
    icon: <FiThumbsUp className="h-4 w-4" />,
    description: "Can view, comment, and vote on decisions"
  },
  ADMIN: { 
    label: "Administrator", 
    color: "bg-amber-100 text-amber-800", 
    icon: <FiShield className="h-4 w-4" />,
    description: "Full access to manage the inquiry and other collaborators"
  }
};

// Modal component for reuse
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50">
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-medium text-neutral-800">{title}</h3>
          <button 
            onClick={onClose}
            className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

// Mock data for a single inquiry
const MOCK_INQUIRY: Inquiry = {
  id: "inq-001",
  home: {
    id: "1",
    name: "Sunshine Care Home",
    address: "123 Maple Street, San Francisco, CA 94102",
    image: "https://placehold.co/800x400/e9ecef/495057?text=Sunshine+Care+Home",
    phone: "(415) 555-1234",
    email: "info@sunshinecarehome.com",
    contactPerson: "Sarah Johnson"
  },
  status: "TOUR_SCHEDULED",
  submittedDate: "2025-07-20T14:30:00Z",
  tourDate: "2025-08-02",
  tourTime: "10:00 AM",
  lastUpdated: "2025-07-24T09:15:00Z",
  unreadMessages: 2,
  notes: "Mom needs a private room with a bathroom. Prefers a facility with a garden area.",
  sharedWith: [
    { 
      id: "user-001",
      name: "Robert Smith", 
      email: "robert@example.com",
      relationship: "Brother",
      permissionLevel: "ADMIN",
      avatar: "https://placehold.co/100x100/e9ecef/495057?text=RS",
      lastActive: "2025-07-23T16:20:00Z",
      isActive: true
    },
    { 
      id: "user-002",
      name: "Jennifer Lee", 
      email: "jennifer@example.com",
      relationship: "Sister",
      permissionLevel: "VOTE",
      lastActive: "2025-07-21T14:45:00Z",
      isActive: false
    }
  ],
  careNeeded: ["Assisted Living", "Medication Management"],
  moveInTimeframe: "1-3 months",
  contactName: "Sarah Johnson",
  contactMethod: "BOTH",
  priority: "HIGH",
  nextSteps: [
    {
      type: "TOUR",
      description: "Attend scheduled tour",
      dueDate: "2025-08-02",
      completed: false
    },
    {
      type: "DOCUMENT",
      description: "Submit medical assessment",
      dueDate: "2025-08-05",
      completed: false
    }
  ],
  timeline: [
    {
      id: "event-001",
      type: "STATUS_CHANGE",
      date: "2025-07-20T14:30:00Z",
      title: "Inquiry Submitted",
      description: "You submitted an inquiry to Sunshine Care Home",
      status: "SUBMITTED",
      user: {
        name: "You",
        role: "Primary Contact"
      }
    },
    {
      id: "event-002",
      type: "STATUS_CHANGE",
      date: "2025-07-21T10:15:00Z",
      title: "Inquiry Received",
      description: "Sunshine Care Home has received your inquiry",
      status: "CONTACTED",
      user: {
        name: "Sarah Johnson",
        role: "Facility Administrator"
      }
    },
    {
      id: "event-003",
      type: "MESSAGE",
      date: "2025-07-21T10:20:00Z",
      title: "New Message",
      description: "Sarah Johnson sent you a message",
      user: {
        name: "Sarah Johnson",
        role: "Facility Administrator"
      }
    },
    {
      id: "event-006",
      type: "STATUS_CHANGE",
      date: "2025-07-23T11:45:00Z",
      title: "Tour Scheduled",
      description: "Tour scheduled for August 2, 2025 at 10:00 AM",
      status: "TOUR_SCHEDULED",
      user: {
        name: "You",
        role: "Primary Contact"
      }
    }
  ],
  messages: [
    {
      id: "msg-001",
      sender: {
        id: "facility-001",
        name: "Sarah Johnson",
        role: "CARE_HOME",
        avatar: "https://placehold.co/100x100/e9ecef/495057?text=SJ"
      },
      content: "Hello! Thank you for your interest in Sunshine Care Home. I'd be happy to answer any questions you have about our facility and services.",
      timestamp: "2025-07-21T10:20:00Z",
      read: true
    },
    {
      id: "msg-002",
      sender: {
        id: "user-000",
        name: "You",
        role: "USER"
      },
      content: "Thank you for the quick response. I'm looking for a private room for my mother who needs assistance with medication management. Do you have availability in the next 1-3 months?",
      timestamp: "2025-07-21T14:05:00Z",
      read: true
    },
    {
      id: "msg-003",
      sender: {
        id: "facility-001",
        name: "Sarah Johnson",
        role: "CARE_HOME",
        avatar: "https://placehold.co/100x100/e9ecef/495057?text=SJ"
      },
      content: "Yes, we currently have two private rooms that will be available next month. Both include private bathrooms and our full medication management services. Would you like to schedule a tour to see the rooms and our facility?",
      timestamp: "2025-07-22T09:10:00Z",
      read: true
    }
  ],
  documents: [
    {
      id: "doc-001",
      name: "Sunshine_Tour_Information.pdf",
      type: "application/pdf",
      uploadedBy: "Sarah Johnson",
      uploadedAt: "2025-07-24T09:15:00Z",
      url: "#"
    },
    {
      id: "doc-002",
      name: "Medical_Assessment_Form.pdf",
      type: "application/pdf",
      uploadedBy: "System",
      uploadedAt: "2025-07-23T11:45:00Z",
      url: "#"
    }
  ]
};

export default function InquiryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;
  
  // State
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'timeline' | 'messages' | 'documents' | 'collaboration'>('timeline');
  const [showShareModal, setShowShareModal] = useState(false);
  const [collaborationView, setCollaborationView] = useState<'members' | 'decisions' | 'notes' | 'meetings' | 'activity'>('members');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMessage, setNewMessage] = useState<string>('');
  
  // State for permission dropdowns
  const [openSettingsId, setOpenSettingsId] = useState<string | null>(null);
  
  // State for share modal
  const [shareEmail, setShareEmail] = useState<string>('');
  const [sharePermission, setSharePermission] = useState<PermissionLevel>('VIEW');
  const [shareRelationship, setShareRelationship] = useState<string>('');
  const [shareName, setShareName] = useState<string>('');
  
  // State for add member modal
  const [newMemberEmail, setNewMemberEmail] = useState<string>('');
  const [newMemberName, setNewMemberName] = useState<string>('');
  const [newMemberRelationship, setNewMemberRelationship] = useState<string>('');
  const [newMemberPermission, setNewMemberPermission] = useState<PermissionLevel>('VIEW');
  
  // Refs for handling clicks outside dropdowns
  const settingsDropdownRef = useRef<HTMLDivElement>(null);
  
  // Close settings dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsDropdownRef.current && !settingsDropdownRef.current.contains(event.target as Node)) {
        setOpenSettingsId(null);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  // Fetch inquiry data
  useEffect(() => {
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setInquiry(MOCK_INQUIRY);
      setIsLoading(false);
    }, 500);
  }, [id]);
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  // Format time for display
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
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
  
  // Handle message submission
  const handleSendMessage = () => {
    if (!newMessage.trim() || !inquiry) return;
    
    // Create new message
    const message: Message = {
      id: `msg-${Date.now()}`,
      sender: {
        id: "user-000",
        name: "You",
        role: "USER"
      },
      content: newMessage,
      timestamp: new Date().toISOString(),
      read: true
    };
    
    // Update inquiry with new message
    setInquiry({
      ...inquiry,
      messages: [...inquiry.messages, message]
    });
    
    // Clear input
    setNewMessage('');
  };
  
  // Handle permission change
  const handlePermissionChange = (userId: string, newPermission: PermissionLevel) => {
    if (inquiry && inquiry.sharedWith) {
      const updatedSharedWith = inquiry.sharedWith.map(member => 
        member.id === userId ? { ...member, permissionLevel: newPermission } : member
      );
      
      setInquiry({
        ...inquiry,
        sharedWith: updatedSharedWith
      });
      
      // Close the dropdown after selection
      setOpenSettingsId(null);
    }
  };
  
  // Toggle settings dropdown
  const toggleSettingsDropdown = (userId: string) => {
    setOpenSettingsId(openSettingsId === userId ? null : userId);
  };
  
  // Handle share submission
  const handleShareSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inquiry || !shareEmail || !shareName) return;
    
    // Create new family member
    const newMember: FamilyMember = {
      id: `user-${Date.now()}`,
      name: shareName,
      email: shareEmail,
      relationship: shareRelationship,
      permissionLevel: sharePermission,
      lastActive: new Date().toISOString(),
      isActive: false
    };
    
    // Update inquiry with new member
    setInquiry({
      ...inquiry,
      sharedWith: [...(inquiry.sharedWith || []), newMember]
    });
    
    // Reset form and close modal
    setShareEmail('');
    setShareName('');
    setShareRelationship('');
    setSharePermission('VIEW');
    setShowShareModal(false);
  };
  
  // Handle add member submission
  const handleAddMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inquiry || !newMemberEmail || !newMemberName) return;
    
    // Create new family member
    const newMember: FamilyMember = {
      id: `user-${Date.now()}`,
      name: newMemberName,
      email: newMemberEmail,
      relationship: newMemberRelationship,
      permissionLevel: newMemberPermission,
      lastActive: new Date().toISOString(),
      isActive: false
    };
    
    // Update inquiry with new member
    setInquiry({
      ...inquiry,
      sharedWith: [...(inquiry.sharedWith || []), newMember]
    });
    
    // Reset form and close modal
    setNewMemberEmail('');
    setNewMemberName('');
    setNewMemberRelationship('');
    setNewMemberPermission('VIEW');
    setShowAddMemberModal(false);
  };
  
  // Add to calendar functionality
  const handleAddToCalendar = () => {
    if (!inquiry || !inquiry.tourDate || !inquiry.tourTime) return;
    
    const eventTitle = `Tour at ${inquiry.home.name}`;
    const eventDate = new Date(inquiry.tourDate);
    /* 
     * Parse time safely: supports formats like "10:00", "10:00 AM", "1:30 pm", etc.
     * Falls back silently if parsing fails, avoiding undefined errors flagged by TS.
     */
    const timeStr = inquiry.tourTime;
    const match = timeStr.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
    if (match) {
      // Destructure groups with explicit names to satisfy strict typing
      const [, hh, mm, ampmRaw] = match;
      if (hh && mm) {
        let h = parseInt(hh, 10);
        const m = parseInt(mm, 10);
        const ampm = ampmRaw?.toUpperCase();
        if (ampm === 'PM' && h < 12) h += 12;
        if (ampm === 'AM' && h === 12) h = 0;
        eventDate.setHours(h, m, 0, 0);
      }
    }
    
    const endDate = new Date(eventDate);
    endDate.setHours(endDate.getHours() + 1); // Assume 1 hour tour
    
    const startISOString = eventDate.toISOString().replace(/-|:|\.\d+/g, '');
    const endISOString = endDate.toISOString().replace(/-|:|\.\d+/g, '');
    
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${startISOString}/${endISOString}&details=${encodeURIComponent(`Tour at ${inquiry.home.name}, ${inquiry.home.address}`)}&location=${encodeURIComponent(inquiry.home.address)}`;
    
    window.open(googleCalendarUrl, '_blank');
  };
  
  if (isLoading || !inquiry) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-neutral-200 border-t-primary-500"></div>
      </div>
    );
  }
  
  return (
    <DashboardLayout title={`Inquiry - ${inquiry.home.name}`}>
      {/* Page header */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center">
            <button
              onClick={() => router.push('/dashboard/inquiries')}
              className="mr-4 flex items-center text-sm font-medium text-neutral-600 hover:text-neutral-800"
            >
              <FiArrowLeft className="mr-1 h-4 w-4" />
              Back to Inquiries
            </button>
            
            <div className={`flex items-center rounded-full px-3 py-1 text-xs font-medium ${STATUS_INFO[inquiry.status].color}`}>
              {STATUS_INFO[inquiry.status].icon}
              <span className="ml-1">{STATUS_INFO[inquiry.status].label}</span>
            </div>
            
            {inquiry.priority && (
              <div className={`ml-2 flex items-center rounded-full px-3 py-1 text-xs font-medium ${PRIORITY_BADGES[inquiry.priority].color}`}>
                {PRIORITY_BADGES[inquiry.priority].label}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row lg:space-x-6">
          {/* Left column - Main content */}
          <div className="flex-1">
            {/* Home information card */}
            <div className="mb-6 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
              <div className="relative h-48 w-full">
                <Image
                  src={inquiry.home.image}
                  alt={inquiry.home.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-6">
                <h1 className="text-2xl font-bold text-neutral-800">{inquiry.home.name}</h1>
                <p className="text-neutral-600">{inquiry.home.address}</p>
                
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                  <div>
                    <p className="text-sm text-neutral-500">Contact Person</p>
                    <p className="font-medium text-neutral-800">{inquiry.home.contactPerson}</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">Phone</p>
                    <a href={`tel:${inquiry.home.phone}`} className="font-medium text-primary-600 hover:underline">
                      {inquiry.home.phone}
                    </a>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">Email</p>
                    <a href={`mailto:${inquiry.home.email}`} className="font-medium text-primary-600 hover:underline">
                      {inquiry.home.email}
                    </a>
                  </div>
                </div>
                
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href={`/homes/${inquiry.home.id}`}
                    className="flex items-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    <FiHome className="mr-2 h-4 w-4" />
                    View Home Details
                  </Link>
                  <button
                    onClick={() => setActiveTab('messages')}
                    className="flex items-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    <FiMessageSquare className="mr-2 h-4 w-4" />
                    Send Message
                  </button>
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="flex items-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    <FiShare2 className="mr-2 h-4 w-4" />
                    Share
                  </button>
                </div>
              </div>
            </div>
            
            {/* Inquiry progress */}
            <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-neutral-800">Inquiry Progress</h2>
              
              <div className="relative mb-8">
                <div className="absolute left-0 top-4 h-0.5 w-full bg-neutral-200"></div>
                <div className="relative flex justify-between">
                  <div className="flex flex-col items-center">
                    <div className={`z-10 flex h-8 w-8 items-center justify-center rounded-full ${
                      inquiry.status === 'SUBMITTED' || inquiry.status === 'CONTACTED' || inquiry.status === 'TOUR_SCHEDULED' || inquiry.status === 'FOLLOW_UP' || inquiry.status === 'DECIDED'
                        ? 'bg-primary-500 text-white'
                        : 'bg-neutral-200 text-neutral-400'
                    }`}>
                      {inquiry.status === 'SUBMITTED' || inquiry.status === 'CONTACTED' || inquiry.status === 'TOUR_SCHEDULED' || inquiry.status === 'FOLLOW_UP' || inquiry.status === 'DECIDED'
                        ? <FiCheck className="h-5 w-5" />
                        : '1'}
                    </div>
                    <p className="mt-2 text-center text-xs font-medium text-neutral-700">Submitted</p>
                  </div>
                  
                  <div className="flex flex-col items-center">
                    <div className={`z-10 flex h-8 w-8 items-center justify-center rounded-full ${
                      inquiry.status === 'CONTACTED' || inquiry.status === 'TOUR_SCHEDULED' || inquiry.status === 'FOLLOW_UP' || inquiry.status === 'DECIDED'
                        ? 'bg-primary-500 text-white'
                        : 'bg-neutral-200 text-neutral-400'
                    }`}>
                      {inquiry.status === 'CONTACTED' || inquiry.status === 'TOUR_SCHEDULED' || inquiry.status === 'FOLLOW_UP' || inquiry.status === 'DECIDED'
                        ? <FiCheck className="h-5 w-5" />
                        : '2'}
                    </div>
                    <p className="mt-2 text-center text-xs font-medium text-neutral-700">Contacted</p>
                  </div>
                  
                  <div className="flex flex-col items-center">
                    <div className={`z-10 flex h-8 w-8 items-center justify-center rounded-full ${
                      inquiry.status === 'TOUR_SCHEDULED' || inquiry.status === 'FOLLOW_UP' || inquiry.status === 'DECIDED'
                        ? 'bg-primary-500 text-white'
                        : 'bg-neutral-200 text-neutral-400'
                    }`}>
                      {inquiry.status === 'TOUR_SCHEDULED' || inquiry.status === 'FOLLOW_UP' || inquiry.status === 'DECIDED'
                        ? <FiCheck className="h-5 w-5" />
                        : '3'}
                    </div>
                    <p className="mt-2 text-center text-xs font-medium text-neutral-700">Tour Scheduled</p>
                  </div>
                  
                  <div className="flex flex-col items-center">
                    <div className={`z-10 flex h-8 w-8 items-center justify-center rounded-full ${
                      inquiry.status === 'FOLLOW_UP' || inquiry.status === 'DECIDED'
                        ? 'bg-primary-500 text-white'
                        : 'bg-neutral-200 text-neutral-400'
                    }`}>
                      {inquiry.status === 'FOLLOW_UP' || inquiry.status === 'DECIDED'
                        ? <FiCheck className="h-5 w-5" />
                        : '4'}
                    </div>
                    <p className="mt-2 text-center text-xs font-medium text-neutral-700">Follow-up</p>
                  </div>
                  
                  <div className="flex flex-col items-center">
                    <div className={`z-10 flex h-8 w-8 items-center justify-center rounded-full ${
                      inquiry.status === 'DECIDED'
                        ? 'bg-primary-500 text-white'
                        : 'bg-neutral-200 text-neutral-400'
                    }`}>
                      {inquiry.status === 'DECIDED'
                        ? <FiCheck className="h-5 w-5" />
                        : '5'}
                    </div>
                    <p className="mt-2 text-center text-xs font-medium text-neutral-700">Decided</p>
                  </div>
                </div>
              </div>
              
              {inquiry.tourDate && (
                <div className="mb-4 rounded-lg bg-amber-50 p-4">
                  <div className="flex items-start">
                    <div className="mr-3 rounded-full bg-amber-100 p-2 text-amber-700">
                      <FiCalendar className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium text-neutral-800">Tour Scheduled</h3>
                      <p className="text-neutral-700">
                        {formatDate(inquiry.tourDate)} at {inquiry.tourTime}
                      </p>
                      <div className="mt-2">
                        <button 
                          onClick={handleAddToCalendar}
                          className="mr-2 text-sm font-medium text-primary-600 hover:text-primary-700"
                        >
                          Add to Calendar
                        </button>
                        <button className="text-sm font-medium text-neutral-600 hover:text-neutral-700">
                          Reschedule
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Next steps */}
              {inquiry.nextSteps && inquiry.nextSteps.length > 0 && (
                <div>
                  <h3 className="mb-3 text-base font-medium text-neutral-800">Next Steps</h3>
                  <div className="space-y-2">
                    {inquiry.nextSteps.map((step, index) => (
                      <div key={index} className="flex items-center rounded-md border border-neutral-200 bg-neutral-50 p-3">
                        <div className="mr-3 flex h-6 w-6 items-center justify-center rounded-full border border-neutral-300 bg-white">
                          {step.completed ? (
                            <FiCheck className="h-4 w-4 text-success-500" />
                          ) : (
                            <span className="h-2 w-2 rounded-full bg-neutral-300"></span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-neutral-800">{step.description}</p>
                          {step.dueDate && (
                            <p className="text-xs text-neutral-500">Due: {formatDate(step.dueDate)}</p>
                          )}
                        </div>
                        {!step.completed && (
                          <button className="ml-2 rounded-md border border-primary-500 bg-white px-3 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50">
                            {step.type === 'TOUR' ? 'View Details' : 'Complete'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Tabs navigation */}
            <div className="mb-4 border-b border-neutral-200">
              <div className="flex space-x-6">
                <button
                  onClick={() => setActiveTab('timeline')}
                  className={`border-b-2 px-1 pb-3 pt-1 text-sm font-medium ${
                    activeTab === 'timeline'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-neutral-600 hover:text-neutral-800'
                  }`}
                >
                  Timeline
                </button>
                <button
                  onClick={() => setActiveTab('messages')}
                  className={`border-b-2 px-1 pb-3 pt-1 text-sm font-medium ${
                    activeTab === 'messages'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-neutral-600 hover:text-neutral-800'
                  }`}
                >
                  Messages {inquiry.unreadMessages > 0 && (
                    <span className="ml-1 rounded-full bg-primary-100 px-2 py-0.5 text-xs text-primary-800">
                      {inquiry.unreadMessages}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('documents')}
                  className={`border-b-2 px-1 pb-3 pt-1 text-sm font-medium ${
                    activeTab === 'documents'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-neutral-600 hover:text-neutral-800'
                  }`}
                >
                  Documents {inquiry.documents && (
                    <span className="ml-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-800">
                      {inquiry.documents.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('collaboration')}
                  className={`border-b-2 px-1 pb-3 pt-1 text-sm font-medium ${
                    activeTab === 'collaboration'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-neutral-600 hover:text-neutral-800'
                  }`}
                >
                  Collaboration {inquiry.sharedWith && (
                    <span className="ml-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-800">
                      {inquiry.sharedWith.length}
                    </span>
                  )}
                </button>
              </div>
            </div>
            
            {/* Tab content */}
            <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
              {/* Timeline tab */}
              {activeTab === 'timeline' && (
                <div>
                  <h2 className="mb-4 text-lg font-semibold text-neutral-800">Inquiry Timeline</h2>
                  
                  <div className="space-y-6">
                    {inquiry.timeline.map((event, index) => (
                      <div key={event.id} className="relative pl-6">
                        {/* Timeline connector */}
                        {index < inquiry.timeline.length - 1 && (
                          <div className="absolute left-[0.4375rem] top-6 h-full w-0.5 bg-neutral-200"></div>
                        )}
                        
                        {/* Event dot */}
                        <div className="absolute left-0 top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-primary-500 shadow-sm"></div>
                        
                        {/* Event content */}
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-medium text-neutral-800">{event.title}</h3>
                            {event.status && (
                              <div className={`flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_INFO[event.status].color}`}>
                                {STATUS_INFO[event.status].label}
                              </div>
                            )}
                            <span className="text-xs text-neutral-500">
                              {formatDate(event.date)} at {formatTime(event.date)}
                            </span>
                          </div>
                          
                          {event.description && (
                            <p className="mt-1 text-sm text-neutral-700">{event.description}</p>
                          )}
                          
                          {event.user && (
                            <div className="mt-2 flex items-center">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-200 text-xs font-medium text-neutral-700">
                                {event.user.name.charAt(0)}
                              </div>
                              <span className="ml-2 text-xs text-neutral-600">
                                {event.user.name} • {event.user.role}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Messages tab */}
              {activeTab === 'messages' && (
                <div>
                  <h2 className="mb-4 text-lg font-semibold text-neutral-800">Messages</h2>
                  
                  <div className="mb-4 h-96 overflow-y-auto rounded-lg border border-neutral-100 bg-neutral-50 p-4">
                    <div className="space-y-4">
                      {inquiry.messages.map((message) => (
                        <div 
                          key={message.id} 
                          className={`flex ${message.sender.role === 'USER' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[80%] rounded-lg p-3 ${
                            message.sender.role === 'USER' 
                              ? 'bg-primary-500 text-white' 
                              : message.sender.role === 'CARE_ADVISOR'
                                ? 'bg-purple-100 text-neutral-800'
                                : 'bg-white text-neutral-800 shadow-sm'
                          }`}>
                            {message.sender.role !== 'USER' && (
                              <div className="mb-1 flex items-center">
                                {message.sender.avatar ? (
                                  <div className="mr-2 h-6 w-6 overflow-hidden rounded-full">
                                    <Image
                                      src={message.sender.avatar}
                                      alt={message.sender.name}
                                      width={24}
                                      height={24}
                                    />
                                  </div>
                                ) : (
                                  <div className="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-neutral-200 text-xs font-medium text-neutral-700">
                                    {message.sender.name.charAt(0)}
                                  </div>
                                )}
                                <span className="text-xs font-medium">
                                  {message.sender.name}
                                </span>
                              </div>
                            )}
                            
                            <p className={`text-sm ${message.sender.role === 'USER' ? 'text-white' : 'text-neutral-800'}`}>
                              {message.content}
                            </p>
                            
                            {message.attachments && message.attachments.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {message.attachments.map((attachment, index) => (
                                  <a 
                                    key={index}
                                    href={attachment.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-center rounded-md px-2 py-1 text-xs ${
                                      message.sender.role === 'USER'
                                        ? 'bg-primary-400 text-white hover:bg-primary-300'
                                        : 'bg-white text-primary-600 hover:bg-neutral-100'
                                    }`}
                                  >
                                    <FiPaperclip className="mr-1 h-3 w-3" />
                                    {attachment.name}
                                  </a>
                                ))}
                              </div>
                            )}
                            
                            <div className={`mt-1 text-right text-xs ${
                              message.sender.role === 'USER' ? 'text-primary-200' : 'text-neutral-500'
                            }`}>
                              {formatTime(message.timestamp)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex">
                    <input
                      type="text"
                      placeholder="Type your message..."
                      className="flex-1 rounded-l-md border border-neutral-300 px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <button 
                      className="flex items-center rounded-r-md bg-primary-500 px-4 py-2 font-medium text-white hover:bg-primary-600"
                      onClick={handleSendMessage}
                    >
                      Send
                    </button>
                  </div>
                </div>
              )}
              
              {/* Documents tab */}
              {activeTab === 'documents' && (
                <div>
                  <h2 className="mb-4 text-lg font-semibold text-neutral-800">Documents</h2>
                  
                  <div className="mb-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-medium text-neutral-700">Shared Documents</h3>
                      <label className="flex cursor-pointer items-center text-xs font-medium text-primary-600 hover:text-primary-700">
                        <input
                          type="file"
                          className="hidden"
                          onChange={() => alert('File upload functionality would be implemented here')}
                        />
                        <FiPlus className="mr-1 h-3 w-3" />
                        Upload Document
                      </label>
                    </div>
                    
                    {inquiry.documents && inquiry.documents.length > 0 ? (
                      <div className="space-y-2">
                        {inquiry.documents.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between rounded-md border border-neutral-200 bg-white p-3">
                            <div className="flex items-center">
                              <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-md bg-neutral-100 text-neutral-500">
                                <FiFileText className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-medium text-neutral-800">{doc.name}</p>
                                <p className="text-xs text-neutral-500">
                                  Uploaded by {doc.uploadedBy} on {formatDate(doc.uploadedAt)}
                                </p>
                              </div>
                            </div>
                            <div>
                              <a 
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-md border border-neutral-300 bg-white px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                              >
                                View
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-md border border-dashed border-neutral-300 bg-white p-6 text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
                          <FiFileText className="h-6 w-6 text-neutral-400" />
                        </div>
                        <p className="mb-1 text-neutral-700">No documents yet</p>
                        <p className="text-sm text-neutral-500">Upload documents or wait for the care home to share them</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Collaboration tab */}
              {activeTab === 'collaboration' && (
                <div>
                  {/* Collaboration header with navigation */}
                  <div className="mb-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <h2 className="text-lg font-semibold text-neutral-800">Family Collaboration</h2>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setCollaborationView('members')}
                          className={`flex items-center rounded-md px-3 py-1.5 text-xs font-medium ${
                            collaborationView === 'members'
                              ? 'bg-primary-100 text-primary-700'
                              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                          }`}
                        >
                          <FiUsers className="mr-1.5 h-3 w-3" />
                          Members
                        </button>
                        <button
                          onClick={() => setCollaborationView('activity')}
                          className={`flex items-center rounded-md px-3 py-1.5 text-xs font-medium ${
                            collaborationView === 'activity'
                              ? 'bg-primary-100 text-primary-700'
                              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                          }`}
                        >
                          <FiActivity className="mr-1.5 h-3 w-3" />
                          Activity
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Family Members View */}
                  {collaborationView === 'members' && (
                    <div>
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-base font-medium text-neutral-800">Family Members</h3>
                        <button 
                          onClick={() => setShowAddMemberModal(true)}
                          className="flex items-center rounded-md bg-primary-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-600"
                        >
                          <FiUserPlus className="mr-1.5 h-3 w-3" />
                          Invite Member
                        </button>
                      </div>
                      
                      {inquiry.sharedWith && inquiry.sharedWith.length > 0 ? (
                        <div className="space-y-4">
                          {inquiry.sharedWith.map((person) => (
                            <div key={person.id} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex items-start">
                                  <div className="relative mr-3">
                                    {person.avatar ? (
                                      <Image 
                                        src={person.avatar} 
                                        alt={person.name} 
                                        width={40}
                                        height={40}
                                        className="h-10 w-10 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-200 text-neutral-700">
                                        {person.name.charAt(0)}
                                      </div>
                                    )}
                                    {person.isActive && (
                                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500"></span>
                                    )}
                                  </div>
                                  <div>
                                    <div className="flex items-center">
                                      <p className="font-medium text-neutral-800">{person.name}</p>
                                      <div className={`ml-2 rounded-full px-2 py-0.5 text-xs ${PERMISSION_LEVELS[person.permissionLevel].color}`}>
                                        {PERMISSION_LEVELS[person.permissionLevel].label}
                                      </div>
                                    </div>
                                    <p className="text-sm text-neutral-600">{person.relationship}</p>
                                    <p className="text-xs text-neutral-500">{person.email}</p>
                                    {person.lastActive && (
                                      <p className="mt-1 text-xs text-neutral-500">
                                        Last active: {getDaysSinceUpdate(person.lastActive)}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="relative" ref={settingsDropdownRef}>
                                  <button 
                                    onClick={() => toggleSettingsDropdown(person.id)}
                                    className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
                                  >
                                    <FiSettings className="h-4 w-4" />
                                  </button>
                                  
                                  {/* Permission dropdown */}
                                  {openSettingsId === person.id && (
                                    <div className="absolute right-0 top-8 z-10 w-48 rounded-md border border-neutral-200 bg-white shadow-lg">
                                      <div className="p-2 text-xs font-medium text-neutral-700">
                                        Change Permission
                                      </div>
                                      <div className="border-t border-neutral-100">
                                        {Object.entries(PERMISSION_LEVELS).map(([level, info]) => (
                                          <button 
                                            key={level}
                                            onClick={() => handlePermissionChange(person.id, level as PermissionLevel)}
                                            className={`flex w-full items-center px-3 py-2 text-left text-sm ${
                                              person.permissionLevel === level
                                                ? 'bg-neutral-100 font-medium'
                                                : 'hover:bg-neutral-50'
                                            }`}
                                          >
                                            <span className="mr-2">{info.icon}</span>
                                            <div>
                                              <div>{info.label}</div>
                                              <div className="text-xs text-neutral-500">{info.description}</div>
                                            </div>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center">
                          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
                            <FiUsers className="h-6 w-6 text-neutral-400" />
                          </div>
                          <p className="mb-1 text-neutral-700">No family members added yet</p>
                          <p className="mb-4 text-sm text-neutral-500">
                            Invite family members to collaborate on this inquiry
                          </p>
                          <button 
                            onClick={() => setShowAddMemberModal(true)}
                            className="inline-flex items-center rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
                          >
                            <FiUserPlus className="mr-1.5 h-4 w-4" />
                            Invite Family Member
                          </button>
                        </div>
                      )}
                      
                      {/* Permission Levels Explainer */}
                      <div className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                        <h4 className="mb-3 text-sm font-medium text-neutral-700">Permission Levels</h4>
                        <div className="space-y-3">
                          {Object.entries(PERMISSION_LEVELS).map(([level, info]) => (
                            <div key={level} className="flex items-start">
                              <div className={`mr-2 flex h-6 w-6 items-center justify-center rounded-full ${info.color}`}>
                                {info.icon}
                              </div>
                              <div>
                                <p className="font-medium text-neutral-800">{info.label}</p>
                                <p className="text-xs text-neutral-600">{info.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Activity View - Placeholder for now */}
                  {collaborationView === 'activity' && (
                    <div>
                      <h3 className="mb-4 text-base font-medium text-neutral-800">Recent Activity</h3>
                      <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
                          <FiActivity className="h-6 w-6 text-neutral-400" />
                        </div>
                        <p className="mb-1 text-neutral-700">No activity yet</p>
                        <p className="text-sm text-neutral-500">
                          Activity will appear here as family members collaborate
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Right column - Summary */}
          <div className="mt-6 w-full lg:mt-0 lg:w-80">
            <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-base font-medium text-neutral-800">Inquiry Summary</h2>
              
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-neutral-500">Submitted</p>
                  <p className="font-medium text-neutral-800">{formatDate(inquiry.submittedDate)}</p>
                </div>
                
                <div>
                  <p className="text-xs text-neutral-500">Care Needed</p>
                  <div className="flex flex-wrap gap-1">
                    {inquiry.careNeeded.map((care, index) => (
                      <span 
                        key={index}
                        className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-800"
                      >
                        {care}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <p className="text-xs text-neutral-500">Move-in Timeframe</p>
                  <p className="font-medium text-neutral-800">{inquiry.moveInTimeframe}</p>
                </div>
                
                {inquiry.tourDate && (
                  <div>
                    <p className="text-xs text-neutral-500">Tour Scheduled</p>
                    <p className="font-medium text-neutral-800">
                      {formatDate(inquiry.tourDate)} at {inquiry.tourTime}
                    </p>
                  </div>
                )}
                
                <div>
                  <p className="text-xs text-neutral-500">Last Updated</p>
                  <p className="font-medium text-neutral-800">{getDaysSinceUpdate(inquiry.lastUpdated)}</p>
                </div>
              </div>
              
              {inquiry.notes && (
                <div className="mt-4 border-t border-neutral-200 pt-3">
                  <p className="mb-1 text-xs text-neutral-500">Notes</p>
                  <p className="text-sm text-neutral-700">{inquiry.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Share Modal */}
      <Modal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title="Share Inquiry"
      >
        <form onSubmit={handleShareSubmit} className="space-y-4">
          <div>
            <label htmlFor="shareName" className="mb-1 block text-sm font-medium text-neutral-700">
              Name
            </label>
            <input
              type="text"
              id="shareName"
              value={shareName}
              onChange={(e) => setShareName(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Enter name"
              required
            />
          </div>
          
          <div>
            <label htmlFor="shareEmail" className="mb-1 block text-sm font-medium text-neutral-700">
              Email
            </label>
            <input
              type="email"
              id="shareEmail"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Enter email address"
              required
            />
          </div>
          
          <div>
            <label htmlFor="shareRelationship" className="mb-1 block text-sm font-medium text-neutral-700">
              Relationship
            </label>
            <input
              type="text"
              id="shareRelationship"
              value={shareRelationship}
              onChange={(e) => setShareRelationship(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="E.g., Brother, Sister, Son"
            />
          </div>
          
          <div>
            <label htmlFor="sharePermission" className="mb-1 block text-sm font-medium text-neutral-700">
              Permission Level
            </label>
            <select
              id="sharePermission"
              value={sharePermission}
              onChange={(e) => setSharePermission(e.target.value as PermissionLevel)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {Object.entries(PERMISSION_LEVELS).map(([level, info]) => (
                <option key={level} value={level}>
                  {info.label} - {info.description}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={() => setShowShareModal(false)}
              className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
            >
              Share
            </button>
          </div>
        </form>
      </Modal>
      
      {/* Add Member Modal */}
      <Modal
        isOpen={showAddMemberModal}
        onClose={() => setShowAddMemberModal(false)}
        title="Invite Family Member"
      >
        <form onSubmit={handleAddMemberSubmit} className="space-y-4">
          <div>
            <label htmlFor="memberName" className="mb-1 block text-sm font-medium text-neutral-700">
              Name
            </label>
            <input
              type="text"
              id="memberName"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Enter name"
              required
            />
          </div>
          
          <div>
            <label htmlFor="memberEmail" className="mb-1 block text-sm font-medium text-neutral-700">
              Email
            </label>
            <input
              type="email"
              id="memberEmail"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Enter email address"
              required
            />
          </div>
          
          <div>
            <label htmlFor="memberRelationship" className="mb-1 block text-sm font-medium text-neutral-700">
              Relationship
            </label>
            <input
              type="text"
              id="memberRelationship"
              value={newMemberRelationship}
              onChange={(e) => setNewMemberRelationship(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="E.g., Brother, Sister, Son"
            />
          </div>
          
          <div>
            <label htmlFor="memberPermission" className="mb-1 block text-sm font-medium text-neutral-700">
              Permission Level
            </label>
            <select
              id="memberPermission"
              value={newMemberPermission}
              onChange={(e) => setNewMemberPermission(e.target.value as PermissionLevel)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {Object.entries(PERMISSION_LEVELS).map(([level, info]) => (
                <option key={level} value={level}>
                  {info.label} - {info.description}
                </option>
              ))}
            </select>
          </div>
          
          <div className="rounded-md bg-blue-50 p-3">
            <div className="flex">
              <div className="flex-shrink-0">
                <FiAlertCircle className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  An invitation email will be sent to this person with instructions to join the collaboration.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={() => setShowAddMemberModal(false)}
              className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
            >
              Send Invitation
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
