"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiMessageSquare, 
  FiCalendar, 
  FiClock, 
  FiCheckCircle,
  FiFileText,
  FiAlertCircle,
  FiChevronRight,
  FiX,
  FiEye,
  FiRefreshCw,
  FiBell,
  FiBellOff,
  FiFilter
} from 'react-icons/fi';
import { useWebSocket } from '../../contexts/WebSocketContext';

// Types
type InquiryStatus = 
  | 'SUBMITTED' 
  | 'CONTACTED' 
  | 'TOUR_SCHEDULED' 
  | 'FOLLOW_UP' 
  | 'DECIDED' 
  | 'CANCELLED';

type UpdateType = 
  | 'STATUS_CHANGE' 
  | 'NEW_MESSAGE' 
  | 'TOUR_REMINDER' 
  | 'DOCUMENT_SHARED' 
  | 'NOTE_ADDED';

interface InquiryUpdate {
  id: string;
  inquiryId: string;
  homeName: string;
  homeId: string;
  type: UpdateType;
  timestamp: string;
  isRead: boolean;
  data: {
    oldStatus?: InquiryStatus;
    newStatus?: InquiryStatus;
    messageCount?: number;
    senderId?: string;
    senderName?: string;
    messagePreview?: string;
    tourDate?: string;
    tourTime?: string;
    documentId?: string;
    documentName?: string;
    noteContent?: string;
    noteAuthor?: string;
  };
}

// Mock data for initial testing
const MOCK_UPDATES: InquiryUpdate[] = [
  {
    id: 'update-001',
    inquiryId: 'inq-001',
    homeName: 'Sunshine Care Home',
    homeId: '1',
    type: 'STATUS_CHANGE',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
    isRead: false,
    data: {
      oldStatus: 'SUBMITTED',
      newStatus: 'CONTACTED'
    }
  },
  {
    id: 'update-002',
    inquiryId: 'inq-001',
    homeName: 'Sunshine Care Home',
    homeId: '1',
    type: 'NEW_MESSAGE',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
    isRead: false,
    data: {
      messageCount: 2,
      senderId: 'facility-001',
      senderName: 'Sarah Johnson',
      messagePreview: 'Thank you for your inquiry. Would you like to schedule a tour?'
    }
  },
  {
    id: 'update-003',
    inquiryId: 'inq-002',
    homeName: 'Golden Years Living',
    homeId: '2',
    type: 'TOUR_REMINDER',
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
    isRead: true,
    data: {
      tourDate: '2025-07-28',
      tourTime: '11:00 AM'
    }
  },
  {
    id: 'update-004',
    inquiryId: 'inq-003',
    homeName: 'Serenity House',
    homeId: '3',
    type: 'DOCUMENT_SHARED',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
    isRead: false,
    data: {
      documentId: 'doc-001',
      documentName: 'Admission Forms.pdf'
    }
  }
];

interface RealTimeInquiryUpdatesProps {
  inquiryId?: string; // Optional - if provided, only show updates for this inquiry
  limit?: number; // Optional - limit the number of updates shown
  showFilters?: boolean; // Optional - show filter options
  className?: string;
}

