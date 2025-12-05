"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { FiCalendar, FiClock, FiPlus, FiTrash2, FiEdit, FiSave, FiX } from 'react-icons/fi';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { format, addDays, startOfWeek, endOfWeek, isSameDay, parseISO } from 'date-fns';

interface AvailabilitySlot {
  id: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  availableFor: string[];
}

export default function AvailabilityPage() {
  const { data: session, status } = useSession();
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<AvailabilitySlot | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 })); // Monday

  // Form state
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '17:00',
    recurrence: 'none',
    recurrenceEnd: '',
  });

  const fetchAvailability = useCallback(async () => {
    try {
      setIsLoading(true);
      const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
      const response = await fetch(
        `/api/caregiver/availability?startDate=${currentWeekStart.toISOString()}&endDate=${weekEnd.toISOString()}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch availability');
      }
      
      const result = await response.json();
      setSlots(result.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [currentWeekStart]);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role === 'CAREGIVER') {
      fetchAvailability();
    }
  }, [status, session, currentWeekStart, fetchAvailability]);

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.date}T${formData.endTime}`);
      
      const requestBody: any = {
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        isAvailable: true,
        availableFor: [],
        recurrence: formData.recurrence,
      };
      
      if (formData.recurrence !== 'none' && formData.recurrenceEnd) {
        requestBody.recurrenceEnd = new Date(formData.recurrenceEnd).toISOString();
      }
      
      const response = await fetch('/api/caregiver/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add availability');
      }
      
      const result = await response.json();
      setSuccessMessage(result.message || 'Availability added successfully');
      setShowAddModal(false);
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        startTime: '09:00',
        endTime: '17:00',
        recurrence: 'none',
        recurrenceEnd: '',
      });
      fetchAvailability();
      
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm('Are you sure you want to delete this availability slot?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/caregiver/availability?id=${slotId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete availability');
      }
      
      setSuccessMessage('Availability deleted successfully');
      fetchAvailability();
      
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleToggleAvailability = async (slot: AvailabilitySlot) => {
    try {
      const response = await fetch('/api/caregiver/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: slot.id,
          isAvailable: !slot.isAvailable,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update availability');
      }
      
      setSuccessMessage('Availability updated successfully');
      fetchAvailability();
      
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeekStart(prev => addDays(prev, direction === 'next' ? 7 : -7));
  };

  const getWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(currentWeekStart, i));
    }
    return days;
  };

  const getSlotsForDay = (date: Date) => {
    return slots.filter(slot => {
      const slotDate = parseISO(slot.startTime);
      return isSameDay(slotDate, date);
    });
  };

  if (status === 'loading' || isLoading) {
    return (
      <DashboardLayout title="Settings • Availability">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading availability...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (session?.user?.role !== 'CAREGIVER') {
    return (
      <DashboardLayout title="Settings • Availability">
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">This page is only accessible to caregivers.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const weekDays = getWeekDays();

  return (
    <DashboardLayout title="Settings • Availability">
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Manage Availability</h1>
          <p className="text-gray-600">Set your working hours and availability for potential employers</p>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">{successMessage}</p>
          </div>
        )}
        
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Add Availability Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            <FiPlus />
            Add Availability
          </button>
        </div>

        {/* Week Navigation */}
        <div className="mb-6 flex items-center justify-between bg-white rounded-lg shadow p-4">
          <button
            onClick={() => navigateWeek('prev')}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            ← Previous Week
          </button>
          <h2 className="text-lg font-semibold">
            {format(weekDays[0] ?? new Date(), 'MMM d')} - {format(weekDays[6] ?? new Date(), 'MMM d, yyyy')}
          </h2>
          <button
            onClick={() => navigateWeek('next')}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            Next Week →
          </button>
        </div>

        {/* Calendar View */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-7 divide-x divide-gray-200">
            {weekDays.map((day, index) => {
              const daySlots = getSlotsForDay(day);
              const isToday = isSameDay(day, new Date());
              
              return (
                <div
                  key={index}
                  className={`min-h-[200px] p-3 ${isToday ? 'bg-blue-50' : ''}`}
                >
                  <div className="font-medium text-sm mb-2">
                    <div className={`${isToday ? 'text-primary-600' : 'text-gray-700'}`}>
                      {format(day, 'EEE')}
                    </div>
                    <div className={`text-lg ${isToday ? 'text-primary-600 font-bold' : 'text-gray-900'}`}>
                      {format(day, 'd')}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {daySlots.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No availability</p>
                    ) : (
                      daySlots.map((slot) => (
                        <div
                          key={slot.id}
                          className={`text-xs p-2 rounded ${
                            slot.isAvailable
                              ? 'bg-green-100 border border-green-300'
                              : 'bg-gray-100 border border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">
                              {format(parseISO(slot.startTime), 'HH:mm')} - {format(parseISO(slot.endTime), 'HH:mm')}
                            </span>
                            <button
                              onClick={() => handleDeleteSlot(slot.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <FiTrash2 size={12} />
                            </button>
                          </div>
                          <button
                            onClick={() => handleToggleAvailability(slot)}
                            className="text-xs underline"
                          >
                            {slot.isAvailable ? 'Mark unavailable' : 'Mark available'}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Add Availability Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Add Availability</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX size={20} />
                </button>
              </div>
              
              <form onSubmit={handleAddSlot} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recurrence
                  </label>
                  <select
                    value={formData.recurrence}
                    onChange={(e) => setFormData({ ...formData, recurrence: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="none">None (single day)</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
                
                {formData.recurrence !== 'none' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Recurrence End Date
                    </label>
                    <input
                      type="date"
                      value={formData.recurrenceEnd}
                      onChange={(e) => setFormData({ ...formData, recurrenceEnd: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      min={formData.date}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Leave blank to set for 90 days from start date
                    </p>
                  </div>
                )}
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md"
                  >
                    Add Availability
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
