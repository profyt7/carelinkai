'use client';

import { FiBell, FiClock, FiUser, FiCheckCircle } from 'react-icons/fi';
import { format, isPast, differenceInHours } from 'date-fns';
import Link from 'next/link';
import { useState } from 'react';

interface Reminder {
  id: string;
  type: string;
  dueDate: Date | string;
  notes?: string;
  completed: boolean;
  inquiry: {
    id: string;
    family: {
      user: {
        firstName: string;
        lastName: string;
      };
    };
  };
}

interface FollowUpRemindersWidgetProps {
  reminders: Reminder[];
  onUpdate?: () => void;
}

export function FollowUpRemindersWidget({ reminders, onUpdate }: FollowUpRemindersWidgetProps) {
  const [completingId, setCompletingId] = useState<string | null>(null);

  const sortedReminders = [...reminders]
    .filter(r => !r.completed)
    .sort((a, b) => {
      const dateA = new Date(a.dueDate).getTime();
      const dateB = new Date(b.dueDate).getTime();
      return dateA - dateB;
    });

  const getUrgencyColor = (dueDate: Date | string) => {
    const date = new Date(dueDate);
    const now = new Date();
    const hoursUntil = differenceInHours(date, now);

    if (isPast(date)) return 'bg-red-50 border-red-200 text-red-800';
    if (hoursUntil < 24) return 'bg-orange-50 border-orange-200 text-orange-800';
    if (hoursUntil < 72) return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    return 'bg-green-50 border-green-200 text-green-800';
  };

  const getUrgencyLabel = (dueDate: Date | string) => {
    const date = new Date(dueDate);
    const now = new Date();
    const hoursUntil = differenceInHours(date, now);

    if (isPast(date)) return 'Overdue';
    if (hoursUntil < 24) return 'Due today';
    if (hoursUntil < 48) return 'Due tomorrow';
    return 'Upcoming';
  };

  const handleCompleteReminder = async (reminderId: string) => {
    setCompletingId(reminderId);
    try {
      const response = await fetch(`/api/operator/inquiries/reminders/${reminderId}/complete`, {
        method: 'PATCH',
      });

      if (!response.ok) throw new Error('Failed to complete reminder');

      onUpdate?.();
    } catch (error) {
      console.error('Error completing reminder:', error);
    } finally {
      setCompletingId(null);
    }
  };

  if (sortedReminders.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FiBell className="w-5 h-5" />
          Follow-up Reminders
        </h3>
        <div className="text-center py-8 text-gray-500">
          <FiBell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>No pending reminders</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <FiBell className="w-5 h-5" />
        Follow-up Reminders
        <span className="ml-auto text-sm font-normal text-gray-500">
          {sortedReminders.length} pending
        </span>
      </h3>

      <div className="space-y-3">
        {sortedReminders.slice(0, 5).map((reminder) => (
          <div
            key={reminder.id}
            className="p-3 border rounded-lg hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">
                    {reminder.type.replace(/_/g, ' ')}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getUrgencyColor(
                      reminder.dueDate
                    )}`}
                  >
                    {getUrgencyLabel(reminder.dueDate)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <FiUser className="w-4 h-4 flex-shrink-0" />
                  <Link
                    href={`/operator/inquiries/${reminder.inquiry.id}`}
                    className="text-blue-600 hover:text-blue-800 truncate"
                  >
                    {reminder.inquiry.family.user.firstName}{' '}
                    {reminder.inquiry.family.user.lastName}
                  </Link>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FiClock className="w-4 h-4 flex-shrink-0" />
                  <span>{format(new Date(reminder.dueDate), 'MMM d, yyyy • h:mm a')}</span>
                </div>
                {reminder.notes && (
                  <p className="text-sm text-gray-600 mt-2 truncate">{reminder.notes}</p>
                )}
              </div>
              <button
                onClick={() => handleCompleteReminder(reminder.id)}
                disabled={completingId === reminder.id}
                className="flex-shrink-0 p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                title="Mark as complete"
              >
                <FiCheckCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {sortedReminders.length > 5 && (
        <div className="mt-4 text-center">
          <Link
            href="/operator/inquiries?filter=reminders"
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View all {sortedReminders.length} reminders →
          </Link>
        </div>
      )}
    </div>
  );
}
