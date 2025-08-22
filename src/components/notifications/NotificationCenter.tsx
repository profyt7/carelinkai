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
  FiSettings,
  FiVolume2,
  FiVolumeX
} from 'react-icons/fi';

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
  userId?: string;
}

// Main NotificationCenter Component
const NotificationCenter: React.FC<NotificationCenterProps> = ({
  maxToasts = 3,
  toastDuration = 5000,
  className = '',
  userId
}) => {
  // State
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeToasts, setActiveToasts] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<NotificationType | 'ALL'>('ALL');
  const [prefs, setPrefs] = useState<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  
  // Helper functions for notification preferences
  const isMention = (item: any) => item?.data?.kind === 'mention';
  
  const threadKey = (item: any) => {
    const rt = item?.data?.resourceType;
    if (!rt) return undefined;
    const id = item?.data?.documentId || item?.data?.noteId || item?.data?.galleryId;
    return id ? `${rt}:${id}` : undefined;
  };
  
  const isMuted = (item: any) => {
    const key = threadKey(item);
    const m = prefs?.notifications?.mutes?.threads || [];
    return key ? m.includes(key) : false;
  };
  
  const allowToast = (item: any) => {
    if (!isMention(item)) return true; // only gating mentions for now
    const ch = prefs?.notifications?.channels?.mentions;
    return ch?.toast !== false; // default true
  };
  
  // Show toast notification
  const showToast = useCallback((notification: Notification) => {
    // Skip showing toast if notification is muted or toasts are disabled for this type
    if (isMuted({ data: notification.metadata }) || !allowToast({ data: notification.metadata })) {
      return;
    }
    
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
  }, [maxToasts, prefs]);

  // Fetch user preferences
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const response = await fetch('/api/profile/preferences');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data && data.data.preferences) {
            setPrefs(data.data.preferences);
          }
        }
      } catch (error) {
        console.error('Error fetching user preferences:', error);
      }
    };
    
    fetchPreferences();
  }, []);

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

  // Fetch notifications on mount
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch('/api/notifications?page=1&limit=50');
        if (!response.ok) {
          throw new Error('Failed to fetch notifications');
        }
        
        const data = await response.json();
        if (data.success && data.items) {
          // Map server notifications to component format
          const mappedNotifications = data.items.map((item: any) => {
            // Map notification type to known values or default to SYSTEM
            let type: NotificationType = 'SYSTEM';
            if (['MESSAGE', 'INQUIRY_UPDATE', 'TOUR_REMINDER', 'DOCUMENT_SHARED', 'STATUS_CHANGE'].includes(item.type)) {
              type = item.type as NotificationType;
            }
            
            // Determine link from data
            let link: string | undefined = undefined;
            if (item.data?.url) {
              link = item.data.url;
            } else if (item.data?.resourceType === 'document' && item.data?.documentId) {
              link = `/family?documentId=${item.data.documentId}`;
            }
            
            return {
              id: item.id,
              type,
              title: item.title,
              message: item.message,
              timestamp: item.createdAt,
              isRead: item.isRead,
              priority: item.data?.priority || 'MEDIUM',
              link,
              metadata: item.data
            } as Notification;
          });
          
          // Filter out muted notifications
          const filtered = mappedNotifications.filter((n: any) => !isMuted({ data: n.metadata }));
          setNotifications(filtered);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };
    
    fetchNotifications();
  }, [prefs]); // Re-fetch when preferences change
  
  // Set up SSE subscription if userId is provided
  useEffect(() => {
    if (!userId) return;
    
    // Clean up any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    
    // Create new EventSource connection
    const eventSource = new EventSource(`/api/sse?topics=${encodeURIComponent(`user:${userId}`)}`);
    eventSourceRef.current = eventSource;
    
    // Handle new notifications
    eventSource.addEventListener('notification:created', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.notification) {
          const item = data.notification;
          
          // Skip if notification is muted
          if (isMuted(item)) {
            return;
          }
          
          // Map to component notification format
          let type: NotificationType = 'SYSTEM';
          if (['MESSAGE', 'INQUIRY_UPDATE', 'TOUR_REMINDER', 'DOCUMENT_SHARED', 'STATUS_CHANGE'].includes(item.type)) {
            type = item.type as NotificationType;
          }
          
          // Determine link from data
          let link: string | undefined = undefined;
          if (item.data?.url) {
            link = item.data.url;
          } else if (item.data?.resourceType === 'document' && item.data?.documentId) {
            link = `/family?documentId=${item.data.documentId}`;
          }
          
          const notification: Notification = {
            id: item.id,
            type,
            title: item.title,
            message: item.message,
            timestamp: item.createdAt,
            isRead: item.isRead,
            priority: item.data?.priority || 'MEDIUM',
            link,
            metadata: item.data
          };
          
          // Add to notifications and show toast (if allowed)
          setNotifications(prev => [notification, ...prev]);
          
          // Only show toast if allowed by preferences
          if (allowToast(item)) {
            showToast(notification);
          }
        }
      } catch (error) {
        console.error('Error processing SSE notification:', error);
      }
    });
    
    // Handle notification updates (mark as read)
    eventSource.addEventListener('notification:updated', (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle marking all as read
        if (data.allMarkedRead) {
          setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
          return;
        }
        
        // Handle marking specific notifications as read
        if (data.markedRead && Array.isArray(data.markedRead)) {
          setNotifications(prev => 
            prev.map(n => 
              data.markedRead.includes(n.id) ? { ...n, isRead: true } : n
            )
          );
        }
      } catch (error) {
        console.error('Error processing SSE notification update:', error);
      }
    });
    
    // Handle connection errors
    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      // Attempt to reconnect after a delay
      setTimeout(() => {
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
      }, 5000);
    };
    
    // Clean up on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [userId, showToast, prefs]);
  
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
  const toggleDropdown = async () => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    
    // Mark all as read when opening
    if (newIsOpen) {
      try {
        const response = await fetch('/api/notifications', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ all: true })
        });
        
        if (response.ok) {
          // Update local state
          setNotifications(prev => 
            prev.map(n => ({ ...n, isRead: true }))
          );
        }
      } catch (error) {
        console.error('Error marking notifications as read:', error);
      }
    }
  };
  
  // Mark notification as read
  const markAsRead = async (id: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids: [id] })
      });
      
      if (response.ok) {
        // Update local state
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };
  
  // Mute thread
  const muteThread = async (notification: Notification) => {
    const key = threadKey({ data: notification.metadata });
    if (!key) return;
    
    // Get current muted threads
    const currentMutes = prefs?.notifications?.mutes?.threads || [];
    
    // Skip if already muted
    if (currentMutes.includes(key)) return;
    
    // Update local state optimistically
    const updatedMutes = [...currentMutes, key];
    setPrefs((prev: any) => ({
      ...prev,
      notifications: {
        ...(prev?.notifications || {}),
        mutes: {
          ...(prev?.notifications?.mutes || {}),
          threads: updatedMutes
        }
      }
    }));
    
    // Remove notification from list
    removeNotification(notification.id);
    
    try {
      // Send update to server
      const response = await fetch('/api/profile/preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notifications: {
            mutes: {
              threads: updatedMutes
            }
          }
        })
      });
      
      if (!response.ok) {
        // Revert on failure
        setPrefs((prev: any) => ({
          ...prev,
          notifications: {
            ...(prev?.notifications || {}),
            mutes: {
              ...(prev?.notifications?.mutes || {}),
              threads: currentMutes
            }
          }
        }));
      }
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      
      // Revert on failure
      setPrefs((prev: any) => ({
        ...prev,
        notifications: {
          ...(prev?.notifications || {}),
          mutes: {
            ...(prev?.notifications?.mutes || {}),
            threads: currentMutes
          }
        }
      }));
    }
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
                              {threadKey({ data: notification.metadata }) && (
                                <button
                                  onClick={() => muteThread(notification)}
                                  className="mr-1 rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                                  title="Mute thread"
                                >
                                  <FiVolumeX className="h-3 w-3" />
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
