"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  FiUser,
  FiPhone,
  FiHeart,
  FiActivity,
  FiFileText,
  FiSave,
  FiAlertCircle,
  FiCheckCircle,
  FiLoader,
  FiInfo
} from "react-icons/fi";

// Family profile validation schema
const familyProfileSchema = z.object({
  primaryContactName: z.string()
    .min(2, "Primary contact name must be at least 2 characters")
    .max(100, "Primary contact name must not exceed 100 characters")
    .optional()
    .nullable(),
  
  phone: z.string()
    .regex(/^[\d\s\-\+\(\)]+$/, "Phone number must contain only digits and standard formatting characters")
    .min(10, "Phone number must be at least 10 digits")
    .max(20, "Phone number must not exceed 20 characters")
    .optional()
    .nullable()
    .or(z.literal("")),
  
  relationshipToRecipient: z.string()
    .min(1, "Relationship is required when provided")
    .max(50, "Relationship must not exceed 50 characters")
    .optional()
    .nullable()
    .or(z.literal("")),
  
  recipientAge: z.number()
    .int("Age must be a whole number")
    .min(0, "Age must be 0 or greater")
    .max(150, "Age must be less than 150")
    .optional()
    .nullable(),
  
  primaryDiagnosis: z.string()
    .max(1000, "Primary diagnosis must not exceed 1000 characters")
    .optional()
    .nullable(),
  
  mobilityLevel: z.string()
    .min(1, "Mobility level is required when provided")
    .max(50, "Mobility level must not exceed 50 characters")
    .optional()
    .nullable()
    .or(z.literal("")),
  
  careNotes: z.string()
    .max(2000, "Care notes must not exceed 2000 characters")
    .optional()
    .nullable(),
});

// Predefined options for dropdowns
const RELATIONSHIP_OPTIONS = [
  { value: "Spouse", label: "Spouse" },
  { value: "Child", label: "Child" },
  { value: "Sibling", label: "Sibling" },
  { value: "Parent", label: "Parent" },
  { value: "Grandchild", label: "Grandchild" },
  { value: "Friend", label: "Friend" },
  { value: "Other", label: "Other" },
];

const MOBILITY_OPTIONS = [
  { value: "Independent", label: "Independent" },
  { value: "Needs Assistance", label: "Needs Assistance" },
  { value: "Wheelchair Bound", label: "Wheelchair Bound" },
  { value: "Bedridden", label: "Bedridden" },
];

