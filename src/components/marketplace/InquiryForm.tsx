"use client";

/**
 * InquiryForm Component
 * Modal form for submitting care inquiries from Families to Aides or Providers
 */

import { useState, FormEvent } from "react";
import { FiX, FiSend, FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import LeadConsentCheckbox, { emptyLeadConsent } from "@/components/consent/LeadConsentCheckbox";
import type { LeadConsentPayload } from "@/lib/consent/lead-consent-text";

type InquiryFormProps = {
  targetType: "AIDE" | "PROVIDER";
  targetId: string;
  targetName: string;
  serviceTypes?: string[];
  onSuccess?: (leadId: string) => void;
  onClose: () => void;
};

type FormData = {
  message: string;
  preferredStartDate: string;
  expectedHoursPerWeek: string;
  location: string;
  tripPurpose: string;
  mobilityNeeds: string;
  isRecurring: boolean;
  recurringDays: string[];
  pickupAddress: string;
  dropoffAddress: string;
};

type ValidationErrors = {
  message?: string;
  expectedHoursPerWeek?: string;
};

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const TRIP_PURPOSES = [
  { value: "medical_appointment", label: "Medical Appointment" },
  { value: "dialysis", label: "Dialysis" },
  { value: "therapy", label: "Therapy / Rehab" },
  { value: "grocery", label: "Grocery / Errands" },
  { value: "other", label: "Other" },
];

export default function InquiryForm({
  targetType,
  targetId,
  targetName,
  serviceTypes,
  onSuccess,
  onClose,
}: InquiryFormProps) {
  const isTransport = serviceTypes?.includes("transportation") ?? false;

  const [formData, setFormData] = useState<FormData>({
    message: "",
    preferredStartDate: "",
    expectedHoursPerWeek: "",
    location: "",
    tripPurpose: "",
    mobilityNeeds: "",
    isRecurring: false,
    recurringDays: [],
    pickupAddress: "",
    dropoffAddress: "",
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  // TCPA/marketing consent — UNCHECKED by default; declining never blocks submit.
  const [leadConsent, setLeadConsent] = useState<LeadConsentPayload>(emptyLeadConsent());
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
        consent: leadConsent,
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

      // Include transport details when booking a transportation provider
      if (isTransport) {
        const td: Record<string, any> = {};
        if (formData.tripPurpose) td.tripPurpose = formData.tripPurpose;
        if (formData.mobilityNeeds) td.mobilityNeeds = formData.mobilityNeeds;
        if (formData.pickupAddress) td.pickupAddress = formData.pickupAddress;
        if (formData.dropoffAddress) td.dropoffAddress = formData.dropoffAddress;
        td.isRecurring = formData.isRecurring;
        if (formData.isRecurring && formData.recurringDays.length > 0) {
          td.recurringDays = formData.recurringDays;
        }
        if (Object.keys(td).length > 0) payload.transportDetails = td;
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof ValidationErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const toggleRecurringDay = (day: string) => {
    setFormData((prev) => ({
      ...prev,
      recurringDays: prev.recurringDays.includes(day)
        ? prev.recurringDays.filter((d) => d !== day)
        : [...prev.recurringDays, day],
    }));
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
          <div className="flex items-center justify-between p-6 border-b border-neutral-200">
            <div>
              <h2 className="text-2xl font-bold text-neutral-900">
                Request Care Services
              </h2>
              <p className="text-sm text-neutral-600 mt-1">
                Submit an inquiry to {targetName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-600 transition-colors"
              aria-label="Close"
            >
              <FiX className="h-6 w-6" />
            </button>
          </div>

          {/* Success Message */}
          {submitSuccess && (
            <div className="m-6 p-4 bg-success-50 border border-success-200 rounded-md flex items-start">
              <FiCheckCircle className="h-5 w-5 text-success-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-success-800">
                  Inquiry Submitted Successfully!
                </h3>
                <p className="text-sm text-success-700 mt-1">
                  Your inquiry has been sent to {targetName}. You'll receive a
                  response soon.
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {submitError && (
            <div className="m-6 p-4 bg-error-50 border border-error-200 rounded-md flex items-start">
              <FiAlertCircle className="h-5 w-5 text-error-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-error-800">
                  Submission Failed
                </h3>
                <p className="text-sm text-error-700 mt-1">{submitError}</p>
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
                  className="block text-sm font-medium text-neutral-700 mb-2"
                >
                  Message <span className="text-error-500">*</span>
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
                      ? "border-error-300 focus:ring-error-500 focus:border-error-500"
                      : "border-neutral-300"
                  }`}
                  required
                />
                {errors.message && (
                  <p className="mt-1 text-sm text-error-600">{errors.message}</p>
                )}
                <p className="mt-1 text-xs text-neutral-500">
                  {formData.message.length}/1000 characters
                </p>
              </div>

              {/* Preferred Start Date */}
              <div>
                <label
                  htmlFor="preferredStartDate"
                  className="block text-sm font-medium text-neutral-700 mb-2"
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
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Expected Hours Per Week */}
              <div>
                <label
                  htmlFor="expectedHoursPerWeek"
                  className="block text-sm font-medium text-neutral-700 mb-2"
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
                      ? "border-error-300 focus:ring-error-500 focus:border-error-500"
                      : "border-neutral-300"
                  }`}
                />
                {errors.expectedHoursPerWeek && (
                  <p className="mt-1 text-sm text-error-600">
                    {errors.expectedHoursPerWeek}
                  </p>
                )}
              </div>

              {/* Location */}
              <div>
                <label
                  htmlFor="location"
                  className="block text-sm font-medium text-neutral-700 mb-2"
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
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Transport Details — only shown when booking a transportation provider */}
              {isTransport && (
                <div className="space-y-4 rounded-lg border border-primary-100 bg-primary-50 p-4">
                  <h3 className="text-sm font-semibold text-primary-800">Trip Details</h3>

                  {/* Trip Purpose */}
                  <div>
                    <label htmlFor="tripPurpose" className="block text-sm font-medium text-neutral-700 mb-1">
                      Trip Purpose (Optional)
                    </label>
                    <select
                      id="tripPurpose"
                      name="tripPurpose"
                      value={formData.tripPurpose}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Select a purpose...</option>
                      {TRIP_PURPOSES.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Pickup / Dropoff */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="pickupAddress" className="block text-sm font-medium text-neutral-700 mb-1">
                        Pickup Address (Optional)
                      </label>
                      <input
                        type="text"
                        id="pickupAddress"
                        name="pickupAddress"
                        value={formData.pickupAddress}
                        onChange={handleChange}
                        placeholder="123 Main St, Cleveland OH"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="dropoffAddress" className="block text-sm font-medium text-neutral-700 mb-1">
                        Dropoff Address (Optional)
                      </label>
                      <input
                        type="text"
                        id="dropoffAddress"
                        name="dropoffAddress"
                        value={formData.dropoffAddress}
                        onChange={handleChange}
                        placeholder="456 Clinic Ave, Cleveland OH"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>

                  {/* Mobility Needs */}
                  <div>
                    <label htmlFor="mobilityNeeds" className="block text-sm font-medium text-neutral-700 mb-1">
                      Mobility / Accessibility Needs (Optional)
                    </label>
                    <input
                      type="text"
                      id="mobilityNeeds"
                      name="mobilityNeeds"
                      value={formData.mobilityNeeds}
                      onChange={handleChange}
                      placeholder="e.g., wheelchair, walker, door-to-door assistance"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  {/* Recurring */}
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isRecurring}
                        onChange={(e) => setFormData((prev) => ({ ...prev, isRecurring: e.target.checked }))}
                        className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm font-medium text-neutral-700">This is a recurring trip</span>
                    </label>
                  </div>

                  {formData.isRecurring && (
                    <div>
                      <p className="text-sm font-medium text-neutral-700 mb-2">Which days? (Optional)</p>
                      <div className="flex flex-wrap gap-2">
                        {DAYS_OF_WEEK.map((day) => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleRecurringDay(day)}
                            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                              formData.recurringDays.includes(day)
                                ? "bg-primary-600 text-white border-primary-600"
                                : "bg-white text-neutral-700 border-neutral-300 hover:border-primary-400"
                            }`}
                          >
                            {day.slice(0, 3)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <LeadConsentCheckbox checked={leadConsent.given} onChange={setLeadConsent} idPrefix="marketplace-lead" />

              {/* Submit Button */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-neutral-300 rounded-md text-neutral-700 font-medium hover:bg-neutral-50 transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-neutral-300 disabled:cursor-not-allowed flex items-center transition-colors"
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
