"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  FiBell, 
  FiMessageSquare, 
  FiCalendar, 
  FiClock, 
  FiCheckCircle,
  FiAlertCircle,
  FiInfo,
  FiX,
  FiCheck,
  FiTrash2,
  FiSettings
} from 'react-icons/fi';
import { useWebSocket } from '../../contexts/WebSocketContext';

// Notification types
export type NotificationType = 
  | 'MESSAGE' 
  | 'INQUIRY_UPDATE' 
  | 'TOUR_REMINDER' 
  | 'DOCUMENT_SHARED'
  | 'STATUS_CHANGE'
  | 'SYSTEM';

// Priority levels
export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH';

// Notification interface
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  priority: NotificationPriority;
  link?: string;
  metadata?: {
    inquiryId?: string;
    conversationId?: string;
    homeName?: string;
    senderId?: string;
    senderName?: string;
    documentId?: string;
    documentName?: string;
    tourDate?: string;
    tourTime?: string;
    statusFrom?: string;
    statusTo?: string;
    [key: string]: any;
  };
}

// Toast notification props
interface ToastProps {
  notification: Notification;
  onClose: () => void;
  autoClose?: boolean;
  duration?: number;
}

// Mock notifications for testing
const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-001',
    type: 'MESSAGE',
    title: 'New message from Sunshine Care Home',
    message: 'Sarah Johnson: "Thank you for your inquiry. Would you like to schedule a tour?"',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
    isRead: false,
    priority: 'MEDIUM',
    link: '/dashboard/inquiries/inq-001/messages',
    metadata: {
      inquiryId: 'inq-001',
      conversationId: 'conv-001',
      homeName: 'Sunshine Care Home',
      senderId: 'facility-001',
      senderName: 'Sarah Johnson'
    }
  },
  {
    id: 'notif-002',
    type: 'TOUR_REMINDER',
    title: 'Upcoming Tour Reminder',
    message: 'Your tour at Sunshine Care Home is scheduled for tomorrow at 10:00 AM',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
    isRead: false,
    priority: 'HIGH',
    link: '/dashboard/inquiries/inq-001',
    metadata: {
      inquiryId: 'inq-001',
      homeName: 'Sunshine Care Home',
      tourDate: '2025-07-26',
      tourTime: '10:00 AM'
    }
  },
  {
    id: 'notif-003',
    type: 'DOCUMENT_SHARED',
    title: 'New Document Shared',
    message: 'Sunshine Care Home shared "Admission Forms" with you',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    isRead: true,
    priority: 'MEDIUM',
    link: '/dashboard/inquiries/inq-001/documents',
    metadata: {
      inquiryId: 'inq-001',
      homeName: 'Sunshine Care Home',
      documentId: 'doc-003',
      documentName: 'Admission Forms'
    }
  },
  {
    id: 'notif-004',
    type: 'STATUS_CHANGE',
    title: 'Inquiry Status Updated',
    message: 'Your inquiry for Golden Years Living has been updated from "Submitted" to "Contacted"',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
    isRead: true,
    priority: 'LOW',
    link: '/dashboard/inquiries/inq-002',
    metadata: {
      inquiryId: 'inq-002',
      homeName: 'Golden Years Living',
      statusFrom: 'SUBMITTED',
      statusTo: 'CONTACTED'
    }
  },
  {
    id: 'notif-005',
    type: 'SYSTEM',
    title: 'Welcome to CareLink AI',
    message: 'Thank you for joining CareLink AI. Start your care home search today!',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
    isRead: true,
    priority: 'LOW'
  }
];