export default function FamilySettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Form state
  const [formData, setFormData] = useState({
    primaryContactName: "",
    phone: "",
    relationshipToRecipient: "",
    recipientAge: null as number | null,
    primaryDiagnosis: "",
    mobilityLevel: "",
    careNotes: "",
  });

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [message, setMessage] = useState({ type: "", text: "" });
  const [needsSetup, setNeedsSetup] = useState(false);

  // Fetch Family profile data
  const fetchFamilyProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/family/profile", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Profile exists - populate form
        const profile = data.data;
        setFormData({
          primaryContactName: profile.primaryContactName || "",
          phone: profile.phone || "",
          relationshipToRecipient: profile.relationshipToRecipient || "",
          recipientAge: profile.recipientAge || null,
          primaryDiagnosis: profile.primaryDiagnosis || "",
          mobilityLevel: profile.mobilityLevel || "",
          careNotes: profile.careNotes || "",
        });
        setNeedsSetup(false);
      } else if (res.status === 404 && data.needsSetup) {
        // Profile doesn't exist yet - show empty form
        setNeedsSetup(true);
        setMessage({
          type: "info",
          text: "Welcome! Please complete your Family profile to get started.",
        });
      } else {
        throw new Error(data.message || "Failed to fetch profile");
      }
    } catch (error: any) {
      console.error("Error fetching Family profile:", error);
      setMessage({
        type: "error",
        text: error.message || "Failed to load profile data. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Check authentication and role
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/settings/family");
      return;
    }

    if (status === "authenticated") {
      const userRole = (session?.user as any)?.role?.toString().toUpperCase();
      
      // Enforce FAMILY role only
      if (userRole !== "FAMILY") {
        router.push("/settings");
        return;
      }

      fetchFamilyProfile();
    }
  }, [status, session, router, fetchFamilyProfile]);

  // Handle input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    
    // Handle age as a number
    if (name === "recipientAge") {
      const numValue = value === "" ? null : parseInt(value, 10);
      setFormData((prev) => ({ ...prev, [name]: numValue }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    // Clear error for this field
    setErrors((prev: any) => {
      const newErrors = { ...prev };
      delete newErrors[name];
      return newErrors;
    });
  };

  // Validate form
  const validateForm = () => {
    try {
      familyProfileSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: any = {};
        error.errors.forEach((err) => {
          if (err.path.length > 0) {
            fieldErrors[err.path[0]] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      setMessage({
        type: "error",
        text: "Please correct the errors in the form.",
      });
      return;
    }

    try {
      setSaving(true);
      setMessage({ type: "", text: "" });

      const res = await fetch("/api/family/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({
          type: "success",
          text: needsSetup 
            ? "Family profile created successfully!" 
            : "Family profile updated successfully!",
        });
        setNeedsSetup(false);
        
        // Scroll to top to show success message
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        throw new Error(data.message || "Failed to save profile");
      }
    } catch (error: any) {
      console.error("Error saving Family profile:", error);
      setMessage({
        type: "error",
        text: error.message || "Failed to save profile. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  // Loading state
  if (status === "loading" || loading) {
    return (
      <DashboardLayout title="Family Profile" showSearch={false}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <FiLoader className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-2" />
            <p className="text-neutral-600">Loading profile...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Family Profile" showSearch={false}>
      <div className="container mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900">Family Profile</h1>
          <p className="mt-1 text-neutral-600">
            Manage your family contact information and care recipient details.
          </p>
        </div>

        {/* Message Alert */}
        {message.text && (
          <div
            className={`mb-6 rounded-lg border p-4 flex items-start gap-3 ${
              message.type === "success"
                ? "bg-green-50 border-green-200 text-green-800"
                : message.type === "error"
                ? "bg-red-50 border-red-200 text-red-800"
                : "bg-blue-50 border-blue-200 text-blue-800"
            }`}
          >
            {message.type === "success" && <FiCheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />}
            {message.type === "error" && <FiAlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />}
            {message.type === "info" && <FiInfo className="h-5 w-5 flex-shrink-0 mt-0.5" />}
            <p className="flex-1">{message.text}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Primary Contact Information Section */}
          <div className="bg-white rounded-lg border border-neutral-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-lg bg-primary-100 p-2 text-primary-700">
                <FiUser className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">
                  Primary Contact Information
                </h2>
                <p className="text-sm text-neutral-500">
                  Your contact details for care coordination
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Primary Contact Name */}
              <div>
                <label htmlFor="primaryContactName" className="block text-sm font-medium text-neutral-700 mb-1">
                  Primary Contact Name
                </label>
                <input
                  type="text"
                  id="primaryContactName"
                  name="primaryContactName"
                  value={formData.primaryContactName}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    errors.primaryContactName ? "border-red-500" : "border-neutral-300"
                  }`}
                  placeholder="e.g., John Smith"
                />
                {errors.primaryContactName && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <FiAlertCircle className="h-4 w-4" />
                    {errors.primaryContactName}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-neutral-700 mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiPhone className="h-5 w-5 text-neutral-400" />
                  </div>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.phone ? "border-red-500" : "border-neutral-300"
                    }`}
                    placeholder="(555) 123-4567"
                  />
                </div>
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <FiAlertCircle className="h-4 w-4" />
                    {errors.phone}
                  </p>
                )}
              </div>

              {/* Relationship to Recipient */}
              <div>
                <label htmlFor="relationshipToRecipient" className="block text-sm font-medium text-neutral-700 mb-1">
                  Relationship to Care Recipient
                </label>
                <select
                  id="relationshipToRecipient"
                  name="relationshipToRecipient"
                  value={formData.relationshipToRecipient}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    errors.relationshipToRecipient ? "border-red-500" : "border-neutral-300"
                  }`}
                >
                  <option value="">Select relationship</option>
                  {RELATIONSHIP_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {errors.relationshipToRecipient && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <FiAlertCircle className="h-4 w-4" />
                    {errors.relationshipToRecipient}
                  </p>
                )}
                <p className="mt-1 text-sm text-neutral-500">
                  Your relationship to the person receiving care
                </p>
              </div>
            </div>
          </div>

          {/* Care Recipient Details Section */}
          <div className="bg-white rounded-lg border border-neutral-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-lg bg-primary-100 p-2 text-primary-700">
                <FiHeart className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">
                  Care Recipient Details
                </h2>
                <p className="text-sm text-neutral-500">
                  Information about the person receiving care
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Recipient Age */}
              <div>
                <label htmlFor="recipientAge" className="block text-sm font-medium text-neutral-700 mb-1">
                  Age
                </label>
                <input
                  type="number"
                  id="recipientAge"
                  name="recipientAge"
                  value={formData.recipientAge || ""}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    errors.recipientAge ? "border-red-500" : "border-neutral-300"
                  }`}
                  placeholder="e.g., 75"
                  min="0"
                  max="150"
                />
                {errors.recipientAge && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <FiAlertCircle className="h-4 w-4" />
                    {errors.recipientAge}
                  </p>
                )}
              </div>

              {/* Primary Diagnosis */}
              <div>
                <label htmlFor="primaryDiagnosis" className="block text-sm font-medium text-neutral-700 mb-1">
                  Primary Diagnosis
                </label>
                <textarea
                  id="primaryDiagnosis"
                  name="primaryDiagnosis"
                  value={formData.primaryDiagnosis}
                  onChange={handleChange}
                  rows={3}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    errors.primaryDiagnosis ? "border-red-500" : "border-neutral-300"
                  }`}
                  placeholder="e.g., Alzheimer's Disease, Diabetes, etc."
                />
                {errors.primaryDiagnosis && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <FiAlertCircle className="h-4 w-4" />
                    {errors.primaryDiagnosis}
                  </p>
                )}
                <p className="mt-1 text-sm text-neutral-500">
                  Primary medical condition or diagnosis
                </p>
              </div>

              {/* Mobility Level */}
              <div>
                <label htmlFor="mobilityLevel" className="block text-sm font-medium text-neutral-700 mb-1">
                  Mobility Level
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiActivity className="h-5 w-5 text-neutral-400" />
                  </div>
                  <select
                    id="mobilityLevel"
                    name="mobilityLevel"
                    value={formData.mobilityLevel}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.mobilityLevel ? "border-red-500" : "border-neutral-300"
                    }`}
                  >
                    <option value="">Select mobility level</option>
                    {MOBILITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.mobilityLevel && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <FiAlertCircle className="h-4 w-4" />
                    {errors.mobilityLevel}
                  </p>
                )}
                <p className="mt-1 text-sm text-neutral-500">
                  Current mobility and assistance needs
                </p>
              </div>

              {/* Care Notes */}
              <div>
                <label htmlFor="careNotes" className="block text-sm font-medium text-neutral-700 mb-1">
                  Additional Care Notes
                </label>
                <div className="relative">
                  <div className="absolute top-3 left-3 pointer-events-none">
                    <FiFileText className="h-5 w-5 text-neutral-400" />
                  </div>
                  <textarea
                    id="careNotes"
                    name="careNotes"
                    value={formData.careNotes}
                    onChange={handleChange}
                    rows={4}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.careNotes ? "border-red-500" : "border-neutral-300"
                    }`}
                    placeholder="Any special needs, preferences, or important information..."
                  />
                </div>
                {errors.careNotes && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <FiAlertCircle className="h-4 w-4" />
                    {errors.careNotes}
                  </p>
                )}
                <p className="mt-1 text-sm text-neutral-500">
                  Any other important information about care needs (max 2000 characters)
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => router.push("/settings")}
              className="px-6 py-2 border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-50 transition"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <FiLoader className="h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <FiSave className="h-5 w-5" />
                  Save Profile
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
