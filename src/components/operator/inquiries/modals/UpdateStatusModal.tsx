'use client';

import { useState } from 'react';
import { FiX } from 'react-icons/fi';
import { InquiryStatus } from '@prisma/client';

interface UpdateStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  inquiryId: string;
  currentStatus?: string;
}

const STATUS_OPTIONS = [
  { value: 'NEW', label: 'New', description: 'Initial inquiry received' },
  { value: 'CONTACTED', label: 'Contacted', description: 'First contact made' },
  { value: 'TOUR_SCHEDULED', label: 'Tour Scheduled', description: 'Tour has been scheduled' },
  { value: 'TOUR_COMPLETED', label: 'Tour Completed', description: 'Tour has been completed' },
  { value: 'QUALIFIED', label: 'Qualified', description: 'Lead is qualified' },
  { value: 'CONVERTING', label: 'Converting', description: 'In conversion process' },
  { value: 'PLACEMENT_OFFERED', label: 'Placement Offered', description: 'Placement has been offered' },
  { value: 'PLACEMENT_ACCEPTED', label: 'Placement Accepted', description: 'Placement accepted by family' },
  { value: 'CLOSED_LOST', label: 'Closed Lost', description: 'Inquiry did not convert' },
];

export function UpdateStatusModal({ isOpen, onClose, inquiryId, currentStatus }: UpdateStatusModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    status: currentStatus || 'NEW',
    reason: '',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/operator/inquiries/${inquiryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: formData.status,
          internalNotes: formData.reason ? `Status changed: ${formData.reason}` : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update status');
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
          <h2 className="text-xl font-semibold">Update Status</h2>
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

          {/* Status Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Status *
            </label>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {STATUS_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                    formData.status === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-blue-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="status"
                    value={option.value}
                    checked={formData.status === option.value}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-sm text-gray-600">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason / Notes
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Why is the status being changed?"
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
              {isLoading ? 'Updating...' : 'Update Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
