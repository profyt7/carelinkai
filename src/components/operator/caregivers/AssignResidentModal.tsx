"use client";

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiX, FiUser, FiCalendar, FiFileText } from 'react-icons/fi';

interface AssignResidentModalProps {
  caregiverId: string;
  onClose: () => void;
  onSuccess: () => void;
}

type Resident = {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
};

export function AssignResidentModal({
  caregiverId,
  onClose,
  onSuccess,
}: AssignResidentModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingResidents, setLoadingResidents] = useState(true);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [formData, setFormData] = useState({
    residentId: '',
    isPrimary: false,
    startDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    fetchResidents();
  }, []);

  const fetchResidents = async () => {
    try {
      setLoadingResidents(true);
      const res = await fetch('/api/residents?status=ACTIVE&limit=100');
      if (!res.ok) throw new Error('Failed to fetch residents');
      const data = await res.json();
      setResidents(data.residents || []);
    } catch (error) {
      console.error('Error fetching residents:', error);
      toast.error('Failed to load residents');
    } finally {
      setLoadingResidents(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        residentId: formData.residentId,
        isPrimary: formData.isPrimary,
        startDate: formData.startDate || null,
        notes: formData.notes || null,
      };

      const res = await fetch(`/api/operator/caregivers/${caregiverId}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to assign resident');
      }

      toast.success('Resident assigned successfully');
      onSuccess();
    } catch (error: any) {
      console.error('Error assigning resident:', error);
      toast.error(error.message || 'Failed to assign resident');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900">Assign Resident</h2>
            <p className="text-sm text-neutral-600 mt-1">
              Assign a resident to this caregiver
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Resident *
            </label>
            {loadingResidents ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
              </div>
            ) : (
              <select
                required
                value={formData.residentId}
                onChange={(e) => setFormData({ ...formData, residentId: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select a resident</option>
                {residents.map((resident) => (
                  <option key={resident.id} value={resident.id}>
                    {resident.firstName} {resident.lastName} ({resident.status})
                  </option>
                ))}
              </select>
            )}
            {residents.length === 0 && !loadingResidents && (
              <p className="text-sm text-neutral-500 mt-1">No active residents available</p>
            )}
          </div>

          <div>
            <label className="flex items-center gap-2 p-3 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50">
              <input
                type="checkbox"
                checked={formData.isPrimary}
                onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
                className="rounded text-primary-600 focus:ring-primary-500"
              />
              <div>
                <span className="text-sm font-medium text-neutral-700">Primary Caregiver</span>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Mark this caregiver as the primary caregiver for this resident
                </p>
              </div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Assignment notes..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || loadingResidents}
            >
              {loading ? 'Assigning...' : 'Assign Resident'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
