"use client";
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  FiCheckCircle, 
  FiAlertCircle, 
  FiActivity, 
  FiFileText, 
  FiUsers, 
  FiHome,
  FiCalendar,
  FiClock
} from 'react-icons/fi';

type TimelineEvent = {
  id: string;
  eventType: string;
  title: string;
  description?: string | null;
  scheduledAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
};

interface ResidentTimelineProps {
  residentId: string;
}

export function ResidentTimeline({ residentId }: ResidentTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const limit = 20;

  useEffect(() => {
    fetchEvents();
  }, [residentId]);

  async function fetchEvents() {
    try {
      setLoading(true);
      const res = await fetch(`/api/residents/${residentId}/timeline?limit=${limit * page}`);
      if (!res.ok) throw new Error('Failed to fetch timeline');
      const data = await res.json();
      setEvents(data.items || []);
      setHasMore(data.items?.length >= limit * page);
    } catch (error) {
      console.error('Error fetching timeline:', error);
      toast.error('Failed to load timeline');
    } finally {
      setLoading(false);
    }
  }

  function getEventIcon(eventType: string) {
    switch (eventType.toLowerCase()) {
      case 'created':
      case 'admission':
        return <FiHome className="text-blue-600" size={18} />;
      case 'updated':
      case 'assessment':
        return <FiFileText className="text-green-600" size={18} />;
      case 'note':
      case 'note_added':
        return <FiFileText className="text-purple-600" size={18} />;
      case 'care_level_changed':
      case 'medication_change':
        return <FiActivity className="text-orange-600" size={18} />;
      case 'transfer':
      case 'home_transferred':
        return <FiUsers className="text-indigo-600" size={18} />;
      case 'appointment':
        return <FiCalendar className="text-pink-600" size={18} />;
      case 'incident':
        return <FiAlertCircle className="text-red-600" size={18} />;
      case 'completed':
        return <FiCheckCircle className="text-green-600" size={18} />;
      default:
        return <FiActivity className="text-gray-600" size={18} />;
    }
  }

  function getEventColor(eventType: string) {
    switch (eventType.toLowerCase()) {
      case 'created':
      case 'admission':
        return 'bg-blue-100 border-blue-300';
      case 'updated':
      case 'assessment':
        return 'bg-green-100 border-green-300';
      case 'note':
      case 'note_added':
        return 'bg-purple-100 border-purple-300';
      case 'care_level_changed':
      case 'medication_change':
        return 'bg-orange-100 border-orange-300';
      case 'transfer':
      case 'home_transferred':
        return 'bg-indigo-100 border-indigo-300';
      case 'appointment':
        return 'bg-pink-100 border-pink-300';
      case 'incident':
        return 'bg-red-100 border-red-300';
      case 'completed':
        return 'bg-green-100 border-green-300';
      default:
        return 'bg-gray-100 border-gray-300';
    }
  }

  function formatTimestamp(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatScheduledDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  if (loading && events.length === 0) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
        <FiClock className="mx-auto text-gray-400 mb-2" size={32} />
        <p className="text-gray-500 text-sm">No timeline events yet.</p>
        <p className="text-gray-400 text-xs mt-1">Activity will appear here as it occurs.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Timeline Events */}
      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200"></div>

        {/* Events List */}
        <div className="space-y-6">
          {events.map((event, index) => (
            <div key={event.id} className="relative flex gap-4">
              {/* Icon Circle */}
              <div className={`relative z-10 w-10 h-10 rounded-full border-2 flex items-center justify-center bg-white ${getEventColor(event.eventType)}`}>
                {getEventIcon(event.eventType)}
              </div>

              {/* Event Card */}
              <div className="flex-1 bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                {/* Event Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900">{event.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{formatTimestamp(event.createdAt)}</p>
                  </div>
                  <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                    {event.eventType.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Event Description */}
                {event.description && (
                  <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                )}

                {/* Scheduled/Completed Times */}
                {(event.scheduledAt || event.completedAt) && (
                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
                    {event.scheduledAt && (
                      <div className="flex items-center gap-1">
                        <FiCalendar size={12} />
                        <span>Scheduled: {formatScheduledDate(event.scheduledAt)}</span>
                      </div>
                    )}
                    {event.completedAt && (
                      <div className="flex items-center gap-1">
                        <FiCheckCircle size={12} />
                        <span>Completed: {formatScheduledDate(event.completedAt)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="text-center pt-4">
          <button
            onClick={() => {
              setPage(page + 1);
              fetchEvents();
            }}
            className="text-primary-600 hover:text-primary-800 text-sm font-medium hover:underline"
          >
            Load more events
          </button>
        </div>
      )}
    </div>
  );
}
