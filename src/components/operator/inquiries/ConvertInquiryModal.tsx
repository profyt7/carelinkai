'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiX, FiUser, FiHome, FiCalendar, FiAlertCircle } from 'react-icons/fi';

interface ConvertInquiryModalProps {
  inquiry: {
    id: string;
    family: {
      user: {
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
      };
    };
    home: {
      name: string;
      address?: {
        street: string;
        city: string;
        state: string;
      };
    };
    message?: string;
  };
  onClose: () => void;
  onSuccess?: (residentId: string) => void;
}

export default function ConvertInquiryModal({
  inquiry,
  onClose,
  onSuccess,
}: ConvertInquiryModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  const [formData, setFormData] = useState({
    firstName: inquiry.family.user.firstName || '',
    lastName: inquiry.family.user.lastName || '',
    dateOfBirth: '',
    gender: 'PREFER_NOT_TO_SAY' as 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY',
    moveInDate: '',
    careNeeds: {},
    medicalConditions: '',
    medications: '',
    allergies: '',
    dietaryRestrictions: '',
    notes: inquiry.message || '',
    conversionNotes: '',
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setValidationErrors({});

    try {
      const response = await fetch(`/api/operator/inquiries/${inquiry.id}/convert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.validationErrors) {
          setValidationErrors(data.validationErrors);
        }
        throw new Error(data.error || 'Failed to convert inquiry');
      }

      // Success!
      if (onSuccess) {
        onSuccess(data.residentId);
      }

      // Redirect to new resident page
      router.push(`/operator/residents/${data.residentId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Convert Inquiry to Resident</h2>
            <p className="text-sm text-gray-600 mt-1">
              Create a new resident profile from this inquiry
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <FiAlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-red-800">Conversion Failed</h4>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Inquiry Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-3">Inquiry Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <FiUser className="w-4 h-4 text-blue-600 mt-0.5" />
                <div>
                  <span className="font-medium">Family Contact:</span>
                  <p className="text-gray-700">
                    {inquiry.family.user.firstName} {inquiry.family.user.lastName}
                  </p>
                  <p className="text-gray-600">{inquiry.family.user.email}</p>
                  {inquiry.family.user.phone && (
                    <p className="text-gray-600">{inquiry.family.user.phone}</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <FiHome className="w-4 h-4 text-blue-600 mt-0.5" />
                <div>
                  <span className="font-medium">Home:</span>
                  <p className="text-gray-700">{inquiry.home.name}</p>
                  {inquiry.home.address && (
                    <p className="text-gray-600">
                      {inquiry.home.address.street}, {inquiry.home.address.city},{' '}
                      {inquiry.home.address.state}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Resident Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Resident Information</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.firstName ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {validationErrors.firstName && (
                  <p className="text-xs text-red-600 mt-1">{validationErrors.firstName[0]}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.lastName ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {validationErrors.lastName && (
                  <p className="text-xs text-red-600 mt-1">{validationErrors.lastName[0]}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  required
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.dateOfBirth ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {validationErrors.dateOfBirth && (
                  <p className="text-xs text-red-600 mt-1">{validationErrors.dateOfBirth[0]}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender *
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                  <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expected Move-In Date
              </label>
              <input
                type="date"
                name="moveInDate"
                value={formData.moveInDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Medical Conditions
              </label>
              <textarea
                name="medicalConditions"
                value={formData.medicalConditions}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="List any known medical conditions..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Medications
              </label>
              <textarea
                name="medications"
                value={formData.medications}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="List current medications..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Allergies
              </label>
              <input
                type="text"
                name="allergies"
                value={formData.allergies}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Food, medication, or environmental allergies..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dietary Restrictions
              </label>
              <input
                type="text"
                name="dietaryRestrictions"
                value={formData.dietaryRestrictions}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Special diet requirements..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Any additional information about the resident..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Conversion Notes (Internal)
              </label>
              <textarea
                name="conversionNotes"
                value={formData.conversionNotes}
                onChange={handleInputChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Internal notes about this conversion..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Converting...
                </>
              ) : (
                <>
                  <FiUser className="w-4 h-4" />
                  Convert to Resident
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
