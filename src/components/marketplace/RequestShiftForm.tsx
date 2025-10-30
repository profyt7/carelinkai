"use client";

import React, { useState } from 'react';
import Link from 'next/link';

interface RequestShiftFormProps {
  caregiverUserId: string;
  caregiverId: string;
}

export default function RequestShiftForm({ caregiverUserId, caregiverId }: RequestShiftFormProps) {
  // Form state
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [createdListingId, setCreatedListingId] = useState('');

  // Form validation
  const isFormValid = date && startTime && endTime;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid) {
      setError('Please fill all required fields');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // 1. Build ISO strings for start and end times
      const startDateTime = new Date(`${date}T${startTime}`);
      const endDateTime = new Date(`${date}T${endTime}`);
      
      if (endDateTime <= startDateTime) {
        throw new Error('End time must be after start time');
      }
      
      const startTimeISO = startDateTime.toISOString();
      const endTimeISO = endDateTime.toISOString();
      
      // 2. Check availability
      const availabilityUrl = `/api/calendar/availability?userId=${encodeURIComponent(caregiverUserId)}&startTime=${encodeURIComponent(startTimeISO)}&endTime=${encodeURIComponent(endTimeISO)}&appointmentType=CAREGIVER_SHIFT`;
      
      const availabilityResponse = await fetch(availabilityUrl);
      const availabilityData = await availabilityResponse.json();
      
      if (!availabilityResponse.ok) {
        throw new Error(availabilityData.error || 'Failed to check availability');
      }
      
      if (!availabilityData.data.isAvailable) {
        throw new Error('Caregiver is not available during this time');
      }
      
      // 3. Create listing
      const formattedDate = new Date(date).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      
      const formattedStartTime = new Date(`${date}T${startTime}`).toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit'
      });
      
      const formattedEndTime = new Date(`${date}T${endTime}`).toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit'
      });
      
      const listingResponse = await fetch('/api/marketplace/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `Per-diem shift on ${formattedDate}`,
          description: `Shift from ${formattedStartTime} to ${formattedEndTime}. Please apply if you're available.`,
          startTime: startTimeISO,
          endTime: endTimeISO,
          hourlyRateMin: hourlyRate ? parseFloat(hourlyRate) : undefined,
          hourlyRateMax: hourlyRate ? parseFloat(hourlyRate) : undefined,
        }),
      });
      
      const listingData = await listingResponse.json();
      
      if (!listingResponse.ok) {
        throw new Error(listingData.error || 'Failed to create listing');
      }
      
      const listingId = listingData.data.id;
      
      // 4. Invite caregiver
      const inviteResponse = await fetch('/api/marketplace/applications/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listingId,
          caregiverId,
          message: `You've been invited to a shift on ${formattedDate} from ${formattedStartTime} to ${formattedEndTime}.`,
        }),
      });
      
      const inviteData = await inviteResponse.json();
      
      if (!inviteResponse.ok) {
        throw new Error(inviteData.error || 'Failed to invite caregiver');
      }
      
      // Success
      setCreatedListingId(listingId);
      setSuccess(true);
      
      // Reset form
      setDate('');
      setStartTime('');
      setEndTime('');
      setHourlyRate('');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Request Shift</h3>
      
      {success ? (
        <div className="rounded-md bg-green-50 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                Shift request created successfully!
              </p>
              <div className="mt-2">
                <Link 
                  href={`/marketplace/listings/${createdListingId}`}
                  className="text-sm font-medium text-green-600 hover:text-green-500"
                >
                  View listing details →
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          <div>
            <label htmlFor="shift-date" className="block text-sm font-medium text-gray-700">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="shift-date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              required
              min={new Date().toISOString().split('T')[0]} // Today or later
            />
          </div>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="start-time" className="block text-sm font-medium text-gray-700">
                Start Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                id="start-time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                required
              />
            </div>
            
            <div>
              <label htmlFor="end-time" className="block text-sm font-medium text-gray-700">
                End Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                id="end-time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                required
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="hourly-rate" className="block text-sm font-medium text-gray-700">
              Hourly Rate ($)
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                id="hourly-rate"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                className="pl-7 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
          </div>
          
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || !isFormValid}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                ${isLoading || !isFormValid 
                  ? 'bg-primary-300 cursor-not-allowed' 
                  : 'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
                }`}
            >
              {isLoading ? 'Processing...' : 'Request Shift'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
