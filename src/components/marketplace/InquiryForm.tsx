"use client";

/**
 * InquiryForm Component
 * Modal form for submitting care inquiries from Families to Aides or Providers
 */

import { useState, FormEvent } from "react";
import { FiX, FiSend, FiCheckCircle, FiAlertCircle } from "react-icons/fi";

type InquiryFormProps = {
  targetType: "AIDE" | "PROVIDER";
  targetId: string;
  targetName: string;
  onSuccess?: (leadId: string) => void;
  onClose: () => void;
};

type FormData = {
  message: string;
  preferredStartDate: string;
  expectedHoursPerWeek: string;
  location: string;
};

type ValidationErrors = {
  message?: string;
  expectedHoursPerWeek?: string;
};

export default function InquiryForm({
  targetType,
  targetId,
  targetName,
  onSuccess,
  onClose,
}: InquiryFormProps) {
  const [formData, setFormData] = useState<FormData>({
    message: "",
    preferredStartDate: "",
    expectedHoursPerWeek: "",
    location: "",
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Client-side validation
  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!formData.message || formData.message.length < 10) {
      newErrors.message = "Message must be at least 10 characters";
    }
    if (formData.message && formData.message.length > 1000) {
      newErrors.message = "Message must be at most 1000 characters";
    }

    if (
      formData.expectedHoursPerWeek &&
      (parseInt(formData.expectedHoursPerWeek) < 1 ||
        parseInt(formData.expectedHoursPerWeek) > 168)
    ) {
      newErrors.expectedHoursPerWeek = "Hours must be between 1 and 168";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const payload: any = {
        targetType,
        targetId,
        message: formData.message,
      };

      // Add optional fields if provided
      if (formData.preferredStartDate) {
        payload.preferredStartDate = new Date(
          formData.preferredStartDate
        ).toISOString();
      }
      if (formData.expectedHoursPerWeek) {
        payload.expectedHoursPerWeek = parseInt(formData.expectedHoursPerWeek);
      }
      if (formData.location) {
        payload.location = formData.location;
      }

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit inquiry");
      }

      // Success
      setSubmitSuccess(true);
      if (onSuccess) {
        onSuccess(data.data.leadId);
      }

      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error: any) {
      console.error("Error submitting inquiry:", error);
      setSubmitError(
        error.message || "Failed to submit inquiry. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Handle input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name as keyof ValidationErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Request Care Services
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Submit an inquiry to {targetName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <FiX className="h-6 w-6" />
            </button>
          </div>

          {/* Success Message */}
          {submitSuccess && (
            <div className="m-6 p-4 bg-green-50 border border-green-200 rounded-md flex items-start">
              <FiCheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-green-800">
                  Inquiry Submitted Successfully!
                </h3>
                <p className="text-sm text-green-700 mt-1">
                  Your inquiry has been sent to {targetName}. You'll receive a
                  response soon.
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {submitError && (
            <div className="m-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-start">
              <FiAlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-red-800">
                  Submission Failed
                </h3>
                <p className="text-sm text-red-700 mt-1">{submitError}</p>
              </div>
            </div>
          )}

          {/* Form */}
          {!submitSuccess && (
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Message */}
              <div>
                <label
                  htmlFor="message"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Tell us about your care needs, expectations, and any specific requirements..."
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                    errors.message
                      ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                      : "border-gray-300"
                  }`}
                  required
                />
                {errors.message && (
                  <p className="mt-1 text-sm text-red-600">{errors.message}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  {formData.message.length}/1000 characters
                </p>
              </div>

              {/* Preferred Start Date */}
              <div>
                <label
                  htmlFor="preferredStartDate"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Preferred Start Date (Optional)
                </label>
                <input
                  type="date"
                  id="preferredStartDate"
                  name="preferredStartDate"
                  value={formData.preferredStartDate}
                  onChange={handleChange}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Expected Hours Per Week */}
              <div>
                <label
                  htmlFor="expectedHoursPerWeek"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Expected Hours Per Week (Optional)
                </label>
                <input
                  type="number"
                  id="expectedHoursPerWeek"
                  name="expectedHoursPerWeek"
                  value={formData.expectedHoursPerWeek}
                  onChange={handleChange}
                  min="1"
                  max="168"
                  placeholder="e.g., 20"
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                    errors.expectedHoursPerWeek
                      ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                      : "border-gray-300"
                  }`}
                />
                {errors.expectedHoursPerWeek && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.expectedHoursPerWeek}
                  </p>
                )}
              </div>

              {/* Location */}
              <div>
                <label
                  htmlFor="location"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Location (Optional)
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="City, State or ZIP code"
                  maxLength={255}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center transition-colors"
                >
                  {submitting ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <FiSend className="mr-2 h-4 w-4" />
                      Submit Inquiry
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
