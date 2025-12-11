'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiX } from 'react-icons/fi';

interface UpdateCareLevelModalProps {
  isOpen: boolean;
  onClose: () => void;
  residentId: string;
}

export function UpdateCareLevelModal({ isOpen, onClose, residentId }: UpdateCareLevelModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    careLevel: '',
    reason: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.careLevel) {
      toast.error('Please select a care level');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/residents/${residentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          careLevel: formData.careLevel,
          // Could also add a note about the care level change
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to update care level');
      }

      toast.success('Care level updated successfully');
      onClose();
    } catch (error: any) {
      console.error('Error updating care level:', error);
      toast.error(error.message || 'Failed to update care level');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Update Care Level</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <FiX className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Care Level *
              </label>
              <select
                value={formData.careLevel}
                onChange={(e) => setFormData({ ...formData, careLevel: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select care level...</option>
                <option value="INDEPENDENT">Independent</option>
                <option value="ASSISTED_LIVING">Assisted Living</option>
                <option value="MEMORY_CARE">Memory Care</option>
                <option value="SKILLED_NURSING">Skilled Nursing</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for Change
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Why is the care level being changed?"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Updating...' : 'Update Care Level'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
