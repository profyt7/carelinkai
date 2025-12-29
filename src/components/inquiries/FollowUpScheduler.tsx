'use client';

import { useState } from 'react';
import { X, Calendar } from 'lucide-react';
import { scheduleFollowUp } from '@/hooks/useInquiries';
import { FollowUpType, ScheduleFollowUpInput } from '@/types/inquiry';
import { toast } from 'react-hot-toast';

interface FollowUpSchedulerProps {
  inquiryId: string;
  onClose: () => void;
}

export function FollowUpScheduler({ inquiryId, onClose }: FollowUpSchedulerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ScheduleFollowUpInput>({
    type: FollowUpType.EMAIL,
    scheduledFor: '',
    subject: '',
    content: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: keyof ScheduleFollowUpInput, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.scheduledFor) {
      newErrors.scheduledFor = 'Schedule date and time is required';
    } else {
      const scheduledDate = new Date(formData.scheduledFor);
      if (scheduledDate < new Date()) {
        newErrors.scheduledFor = 'Schedule date must be in the future';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setIsSubmitting(true);

    try {
      await scheduleFollowUp(inquiryId, formData);
      toast.success('Follow-up scheduled successfully');
      onClose();
    } catch (error: any) {
      console.error('Error scheduling follow-up:', error);
      toast.error(error.message || 'Failed to schedule follow-up');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get current datetime in format required for datetime-local input
  const now = new Date();
  const minDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Schedule Follow-up</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Follow-up Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.type}
              onChange={(e) => handleChange('type', e.target.value as FollowUpType)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.values(FollowUpType).map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Scheduled Date/Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Schedule For <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={formData.scheduledFor || ""}
              onChange={(e) => handleChange('scheduledFor', e.target.value)}
              min={minDateTime}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.scheduledFor ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.scheduledFor && (
              <p className="text-red-500 text-sm mt-1">{errors.scheduledFor}</p>
            )}
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject
            </label>
            <input
              type="text"
              value={formData.subject || ''}
              onChange={(e) => handleChange('subject', e.target.value)}
              placeholder="Follow-up regarding..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Content/Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content / Notes
            </label>
            <textarea
              value={formData.content || ''}
              onChange={(e) => handleChange('content', e.target.value)}
              rows={4}
              placeholder="Add any notes or content for this follow-up..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Scheduling...' : 'Schedule Follow-up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
