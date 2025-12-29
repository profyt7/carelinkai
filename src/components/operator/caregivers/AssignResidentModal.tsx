"use client";

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiX, FiUserPlus, FiSearch } from 'react-icons/fi';

interface AssignResidentModalProps {
  caregiverId: string;
  caregiverName?: string;
  onClose: () => void;
  onSuccess: () => void;
}

type Resident = {
  id: string;
  user: {
    firstName: string;
    lastName: string;
  };
  roomNumber?: string | null;
};

export function AssignResidentModal({ 
  caregiverId, 
  caregiverName, 
  onClose,
  onSuccess 
}: AssignResidentModalProps) {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [selectedResidentId, setSelectedResidentId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchResidents();
  }, []);

  const fetchResidents = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/residents?status=ACTIVE&limit=100');
      if (!res.ok) throw new Error('Failed to fetch residents');
      
      const data = await res.json();
      setResidents(data.residents || []);
    } catch (error) {
      console.error('Error fetching residents:', error);
      toast.error('Failed to load residents');
    } finally {
      setLoading(false);
    }
  };

  const filteredResidents = residents.filter((resident) => {
    const fullName = `${resident.user.firstName} ${resident.user.lastName}`.toLowerCase();
    const room = (resident.roomNumber || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    
    return fullName.includes(query) || room.includes(query);
  });

  const handleSubmit = async () => {
    if (!selectedResidentId) {
      toast.error('Please select a resident');
      return;
    }

    if (!startDate) {
      toast.error('Please select a start date');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/operator/caregivers/${caregiverId}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          residentId: selectedResidentId,
          isPrimary,
          startDate: new Date(startDate).toISOString(),
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to create assignment');
      }

      toast.success('Assignment created successfully');
      onSuccess();
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create assignment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <FiUserPlus className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900">Assign to Resident</h2>
              <p className="text-sm text-neutral-600">Caregiver: {caregiverName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <FiX className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Search Residents */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Select Resident <span className="text-red-500">*</span>
            </label>
            <div className="relative mb-3">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or room number..."
                className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              </div>
            ) : filteredResidents.length === 0 ? (
              <div className="text-center py-8 text-neutral-500">
                {searchQuery ? 'No residents match your search' : 'No active residents found'}
              </div>
            ) : (
              <div className="border border-neutral-200 rounded-lg max-h-60 overflow-y-auto">
                {filteredResidents.map((resident) => (
                  <label
                    key={resident.id}
                    className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-neutral-50 transition-colors ${
                      selectedResidentId === resident.id ? 'bg-primary-50' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="resident"
                      value={resident.id}
                      checked={selectedResidentId === resident.id}
                      onChange={(e) => setSelectedResidentId(e.target.value)}
                      className="w-4 h-4 text-primary-600"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-neutral-900">
                        {resident.user.firstName} {resident.user.lastName}
                      </p>
                      {resident.roomNumber && (
                        <p className="text-sm text-neutral-600">
                          Room: {resident.roomNumber}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Primary Assignment */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPrimary"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded"
            />
            <label htmlFor="isPrimary" className="text-sm font-medium text-neutral-700">
              Set as primary caregiver
            </label>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Start Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this assignment..."
              rows={3}
              className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-neutral-200">
          <button
            onClick={onClose}
            className="btn btn-secondary"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedResidentId || !startDate || submitting}
            className="btn btn-primary"
          >
            {submitting ? 'Creating Assignment...' : 'Create Assignment'}
          </button>
        </div>
      </div>
    </div>
  );
}
