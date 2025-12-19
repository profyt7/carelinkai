'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { createInquiry } from '@/hooks/useInquiries';
import {
  CreateInquiryInput,
  InquiryUrgency,
  InquirySource,
  ContactMethod,
} from '@/types/inquiry';
import { toast } from 'react-hot-toast';

interface NewInquiryModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function NewInquiryModal({ onClose, onSuccess }: NewInquiryModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [homes, setHomes] = useState<Array<{ id: string; name: string }>>([]);
  const [families, setFamilies] = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);
  const [formData, setFormData] = useState<CreateInquiryInput>({
    familyId: '',
    homeId: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    careRecipientName: '',
    careRecipientAge: undefined,
    careNeeds: [],
    additionalInfo: '',
    urgency: InquiryUrgency.MEDIUM,
    source: InquirySource.WEBSITE,
    preferredContactMethod: ContactMethod.EMAIL,
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch homes and families on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch homes
        const homesRes = await fetch('/api/homes');
        if (homesRes.ok) {
          const homesData = await homesRes.json();
          setHomes(homesData);
        }

        // Fetch families
        const familiesRes = await fetch('/api/families');
        if (familiesRes.ok) {
          const familiesData = await familiesRes.json();
          setFamilies(familiesData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  const handleChange = (field: keyof CreateInquiryInput, value: any) => {
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

    if (!formData.familyId) newErrors.familyId = 'Family is required';
    if (!formData.homeId) newErrors.homeId = 'Home is required';
    if (!formData.contactName) newErrors.contactName = 'Contact name is required';
    if (!formData.contactEmail) newErrors.contactEmail = 'Contact email is required';
    if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      newErrors.contactEmail = 'Invalid email format';
    }
    if (!formData.careRecipientName) {
      newErrors.careRecipientName = 'Care recipient name is required';
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
      await createInquiry(formData);
      toast.success('Inquiry created successfully');
      onSuccess();
    } catch (error: any) {
      console.error('Error creating inquiry:', error);
      toast.error(error.message || 'Failed to create inquiry');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">New Inquiry</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Family and Home Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Family <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.familyId}
                onChange={(e) => handleChange('familyId', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.familyId ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select family</option>
                {families.map((family) => (
                  <option key={family.id} value={family.id}>
                    {family.firstName} {family.lastName}
                  </option>
                ))}
              </select>
              {errors.familyId && (
                <p className="text-red-500 text-sm mt-1">{errors.familyId}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Home <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.homeId}
                onChange={(e) => handleChange('homeId', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.homeId ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select home</option>
                {homes.map((home) => (
                  <option key={home.id} value={home.id}>
                    {home.name}
                  </option>
                ))}
              </select>
              {errors.homeId && (
                <p className="text-red-500 text-sm mt-1">{errors.homeId}</p>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.contactName}
                  onChange={(e) => handleChange('contactName', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.contactName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="John Doe"
                />
                {errors.contactName && (
                  <p className="text-red-500 text-sm mt-1">{errors.contactName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => handleChange('contactEmail', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.contactEmail ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="john@example.com"
                />
                {errors.contactEmail && (
                  <p className="text-red-500 text-sm mt-1">{errors.contactEmail}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.contactPhone || ''}
                  onChange={(e) => handleChange('contactPhone', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Contact Method
                </label>
                <select
                  value={formData.preferredContactMethod}
                  onChange={(e) => handleChange('preferredContactMethod', e.target.value as ContactMethod)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.values(ContactMethod).map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Care Recipient Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Care Recipient Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.careRecipientName}
                  onChange={(e) => handleChange('careRecipientName', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.careRecipientName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Jane Smith"
                />
                {errors.careRecipientName && (
                  <p className="text-red-500 text-sm mt-1">{errors.careRecipientName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Age
                </label>
                <input
                  type="number"
                  value={formData.careRecipientAge || ''}
                  onChange={(e) => handleChange('careRecipientAge', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="75"
                  min="0"
                  max="120"
                />
              </div>
            </div>
          </div>

          {/* Inquiry Details */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Inquiry Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Urgency
                </label>
                <select
                  value={formData.urgency}
                  onChange={(e) => handleChange('urgency', e.target.value as InquiryUrgency)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.values(InquiryUrgency).map((urgency) => (
                    <option key={urgency} value={urgency}>
                      {urgency}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Source
                </label>
                <select
                  value={formData.source}
                  onChange={(e) => handleChange('source', e.target.value as InquirySource)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.values(InquirySource).map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message / Notes
              </label>
              <textarea
                value={formData.message || ''}
                onChange={(e) => handleChange('message', e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Any additional information..."
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Info
              </label>
              <textarea
                value={formData.additionalInfo || ''}
                onChange={(e) => handleChange('additionalInfo', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Care needs, special requirements, etc."
              />
            </div>
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
              {isSubmitting ? 'Creating...' : 'Create Inquiry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
