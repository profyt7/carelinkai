'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FiBell, 
  FiMessageSquare, 
  FiCalendar, 
  FiInfo, 
  FiCheckCircle,
  FiFile,
  FiCheck,
  FiFilter,
  FiX
} from 'react-icons/fi';

type NotificationType = 
  | 'MESSAGE' 
  | 'INQUIRY_UPDATE' 
  | 'TOUR_REMINDER' 
  | 'DOCUMENT_SHARED'
  | 'STATUS_CHANGE'
  | 'SYSTEM';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: any;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [selectedType, setSelectedType] = useState<NotificationType | 'ALL'>('ALL');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const limit = 50;

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let url = `/api/notifications?page=${page}&limit=${limit}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      
      const data = await response.json();
      
      if (data.success && data.items) {
        let filteredItems = data.items.map((item: any) => ({
          id: item.id,
          type: item.type as NotificationType,
          title: item.title,
          message: item.message,
          isRead: item.isRead,
          createdAt: item.createdAt,
          data: item.data
        }));
        
        if (selectedType !== 'ALL') {
          filteredItems = filteredItems.filter(item => item.type === selectedType);
        }
        
        if (unreadOnly) {
          filteredItems = filteredItems.filter(item => !item.isRead);
        }
        
        setNotifications(filteredItems);
        setTotal(data.total);
        setHasMore(data.hasMore);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };
  
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
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };
  
  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ all: true })
      });
      
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };
  
  useEffect(() => {
    fetchNotifications();
  }, [page, selectedType, unreadOnly]);
  
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
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-neutral-800 mb-4 sm:mb-0">
          Notifications
        </h1>
        <div className="flex items-center space-x-2">
          <Link
            href="/dashboard"
            className="rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-200"
          >
            Back to Dashboard
          </Link>
          <button
            onClick={markAllAsRead}
            className="rounded-md bg-primary-100 px-4 py-2 text-sm font-medium text-primary-700 hover:bg-primary-200"
            disabled={notifications.every(n => n.isRead)}
          >
            Mark All Read
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between">
          <div className="mb-4 sm:mb-0">
            <h2 className="text-sm font-medium text-neutral-700 mb-2 flex items-center">
              <FiFilter className="mr-1" /> Filter by type
            </h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedType('ALL')}
                className={`rounded-md px-3 py-1 text-xs font-medium ${
                  selectedType === 'ALL'
                    ? 'bg-primary-100 text-primary-800'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSelectedType('MESSAGE')}
                className={`rounded-md px-3 py-1 text-xs font-medium ${
                  selectedType === 'MESSAGE'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                Messages
              </button>
              <button
                onClick={() => setSelectedType('TOUR_REMINDER')}
                className={`rounded-md px-3 py-1 text-xs font-medium ${
                  selectedType === 'TOUR_REMINDER'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                Tours
              </button>
              <button
                onClick={() => setSelectedType('DOCUMENT_SHARED')}
                className={`rounded-md px-3 py-1 text-xs font-medium ${
                  selectedType === 'DOCUMENT_SHARED'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                Documents
              </button>
              <button
                onClick={() => setSelectedType('STATUS_CHANGE')}
                className={`rounded-md px-3 py-1 text-xs font-medium ${
                  selectedType === 'STATUS_CHANGE'
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                Status
              </button>
              <button
                onClick={() => setSelectedType('SYSTEM')}
                className={`rounded-md px-3 py-1 text-xs font-medium ${
                  selectedType === 'SYSTEM'
                    ? 'bg-neutral-300 text-neutral-800'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                System
              </button>
            </div>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={unreadOnly}
                onChange={() => setUnreadOnly(!unreadOnly)}
                className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-neutral-700">Unread only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
        {loading && (
          <div className="flex justify-center p-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-primary-500 border-neutral-200"></div>
          </div>
        )}

        {error && (
          <div className="p-8 text-center">
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchNotifications}
              className="mt-4 rounded-md bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-neutral-100 p-4">
              <FiBell className="h-8 w-8 text-neutral-400" />
            </div>
            <p className="mt-4 text-center text-neutral-500">No notifications found</p>
          </div>
        )}

        {!loading && !error && notifications.length > 0 && (
          <div className="divide-y divide-neutral-200">
            {notifications.map(notification => (
              <div
                key={notification.id}
                className={`relative p-4 transition-colors duration-200 hover:bg-neutral-50 ${
                  notification.isRead ? 'bg-white' : 'bg-primary-50'
                }`}
              >
                <div className="flex">
                  <div className="flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="ml-3 flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-neutral-900">{notification.title}</h3>
                        <p className="mt-1 text-sm text-neutral-700">{notification.message}</p>
                        <p className="mt-1 text-xs text-neutral-500">
                          {formatTimestamp(notification.createdAt)}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="ml-2 flex-shrink-0 rounded-full bg-primary-100 p-1 text-primary-600 hover:bg-primary-200"
                          title="Mark as read"
                        >
                          <FiCheck className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className={`rounded-md border px-4 py-2 text-sm font-medium ${
              page === 1
                ? 'border-neutral-200 bg-neutral-100 text-neutral-400'
                : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            Previous
          </button>
          <span className="text-sm text-neutral-600">
            Page {page} of {Math.ceil(total / limit)}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={!hasMore}
            className={`rounded-md border px-4 py-2 text-sm font-medium ${
              !hasMore
                ? 'border-neutral-200 bg-neutral-100 text-neutral-400'
                : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