// Toast Notification Component
const Toast: React.FC<ToastProps> = ({ notification, onClose, autoClose = true, duration = 5000 }) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (autoClose) {
      timerRef.current = setTimeout(() => {
        onClose();
      }, duration);
    }
    
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [autoClose, duration, onClose]);
  
  // Get icon based on notification type
  const getIcon = () => {
    switch (notification.type) {
      case 'MESSAGE':
        return <FiMessageSquare className="h-5 w-5 text-blue-500" />;
      case 'INQUIRY_UPDATE':
        return <FiInfo className="h-5 w-5 text-purple-500" />;
      case 'TOUR_REMINDER':
        return <FiCalendar className="h-5 w-5 text-amber-500" />;
      case 'DOCUMENT_SHARED':
        return <FiFile className="h-5 w-5 text-green-500" />;
      case 'STATUS_CHANGE':
        return <FiCheckCircle className="h-5 w-5 text-indigo-500" />;
      case 'SYSTEM':
        return <FiInfo className="h-5 w-5 text-neutral-500" />;
      default:
        return <FiBell className="h-5 w-5 text-primary-500" />;
    }
  };
  
  // Get background color based on priority
  const getBgColor = () => {
    switch (notification.priority) {
      case 'HIGH':
        return 'bg-red-50 border-red-200';
      case 'MEDIUM':
        return 'bg-amber-50 border-amber-200';
      case 'LOW':
      default:
        return 'bg-white border-neutral-200';
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      className={`w-full max-w-sm rounded-lg border shadow-md ${getBgColor()}`}
      onMouseEnter={() => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      }}
      onMouseLeave={() => {
        if (autoClose) {
          timerRef.current = setTimeout(() => {
            onClose();
          }, duration);
        }
      }}
    >
      <div className="flex items-start p-4">
        <div className="flex-shrink-0">{getIcon()}</div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium text-neutral-900">{notification.title}</p>
          <p className="mt-1 text-sm text-neutral-700">{notification.message}</p>
          <div className="mt-2 flex">
            {notification.link && (
              <a
                href={notification.link}
                className="mr-2 text-xs font-medium text-primary-600 hover:text-primary-500"
              >
                View Details
              </a>
            )}
            <button
              onClick={onClose}
              className="text-xs font-medium text-neutral-700 hover:text-neutral-500"
            >
              Dismiss
            </button>
          </div>
        </div>
        <button
          onClick={onClose}
          className="ml-4 inline-flex flex-shrink-0 rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-500"
        >
          <FiX className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
};

// NotificationCenter Props
interface NotificationCenterProps {
  maxToasts?: number;
  toastDuration?: number;
  className?: string;
}

