'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiX } from 'react-icons/fi';

interface AssignCaregiverModalProps {
  isOpen: boolean;
  onClose: () => void;
  residentId: string;
  residentName: string;
}

export function AssignCaregiverModal({ isOpen, onClose, residentId, residentName }: AssignCaregiverModalProps) {
  const [caregivers, setCaregivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    caregiverId: '',
    assignmentType: 'PRIMARY',
    startDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchCaregivers();
    }
  }, [isOpen]);

  const fetchCaregivers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/operator/caregivers?limit=100&employmentStatus=ACTIVE');
      if (!res.ok) throw new Error('Failed to fetch caregivers');
      const data = await res.json();
      setCaregivers(data.items || data || []);
    } catch (error) {
      console.error('Error fetching caregivers:', error);
      toast.error('Failed to load caregivers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.caregiverId) {
      toast.error('Please select a caregiver');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/residents/${residentId}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to assign caregiver');
      }

      toast.success('Caregiver assigned successfully');
      onClose();
    } catch (error: any) {
      console.error('Error assigning caregiver:', error);
      toast.error(error.message || 'Failed to assign caregiver');
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
            <h2 className="text-xl font-semibold">Assign Caregiver</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <FiX className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600">Assigning to: <strong>{residentName}</strong></p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Caregiver *
              </label>
              <select
                value={formData.caregiverId}
                onChange={(e) => setFormData({ ...formData, caregiverId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={loading}
              >
                <option value="">Select a caregiver...</option>
                {caregivers.map((caregiver) => (
                  <option key={caregiver.id} value={caregiver.id}>
                    {caregiver.user?.firstName} {caregiver.user?.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assignment Type *
              </label>
              <select
                value={formData.assignmentType}
                onChange={(e) => setFormData({ ...formData, assignmentType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="PRIMARY">Primary</option>
                <option value="SECONDARY">Secondary</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Additional notes..."
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
                disabled={submitting || loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Assigning...' : 'Assign Caregiver'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
