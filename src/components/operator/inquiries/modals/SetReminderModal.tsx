'use client';

import { useState } from 'react';
import { FiX, FiBell, FiCalendar, FiClock } from 'react-icons/fi';
import { format } from 'date-fns';

interface SetReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  inquiryId: string;
  inquiryData: any;
}

const REMINDER_TYPES = [
  { value: 'FOLLOW_UP_CALL', label: 'Follow-up Call' },
  { value: 'SEND_EMAIL', label: 'Send Email' },
  { value: 'SCHEDULE_TOUR', label: 'Schedule Tour' },
  { value: 'CHECK_DOCUMENTS', label: 'Check Documents' },
  { value: 'REVIEW_STATUS', label: 'Review Status' },
  { value: 'CUSTOM', label: 'Custom' },
];

export function SetReminderModal({ isOpen, onClose, inquiryId, inquiryData }: SetReminderModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    type: 'FOLLOW_UP_CALL',
    dueDate: '',
    dueTime: '',
    notes: '',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/operator/inquiries/${inquiryId}/reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: formData.type,
          dueDate: `${formData.dueDate}T${formData.dueTime}:00.000Z`,
          notes: formData.notes,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to set reminder');
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FiBell className="w-5 h-5" />
            Set Reminder
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isLoading}
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Reminder Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reminder Type *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {REMINDER_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FiCalendar className="inline w-4 h-4 mr-1" />
              Due Date *
            </label>
            <input
              type="date"
              required
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>

          {/* Due Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FiClock className="inline w-4 h-4 mr-1" />
              Due Time *
            </label>
            <input
              type="time"
              required
              value={formData.dueTime}
              onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional details or context"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Setting...' : 'Set Reminder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