// Main NotificationCenter Component
const NotificationCenter: React.FC<NotificationCenterProps> = ({
  maxToasts = 3,
  toastDuration = 5000,
  className = ''
}) => {
  // State
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [activeToasts, setActiveToasts] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<NotificationType | 'ALL'>('ALL');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Get WebSocket context
  // In a real implementation, we would use the WebSocket context
  // For now, we'll just simulate it
  // const { connectionState } = useWebSocket();
  const connectionState = 'CONNECTED';
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Get unread count
  const unreadCount = notifications.filter(n => !n.isRead).length;
  
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
  
  // Toggle dropdown
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    
    // Mark all as read when opening
    if (!isOpen) {
      setNotifications(prev => 
        prev.map(n => ({ ...n, isRead: true }))
      );
    }
  };
  
  // Mark notification as read
  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
    );
  };
  
  // Remove notification
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    setActiveToasts(prev => prev.filter(n => n.id !== id));
  };
  
  // Clear all notifications
  const clearAllNotifications = () => {
    setNotifications([]);
    setActiveToasts([]);
  };
  
  // Show toast notification
  const showToast = useCallback((notification: Notification) => {
    setActiveToasts(prev => {
      // Limit number of active toasts
      const updated = [...prev];
      if (updated.length >= maxToasts) {
        updated.pop(); // Remove oldest
      }
      return [notification, ...updated];
    });
    
    // Add to notifications list if not already there
    setNotifications(prev => {
      if (!prev.some(n => n.id === notification.id)) {
        return [notification, ...prev];
      }
      return prev;
    });
  }, [maxToasts]);
  
  // Close toast
  const closeToast = (id: string) => {
    setActiveToasts(prev => prev.filter(n => n.id !== id));
  };
  
  // Filter notifications
  const filteredNotifications = filter === 'ALL' 
    ? notifications 
    : notifications.filter(n => n.type === filter);
  
  // Get icon based on notification type
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'MESSAGE':
        return <FiMessageSquare className="h-5 w-5 text-blue-500" />;
      case 'INQUIRY_UPDATE':
        return <FiInfo className="h-5 w-5 text-purple-500" />;
      case 'TOUR_REMINDER':
        return <FiCalendar className="h-5 w-5 text-amber-500" />;
      case 'DOCUMENT_SHARED':
        return <FiFile className="h-5 w-5 text-green-500" />;
      case 'STATUS_CHANGE':
        return <FiCheckCircle className="h-5 w-5 text-indigo-500" />;
      case 'SYSTEM':
        return <FiInfo className="h-5 w-5 text-neutral-500" />;
      default:
        return <FiBell className="h-5 w-5 text-primary-500" />;
    }
  };
  
  // Simulate receiving a new notification
  useEffect(() => {
    const interval = setInterval(() => {
      // 10% chance of receiving a new notification every 30 seconds
      if (Math.random() < 0.1 && connectionState === 'CONNECTED') {
        const types: NotificationType[] = ['MESSAGE', 'INQUIRY_UPDATE', 'TOUR_REMINDER', 'DOCUMENT_SHARED', 'STATUS_CHANGE'];
        const randomType = types[Math.floor(Math.random() * types.length)] as NotificationType;
        
        const newNotification: Notification = {
          id: `notif-${Date.now()}`,
          type: randomType,
          title: `New ${randomType.toLowerCase().replace('_', ' ')}`,
          message: `This is a simulated ${randomType.toLowerCase().replace('_', ' ')} notification.`,
          timestamp: new Date().toISOString(),
          isRead: false,
          priority: Math.random() > 0.7 ? 'HIGH' : Math.random() > 0.4 ? 'MEDIUM' : 'LOW'
        };
        
        showToast(newNotification);
      }
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, [connectionState, showToast]);
  
  // For testing: show a toast notification on mount
  useEffect(() => {
    const testNotification: Notification = {
      id: `notif-test-${Date.now()}`,
      type: 'MESSAGE',
      title: 'Welcome to Real-time Notifications',
      message: 'You will now receive real-time updates about your inquiries and messages.',
      timestamp: new Date().toISOString(),
      isRead: false,
      priority: 'MEDIUM'
    };
    
    // Show test notification after 2 seconds
    const timer = setTimeout(() => {
      showToast(testNotification);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [showToast]);
  
  return (
    <>
      {/* Notification Bell Button */}
      <div className={`relative ${className}`} ref={dropdownRef}>
        <button
          onClick={toggleDropdown}
          className="relative rounded-full p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 focus:outline-none"
          aria-label="Notifications"
        >
          <FiBell className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-primary-500 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        
        {/* Notification Dropdown */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-80 rounded-md border border-neutral-200 bg-white shadow-lg sm:w-96">
            <div className="border-b border-neutral-200 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-neutral-800">Notifications</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setFilter('ALL')}
                    className={`rounded-md px-2 py-1 text-xs font-medium ${
                      filter === 'ALL'
                        ? 'bg-primary-100 text-primary-800'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilter('MESSAGE')}
                    className={`rounded-md px-2 py-1 text-xs font-medium ${
                      filter === 'MESSAGE'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    Messages
                  </button>
                  <button
                    onClick={() => setFilter('TOUR_REMINDER')}
                    className={`rounded-md px-2 py-1 text-xs font-medium ${
                      filter === 'TOUR_REMINDER'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    Tours
                  </button>
                </div>
              </div>
            </div>
            
            {/* Notification List */}
            <div className="max-h-96 overflow-y-auto p-2">
              {filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="rounded-full bg-neutral-100 p-3">
                    <FiBell className="h-6 w-6 text-neutral-400" />
                  </div>
                  <p className="mt-2 text-center text-sm text-neutral-500">
                    No notifications yet
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredNotifications.map(notification => (
                    <div
                      key={notification.id}
                      className={`relative rounded-md border ${
                        notification.isRead ? 'border-neutral-100 bg-white' : 'border-primary-100 bg-primary-50'
                      } p-3 transition-colors duration-200 hover:bg-neutral-50`}
                    >
                      <div className="flex">
                        <div className="flex-shrink-0">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="ml-3 flex-1">
                          <div className="flex items-start justify-between">
                            <a
                              href={notification.link || '#'}
                              className="text-sm font-medium text-neutral-900 hover:text-primary-600"
                              onClick={() => markAsRead(notification.id)}
                            >
                              {notification.title}
                            </a>
                            <div className="ml-2 flex items-center">
                              {!notification.isRead && (
                                <button
                                  onClick={() => markAsRead(notification.id)}
                                  className="mr-1 rounded-full bg-primary-100 p-1 text-primary-600 hover:bg-primary-200"
                                  title="Mark as read"
                                >
                                  <FiCheck className="h-3 w-3" />
                                </button>
                              )}
                              <button
                                onClick={() => removeNotification(notification.id)}
                                className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                                title="Remove notification"
                              >
                                <FiX className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-neutral-700">{notification.message}</p>
                          <p className="mt-1 text-xs text-neutral-500">
                            {formatTimestamp(notification.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="border-t border-neutral-200 p-3">
              <div className="flex justify-between">
                <button
                  onClick={clearAllNotifications}
                  className="flex items-center text-xs font-medium text-neutral-700 hover:text-neutral-900"
                  disabled={notifications.length === 0}
                >
                  <FiTrash2 className="mr-1 h-3 w-3" />
                  Clear all
                </button>
                <a
                  href="/settings/notifications"
                  className="flex items-center text-xs font-medium text-primary-600 hover:text-primary-700"
                >
                  <FiSettings className="mr-1 h-3 w-3" />
                  Notification settings
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Toast Container */}
      <div className="fixed right-4 top-4 z-50 flex flex-col items-end space-y-2">
        <AnimatePresence>
          {activeToasts.map(toast => (
            <Toast
              key={toast.id}
              notification={toast}
              onClose={() => closeToast(toast.id)}
              autoClose={true}
              duration={toastDuration}
            />
          ))}
        </AnimatePresence>
      </div>
    </>
  );
};

// Missing FiFile icon definition
const FiFile: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
  </svg>
);

export default NotificationCenter;
