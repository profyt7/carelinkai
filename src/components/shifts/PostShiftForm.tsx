"use client";

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import type { FormEvent } from 'react';

interface Home {
  id: string;
  name: string;
}

interface PostShiftFormProps {
  homes: Home[];
}

export default function PostShiftForm({ homes }: PostShiftFormProps) {
  // Form state
  const [formData, setFormData] = useState({
    homeId: '',
    startTime: '',
    endTime: '',
    hourlyRate: '',
    notes: ''
  });
  
  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.homeId) {
      toast.error('Please select a home');
      return;
    }
    
    if (!formData.startTime) {
      toast.error('Please select a start time');
      return;
    }
    
    if (!formData.endTime) {
      toast.error('Please select an end time');
      return;
    }
    
    const startTime = new Date(formData.startTime);
    const endTime = new Date(formData.endTime);
    
    if (endTime <= startTime) {
      toast.error('End time must be after start time');
      return;
    }
    
    const hourlyRate = parseFloat(formData.hourlyRate);
    if (isNaN(hourlyRate) || hourlyRate <= 0) {
      toast.error('Please enter a valid hourly rate');
      return;
    }
    
    // Prepare submission data
    const submissionData = {
      homeId: formData.homeId,
      startTime: formData.startTime,
      endTime: formData.endTime,
      hourlyRate: hourlyRate,
      notes: formData.notes
    };
    
    try {
      setIsSubmitting(true);
      
      const response = await fetch('/api/shifts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submissionData)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create shift');
      }
      
      // Success
      toast.success('Shift posted successfully!');
      
      // Reset form
      setFormData({
        homeId: '',
        startTime: '',
        endTime: '',
        hourlyRate: '',
        notes: ''
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to post shift');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Post New Caregiver Shift</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Home Selection */}
        <div>
          <label htmlFor="homeId" className="block text-sm font-medium text-neutral-700 mb-1">
            Home
          </label>
          <select
            id="homeId"
            name="homeId"
            value={formData.homeId}
            onChange={handleChange}
            className="form-select w-full rounded-md border-neutral-300 focus:border-primary-500 focus:ring-primary-500"
            required
          >
            <option value="">Select a home</option>
            {homes.map(home => (
              <option key={home.id} value={home.id}>
                {home.name}
              </option>
            ))}
          </select>
        </div>
        
        {/* Start Time */}
        <div>
          <label htmlFor="startTime" className="block text-sm font-medium text-neutral-700 mb-1">
            Start Time
          </label>
          <input
            type="datetime-local"
            id="startTime"
            name="startTime"
            value={formData.startTime}
            onChange={handleChange}
            className="form-input w-full rounded-md border-neutral-300 focus:border-primary-500 focus:ring-primary-500"
            required
          />
        </div>
        
        {/* End Time */}
        <div>
          <label htmlFor="endTime" className="block text-sm font-medium text-neutral-700 mb-1">
            End Time
          </label>
          <input
            type="datetime-local"
            id="endTime"
            name="endTime"
            value={formData.endTime}
            onChange={handleChange}
            className="form-input w-full rounded-md border-neutral-300 focus:border-primary-500 focus:ring-primary-500"
            required
          />
        </div>
        
        {/* Hourly Rate */}
        <div>
          <label htmlFor="hourlyRate" className="block text-sm font-medium text-neutral-700 mb-1">
            Hourly Rate ($)
          </label>
          <input
            type="number"
            id="hourlyRate"
            name="hourlyRate"
            value={formData.hourlyRate}
            onChange={handleChange}
            min="0.01"
            step="0.01"
            className="form-input w-full rounded-md border-neutral-300 focus:border-primary-500 focus:ring-primary-500"
            required
          />
        </div>
        
        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-neutral-700 mb-1">
            Notes (Optional)
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            className="form-textarea w-full rounded-md border-neutral-300 focus:border-primary-500 focus:ring-primary-500"
          />
        </div>
        
        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
              isSubmitting ? 'opacity-75 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? 'Posting...' : 'Post Shift'}
          </button>
        </div>
      </form>
    </div>
  );
}
