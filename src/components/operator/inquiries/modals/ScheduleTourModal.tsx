'use client';

import { useState } from 'react';
import { FiX, FiCalendar, FiClock, FiUser } from 'react-icons/fi';
import { format } from 'date-fns';

interface ScheduleTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  inquiryId: string;
  inquiryData: any;
}

export function ScheduleTourModal({ isOpen, onClose, inquiryId, inquiryData }: ScheduleTourModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    tourDate: '',
    tourTime: '',
    tourGuide: '',
    notes: '',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/operator/inquiries/${inquiryId}/schedule-tour`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tourDate: `${formData.tourDate}T${formData.tourTime}:00.000Z`,
          tourGuide: formData.tourGuide,
          notes: formData.notes,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to schedule tour');
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
          <h2 className="text-xl font-semibold">Schedule Tour</h2>
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

          {/* Tour Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FiCalendar className="inline w-4 h-4 mr-1" />
              Tour Date *
            </label>
            <input
              type="date"
              required
              value={formData.tourDate}
              onChange={(e) => setFormData({ ...formData, tourDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>

          {/* Tour Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FiClock className="inline w-4 h-4 mr-1" />
              Tour Time *
            </label>
            <input
              type="time"
              required
              value={formData.tourTime}
              onChange={(e) => setFormData({ ...formData, tourTime: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Tour Guide */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FiUser className="inline w-4 h-4 mr-1" />
              Tour Guide
            </label>
            <input
              type="text"
              value={formData.tourGuide}
              onChange={(e) => setFormData({ ...formData, tourGuide: e.target.value })}
              placeholder="Staff member name"
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
              placeholder="Additional notes or instructions"
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
              {isLoading ? 'Scheduling...' : 'Schedule Tour'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
