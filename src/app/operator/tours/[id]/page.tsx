"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import {
  FiArrowLeft,
  FiCalendar,
  FiClock,
  FiMapPin,
  FiUser,
  FiMail,
  FiPhone,
  FiMessageSquare,
  FiCheckCircle,
  FiXCircle,
  FiEdit,
  FiAlertCircle,
  FiLoader,
  FiHome,
} from "react-icons/fi";
import TourStatusBadge from "@/components/tours/TourStatusBadge";
import TimeSlotSelector from "@/components/tours/TimeSlotSelector";

type TourStatus =
  | "PENDING"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "RESCHEDULED"
  | "NO_SHOW";

interface TourDetail {
  id: string;
  status: TourStatus;
  outcome?: string | null;
  requestedTimes: string[];
  aiSuggestedTimes?: Array<{ time: string; reason: string }>;
  confirmedTime?: string | null;
  familyNotes?: string;
  operatorNotes?: string;
  createdAt: string;
  updatedAt: string;
  home: {
    id: string;
    name: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
    };
  };
  family: {
    name: string;
    email: string;
    phone?: string;
  };
}

export default function OperatorTourDetailPage() {
  const router = useRouter();
  const params = useParams();
  const tourId = params?.id as string;

  const [tour, setTour] = useState<TourDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [operatorNotes, setOperatorNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch tour details
  const fetchTourDetails = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tours/${tourId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch tour details");
      }

      const data = await response.json();

      if (data.success) {
        setTour(data.tour);
        setOperatorNotes(data.tour.operatorNotes || "");
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tour");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (tourId) {
      fetchTourDetails();
    }
  }, [tourId]);

  // Confirm tour
  const handleConfirmTour = async () => {
    if (!selectedTime) {
      alert("Please select a time slot");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/operator/tours/${tourId}/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          confirmedTime: selectedTime,
          operatorNotes: operatorNotes || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to confirm tour");
      }

      // Refresh tour details
      await fetchTourDetails();
      setShowConfirmModal(false);
      alert("Tour confirmed successfully!");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to confirm tour");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reschedule tour
  const handleRescheduleTour = async () => {
    if (!selectedTime) {
      alert("Please select a new time slot");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/operator/tours/${tourId}/reschedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          newTime: selectedTime,
          operatorNotes: operatorNotes || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to reschedule tour");
      }

      // Refresh tour details
      await fetchTourDetails();
      setShowRescheduleModal(false);
      alert("Tour rescheduled successfully!");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reschedule tour");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel tour
  const handleCancelTour = async () => {
    const reason = prompt("Please provide a reason for cancellation:");
    if (!reason) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/operator/tours/${tourId}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cancellationReason: reason,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to cancel tour");
      }

      // Refresh tour details
      await fetchTourDetails();
      alert("Tour cancelled successfully!");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to cancel tour");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "EEEE, MMMM d, yyyy 'at' h:mm a");
    } catch (error) {
      return "Invalid date";
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <FiLoader className="h-8 w-8 animate-spin text-primary-600" />
        <span className="ml-3 text-gray-600">Loading tour details...</span>
      </div>
    );
  }

  if (error || !tour) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <FiAlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="mt-1 text-sm text-red-700">
                {error || "Tour not found"}
              </p>
              <button
                onClick={() => router.back()}
                className="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
              >
                Go back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="mb-4 inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <FiArrowLeft className="mr-2 h-4 w-4" />
          Back to Tours
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tour Request</h1>
            <p className="mt-1 text-sm text-gray-600">ID: {tour.id}</p>
          </div>
          <TourStatusBadge status={tour.status} />
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Family Information */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            <FiUser className="mr-2 inline h-5 w-5" />
            Family Information
          </h2>
          <dl className="space-y-3">
            <div className="flex items-center">
              <dt className="w-32 text-sm font-medium text-gray-600">Name:</dt>
              <dd className="text-sm text-gray-900">{tour.family.name}</dd>
            </div>
            <div className="flex items-center">
              <dt className="w-32 text-sm font-medium text-gray-600">Email:</dt>
              <dd className="text-sm text-gray-900">
                <a
                  href={`mailto:${tour.family.email}`}
                  className="text-primary-600 hover:text-primary-700"
                >
                  <FiMail className="mr-1 inline h-4 w-4" />
                  {tour.family.email}
                </a>
              </dd>
            </div>
            {tour.family.phone && (
              <div className="flex items-center">
                <dt className="w-32 text-sm font-medium text-gray-600">
                  Phone:
                </dt>
                <dd className="text-sm text-gray-900">
                  <a
                    href={`tel:${tour.family.phone}`}
                    className="text-primary-600 hover:text-primary-700"
                  >
                    <FiPhone className="mr-1 inline h-4 w-4" />
                    {tour.family.phone}
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Home Information */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            <FiHome className="mr-2 inline h-5 w-5" />
            Home Information
          </h2>
          <dl className="space-y-3">
            <div className="flex items-center">
              <dt className="w-32 text-sm font-medium text-gray-600">Name:</dt>
              <dd className="text-sm text-gray-900">{tour.home.name}</dd>
            </div>
            {tour.home.address && (
              <div className="flex items-start">
                <dt className="w-32 text-sm font-medium text-gray-600">
                  Address:
                </dt>
                <dd className="text-sm text-gray-900">
                  <FiMapPin className="mr-1 inline h-4 w-4" />
                  {tour.home.address.street}
                  <br />
                  {tour.home.address.city}, {tour.home.address.state}{" "}
                  {tour.home.address.zipCode}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Tour Details */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            <FiCalendar className="mr-2 inline h-5 w-5" />
            Tour Details
          </h2>

          {/* Requested Times */}
          <div className="mb-4">
            <h3 className="mb-2 text-sm font-medium text-gray-700">
              Requested Times:
            </h3>
            <ul className="space-y-2">
              {tour.requestedTimes.map((time, index) => (
                <li
                  key={index}
                  className="flex items-center text-sm text-gray-600"
                >
                  <FiClock className="mr-2 h-4 w-4" />
                  {formatDate(time)}
                </li>
              ))}
            </ul>
          </div>

          {/* AI Suggested Times */}
          {tour.aiSuggestedTimes && tour.aiSuggestedTimes.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 text-sm font-medium text-gray-700">
                AI Suggested Times:
              </h3>
              <ul className="space-y-2">
                {tour.aiSuggestedTimes.map((suggestion, index) => (
                  <li key={index} className="rounded-md bg-blue-50 p-3">
                    <div className="flex items-start">
                      <FiClock className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">
                          {formatDate(suggestion.time)}
                        </p>
                        <p className="mt-1 text-xs text-blue-700">
                          {suggestion.reason}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Confirmed Time */}
          {tour.confirmedTime && (
            <div className="mb-4">
              <h3 className="mb-2 text-sm font-medium text-gray-700">
                Confirmed Time:
              </h3>
              <div className="flex items-center rounded-md bg-green-50 p-3 text-sm text-green-900">
                <FiCheckCircle className="mr-2 h-4 w-4 text-green-600" />
                {formatDate(tour.confirmedTime)}
              </div>
            </div>
          )}

          {/* Family Notes */}
          {tour.familyNotes && (
            <div className="mb-4">
              <h3 className="mb-2 text-sm font-medium text-gray-700">
                <FiMessageSquare className="mr-1 inline h-4 w-4" />
                Family Notes:
              </h3>
              <div className="rounded-md bg-gray-50 p-3">
                <p className="text-sm text-gray-700">{tour.familyNotes}</p>
              </div>
            </div>
          )}

          {/* Operator Notes */}
          <div>
            <h3 className="mb-2 text-sm font-medium text-gray-700">
              <FiEdit className="mr-1 inline h-4 w-4" />
              Operator Notes:
            </h3>
            <textarea
              value={operatorNotes}
              onChange={(e) => setOperatorNotes(e.target.value)}
              rows={3}
              placeholder="Add internal notes about this tour..."
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Action Buttons */}
        {tour.status === "PENDING" && (
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                setSelectedTime(tour.requestedTimes[0] || "");
                setShowConfirmModal(true);
              }}
              disabled={isSubmitting}
              className="inline-flex items-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
            >
              <FiCheckCircle className="mr-2 h-4 w-4" />
              Confirm Tour
            </button>

            <button
              onClick={handleCancelTour}
              disabled={isSubmitting}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
            >
              <FiXCircle className="mr-2 h-4 w-4" />
              Decline Tour
            </button>
          </div>
        )}

        {tour.status === "CONFIRMED" && (
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                setSelectedTime(tour.confirmedTime || "");
                setShowRescheduleModal(true);
              }}
              disabled={isSubmitting}
              className="inline-flex items-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
            >
              <FiEdit className="mr-2 h-4 w-4" />
              Reschedule Tour
            </button>

            <button
              onClick={handleCancelTour}
              disabled={isSubmitting}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
            >
              <FiXCircle className="mr-2 h-4 w-4" />
              Cancel Tour
            </button>
          </div>
        )}
      </div>

      {/* Confirm Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Confirm Tour
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Select Time Slot:
              </label>
              <TimeSlotSelector
                slots={tour.requestedTimes.map((time) => ({
                  time,
                  available: true,
                }))}
                selectedSlot={selectedTime}
                onSelect={setSelectedTime}
                className="mt-2"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmTour}
                disabled={isSubmitting || !selectedTime}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {isSubmitting ? "Confirming..." : "Confirm Tour"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Reschedule Tour
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Select New Time:
              </label>
              <input
                type="datetime-local"
                value={selectedTime ? selectedTime.slice(0, 16) : ""}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowRescheduleModal(false)}
                disabled={isSubmitting}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRescheduleTour}
                disabled={isSubmitting || !selectedTime}
                className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {isSubmitting ? "Rescheduling..." : "Reschedule Tour"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