const RealTimeInquiryUpdates: React.FC<RealTimeInquiryUpdatesProps> = ({
  inquiryId,
  limit = 5,
  showFilters = true,
  className = ''
}) => {
  const router = useRouter();
  const { connectionState } = useWebSocket();
  
  // State
  const [updates, setUpdates] = useState<InquiryUpdate[]>(
    inquiryId 
      ? MOCK_UPDATES.filter(update => update.inquiryId === inquiryId)
      : MOCK_UPDATES
  );
  const [filteredUpdates, setFilteredUpdates] = useState<InquiryUpdate[]>(updates);
  const [activeFilter, setActiveFilter] = useState<UpdateType | 'ALL'>('ALL');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newUpdateAlert, setNewUpdateAlert] = useState(false);
  
  // Format timestamp
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };
  
  // Apply filters
  useEffect(() => {
    let filtered = [...updates];
    
    // Filter by type if not ALL
    if (activeFilter !== 'ALL') {
      filtered = filtered.filter(update => update.type === activeFilter);
    }
    
    // Filter by read status if showUnreadOnly is true
    if (showUnreadOnly) {
      filtered = filtered.filter(update => !update.isRead);
    }
    
    // Sort by timestamp (newest first)
    filtered = filtered.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    // Apply limit
    if (limit > 0) {
      filtered = filtered.slice(0, limit);
    }
    
    setFilteredUpdates(filtered);
  }, [updates, activeFilter, showUnreadOnly, limit]);
  
  // Mark update as read
  const markAsRead = (updateId: string) => {
    setUpdates(prev => 
      prev.map(update => 
        update.id === updateId ? { ...update, isRead: true } : update
      )
    );
  };
  
  // Mark all as read
  const markAllAsRead = () => {
    setUpdates(prev => 
      prev.map(update => ({ ...update, isRead: true }))
    );
  };
  
  // Handle refresh
  const handleRefresh = () => {
    setIsLoading(true);
    
    // Simulate fetching new updates
    setTimeout(() => {
      // In a real app, we would fetch updates from the API
      setIsLoading(false);
      
      // For demo purposes, add a new update
      const newUpdate: InquiryUpdate = {
        id: `update-${Date.now()}`,
        inquiryId: inquiryId || 'inq-001',
        homeName: 'Sunshine Care Home',
        homeId: '1',
        type: 'NEW_MESSAGE',
        timestamp: new Date().toISOString(),
        isRead: false,
        data: {
          messageCount: 1,
          senderId: 'facility-001',
          senderName: 'Sarah Johnson',
          messagePreview: 'We look forward to your visit!'
        }
      };
      
      setUpdates(prev => [newUpdate, ...prev]);
      setNewUpdateAlert(true);
      
      // Hide the alert after 3 seconds
      setTimeout(() => {
        setNewUpdateAlert(false);
      }, 3000);
    }, 1000);
  };
  
  // Navigate to inquiry
  const navigateToInquiry = (inquiryId: string, type: UpdateType) => {
    let path = `/dashboard/inquiries/${inquiryId}`;
    
    // Add specific section based on update type
    if (type === 'NEW_MESSAGE') {
      path += '/messages';
    } else if (type === 'DOCUMENT_SHARED') {
      path += '/documents';
    }
    
    router.push(path);
  };
  
  // Get icon for update type
  const getUpdateIcon = (type: UpdateType) => {
    switch (type) {
      case 'STATUS_CHANGE':
        return <FiCheckCircle className="h-5 w-5 text-green-500" />;
      case 'NEW_MESSAGE':
        return <FiMessageSquare className="h-5 w-5 text-blue-500" />;
      case 'TOUR_REMINDER':
        return <FiCalendar className="h-5 w-5 text-amber-500" />;
      case 'DOCUMENT_SHARED':
        return <FiFileText className="h-5 w-5 text-purple-500" />;
      case 'NOTE_ADDED':
        return <FiFileText className="h-5 w-5 text-indigo-500" />;
    }
  };
  
  // Get update message
  const getUpdateMessage = (update: InquiryUpdate): string => {
    switch (update.type) {
      case 'STATUS_CHANGE':
        return `Status changed from ${update.data.oldStatus} to ${update.data.newStatus}`;
      case 'NEW_MESSAGE':
        return `${update.data.messageCount} new ${update.data.messageCount === 1 ? 'message' : 'messages'} from ${update.data.senderName}`;
      case 'TOUR_REMINDER':
        return `Tour scheduled for ${new Date(update.data.tourDate!).toLocaleDateString()} at ${update.data.tourTime}`;
      case 'DOCUMENT_SHARED':
        return `New document shared: ${update.data.documentName}`;
      case 'NOTE_ADDED':
        return `New note added by ${update.data.noteAuthor}`;
      default:
        return 'New update';
    }
  };
  
  // Get action button for update type
  const getActionButton = (update: InquiryUpdate) => {
    switch (update.type) {
      case 'NEW_MESSAGE':
        return (
          <button 
            onClick={() => navigateToInquiry(update.inquiryId, update.type)}
            className="flex items-center rounded-md bg-primary-100 px-2 py-1 text-xs font-medium text-primary-700 hover:bg-primary-200"
          >
            Reply
          </button>
        );
      case 'TOUR_REMINDER':
        return (
          <button
            onClick={() => navigateToInquiry(update.inquiryId, update.type)}
            className="flex items-center rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-200"
          >
            View Tour
          </button>
        );
      case 'DOCUMENT_SHARED':
        return (
          <button
            onClick={() => navigateToInquiry(update.inquiryId, update.type)}
            className="flex items-center rounded-md bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700 hover:bg-purple-200"
          >
            View Document
          </button>
        );
      default:
        return (
          <button
            onClick={() => navigateToInquiry(update.inquiryId, update.type)}
            className="flex items-center rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-200"
          >
            View Details
          </button>
        );
    }
  };
  
  // WebSocket event simulation for demo purposes
  useEffect(() => {
    if (connectionState !== 'CONNECTED') return;
    
    const interval = setInterval(() => {
      // 15% chance of receiving a new update every 45 seconds
      if (Math.random() < 0.15) {
        const updateTypes: UpdateType[] = ['STATUS_CHANGE', 'NEW_MESSAGE', 'TOUR_REMINDER', 'DOCUMENT_SHARED', 'NOTE_ADDED'];
        const randomType = updateTypes[Math.floor(Math.random() * updateTypes.length)] ?? 'STATUS_CHANGE';
        
        const mockInquiryIds = (inquiryId ? [inquiryId] : ['inq-001', 'inq-002', 'inq-003']).filter(Boolean) as string[];
        const randomInquiryId = mockInquiryIds[Math.floor(Math.random() * mockInquiryIds.length)] ?? 'inq-001';
        
        const homeNames: Record<string, string> = {
          'inq-001': 'Sunshine Care Home',
          'inq-002': 'Golden Years Living',
          'inq-003': 'Serenity House'
        };
        
        const homeIds: Record<string, string> = {
          'inq-001': '1',
          'inq-002': '2',
          'inq-003': '3'
        };
        
        const newUpdate: InquiryUpdate = {
          id: `update-${Date.now()}`,
          inquiryId: randomInquiryId,
          homeName: homeNames[randomInquiryId] || 'Care Home',
          homeId: homeIds[randomInquiryId] || '1',
          type: randomType,
          timestamp: new Date().toISOString(),
          isRead: false,
          data: {}
        };
        
        // Add type-specific data
        switch (randomType) {
          case 'STATUS_CHANGE':
            const statuses: InquiryStatus[] = ['SUBMITTED', 'CONTACTED', 'TOUR_SCHEDULED', 'FOLLOW_UP', 'DECIDED'];
            const oldStatusIndex = Math.floor(Math.random() * (statuses.length - 1));
            newUpdate.data = {
              oldStatus: statuses[oldStatusIndex],
              newStatus: statuses[oldStatusIndex + 1]
            };
            break;
          case 'NEW_MESSAGE':
            newUpdate.data = {
              messageCount: Math.floor(Math.random() * 3) + 1,
              senderId: 'facility-001',
              senderName: 'Sarah Johnson',
              messagePreview: 'This is a new message about your inquiry...'
            };
            break;
          case 'TOUR_REMINDER':
            const tourDate = new Date();
            tourDate.setDate(tourDate.getDate() + Math.floor(Math.random() * 7) + 1);
            newUpdate.data = {
              tourDate: tourDate.toISOString().split('T')[0],
              tourTime: ['10:00 AM', '11:30 AM', '2:00 PM', '3:30 PM'][Math.floor(Math.random() * 4)]
            };
            break;
          case 'DOCUMENT_SHARED':
            const documentNames = ['Admission Forms.pdf', 'Care Agreement.pdf', 'Financial Information.pdf', 'Facility Policies.pdf'];
            newUpdate.data = {
              documentId: `doc-${Date.now()}`,
              documentName: documentNames[Math.floor(Math.random() * documentNames.length)]
            };
            break;
          case 'NOTE_ADDED':
            newUpdate.data = {
              noteContent: 'New note about the inquiry...',
              noteAuthor: 'Care Advisor'
            };
            break;
        }
        
        setUpdates(prev => [newUpdate, ...prev]);
        setNewUpdateAlert(true);
        
        // Hide the alert after 3 seconds
        setTimeout(() => {
          setNewUpdateAlert(false);
        }, 3000);
      }
    }, 45000); // Check every 45 seconds
    
    return () => clearInterval(interval);
  }, [connectionState, inquiryId]);
  
  // If there are no updates
  if (filteredUpdates.length === 0) {
    return (
      <div className={`rounded-lg border border-neutral-200 bg-white p-4 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-neutral-800">Inquiry Updates</h3>
          <button
            onClick={handleRefresh}
            className={`rounded-full p-2 text-neutral-500 hover:bg-neutral-100 ${isLoading ? 'animate-spin' : ''}`}
            disabled={isLoading}
          >
            <FiRefreshCw className="h-4 w-4" />
          </button>
        </div>
        
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="rounded-full bg-neutral-100 p-3 mb-2">
            <FiBell className="h-6 w-6 text-neutral-400" />
          </div>
          <p className="text-neutral-600 font-medium">No updates yet</p>
          <p className="text-sm text-neutral-500 mt-1">
            {inquiryId 
              ? "You'll be notified when there are updates for this inquiry" 
              : "You'll be notified when there are updates for your inquiries"}
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`rounded-lg border border-neutral-200 bg-white ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 p-4">
        <h3 className="text-lg font-medium text-neutral-800">
          Inquiry Updates
          {filteredUpdates.filter(u => !u.isRead).length > 0 && (
            <span className="ml-2 rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-800">
              {filteredUpdates.filter(u => !u.isRead).length} new
            </span>
          )}
        </h3>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={markAllAsRead}
            className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
            disabled={!filteredUpdates.some(u => !u.isRead)}
          >
            Mark all read
          </button>
          <button
            onClick={handleRefresh}
            className={`rounded-full p-2 text-neutral-500 hover:bg-neutral-100 ${isLoading ? 'animate-spin' : ''}`}
            disabled={isLoading}
          >
            <FiRefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Filters */}
      {showFilters && (
        <div className="border-b border-neutral-200 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                activeFilter === 'ALL'
                  ? 'bg-primary-100 text-primary-800'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveFilter('STATUS_CHANGE')}
              className={`flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                activeFilter === 'STATUS_CHANGE'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              <FiCheckCircle className="mr-1 h-3 w-3" />
              Status
            </button>
            <button
              onClick={() => setActiveFilter('NEW_MESSAGE')}
              className={`flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                activeFilter === 'NEW_MESSAGE'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              <FiMessageSquare className="mr-1 h-3 w-3" />
              Messages
            </button>
            <button
              onClick={() => setActiveFilter('TOUR_REMINDER')}
              className={`flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                activeFilter === 'TOUR_REMINDER'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              <FiCalendar className="mr-1 h-3 w-3" />
              Tours
            </button>
            <button
              onClick={() => setActiveFilter('DOCUMENT_SHARED')}
              className={`flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                activeFilter === 'DOCUMENT_SHARED'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              <FiFileText className="mr-1 h-3 w-3" />
              Documents
            </button>
            
            <div className="ml-auto">
              <button
                onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                className={`flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                  showUnreadOnly
                    ? 'bg-primary-100 text-primary-800'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {showUnreadOnly ? (
                  <>
                    <FiBellOff className="mr-1 h-3 w-3" />
                    Unread only
                  </>
                ) : (
                  <>
                    <FiBell className="mr-1 h-3 w-3" />
                    Show all
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* New update alert */}
      <AnimatePresence>
        {newUpdateAlert && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-primary-50 border-b border-primary-100 px-4 py-2 flex items-center justify-between"
          >
            <span className="text-sm text-primary-800 font-medium">
              New updates available
            </span>
            <button
              onClick={() => setNewUpdateAlert(false)}
              className="text-primary-600 hover:text-primary-800"
            >
              <FiX className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Updates list */}
      <div className="divide-y divide-neutral-100">
        <AnimatePresence initial={false}>
          {filteredUpdates.map((update) => (
            <motion.div
              key={update.id}
              initial={{ opacity: 0, backgroundColor: '#f0f9ff' }}
              animate={{ opacity: 1, backgroundColor: '#ffffff' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className={`relative p-4 ${!update.isRead ? 'bg-blue-50' : ''}`}
              onClick={() => markAsRead(update.id)}
            >
              {!update.isRead && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-500"></div>
              )}
              
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-0.5">
                  {getUpdateIcon(update.type)}
                </div>
                
                <div className="ml-3 flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-neutral-900">
                        {update.homeName}
                      </p>
                      <p className="text-sm text-neutral-700">
                        {getUpdateMessage(update)}
                      </p>
                      
                      {update.type === 'NEW_MESSAGE' && update.data.messagePreview && (
                        <p className="mt-1 text-sm italic text-neutral-500 line-clamp-1">
                          "{update.data.messagePreview}"
                        </p>
                      )}
                      
                      <p className="mt-1 text-xs text-neutral-500">
                        {formatTimestamp(update.timestamp)}
                      </p>
                    </div>
                    
                    <div className="ml-4 flex-shrink-0">
                      {getActionButton(update)}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      {/* Footer */}
      {filteredUpdates.length > 0 && !inquiryId && (
        <div className="border-t border-neutral-200 p-3 text-center">
          <button
            onClick={() => router.push('/dashboard/inquiries')}
            className="text-sm font-medium text-primary-600 hover:text-primary-800"
          >
            View all inquiries
          </button>
        </div>
      )}
    </div>
  );
};

export default RealTimeInquiryUpdates;
