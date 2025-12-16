"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FiCalendar,
  FiClock,
  FiMapPin,
  FiAlertCircle,
  FiLoader,
  FiPlus,
} from "react-icons/fi";
import TourCard from "@/components/tours/TourCard";
import TourStatusBadge from "@/components/tours/TourStatusBadge";

type TourStatus =
  | "PENDING"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "RESCHEDULED"
  | "NO_SHOW";

interface Tour {
  id: string;
  status: TourStatus;
  confirmedTime?: string | null;
  requestedTimes: string[];
  home: {
    id: string;
    name: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
    } | null;
  };
  createdAt: string;
  familyNotes?: string;
}

export default function FamilyToursPage() {
  const router = useRouter();
  const [tours, setTours] = useState<Tour[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("all");

  // Fetch tours
  const fetchTours = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/family/tours");

      if (!response.ok) {
        throw new Error("Failed to fetch tours");
      }

      const data = await response.json();

      if (data.success) {
        setTours(data.tours);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tours");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTours();
  }, []);

  // Handle cancel tour
  const handleCancelTour = async (tourId: string) => {
    if (!confirm("Are you sure you want to cancel this tour?")) {
      return;
    }

    try {
      const response = await fetch(`/api/operator/tours/${tourId}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cancellationReason: "Cancelled by family",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to cancel tour");
      }

      // Refresh tours list
      fetchTours();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to cancel tour");
    }
  };

  // Filter tours
  const upcomingStatuses: TourStatus[] = ["PENDING", "CONFIRMED"];
  const pastStatuses: TourStatus[] = ["COMPLETED", "CANCELLED", "NO_SHOW"];

  const filteredTours = tours.filter((tour) => {
    if (filter === "upcoming") {
      return upcomingStatuses.includes(tour.status);
    } else if (filter === "past") {
      return pastStatuses.includes(tour.status);
    }
    return true;
  });

  const upcomingCount = tours.filter((t) =>
    upcomingStatuses.includes(t.status)
  ).length;
  const pastCount = tours.filter((t) => pastStatuses.includes(t.status)).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Tours</h1>
        <p className="mt-2 text-sm text-gray-600">
          View and manage your scheduled tours
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6">
        <nav className="flex space-x-4" aria-label="Tabs">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              filter === "all"
                ? "bg-primary-100 text-primary-700"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            All Tours
            <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs">
              {tours.length}
            </span>
          </button>
          <button
            onClick={() => setFilter("upcoming")}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              filter === "upcoming"
                ? "bg-primary-100 text-primary-700"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Upcoming
            <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs">
              {upcomingCount}
            </span>
          </button>
          <button
            onClick={() => setFilter("past")}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              filter === "past"
                ? "bg-primary-100 text-primary-700"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Past
            <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs">
              {pastCount}
            </span>
          </button>
        </nav>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <FiLoader className="h-8 w-8 animate-spin text-primary-600" />
          <span className="ml-3 text-gray-600">Loading tours...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <FiAlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <button
                onClick={fetchTours}
                className="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tours List */}
      {!isLoading && !error && (
        <>
          {filteredTours.length > 0 ? (
            <div className="space-y-4">
              {filteredTours.map((tour) => (
                <TourCard
                  key={tour.id}
                  tour={tour}
                  viewAs="family"
                  onAction={(action, tourId) => {
                    if (action === "cancel") {
                      handleCancelTour(tourId);
                    }
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white p-12 text-center">
              <FiCalendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                {filter === "upcoming"
                  ? "No upcoming tours"
                  : filter === "past"
                  ? "No past tours"
                  : "No tours yet"}
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                {filter === "upcoming"
                  ? "You don't have any upcoming tours scheduled."
                  : filter === "past"
                  ? "You haven't completed any tours yet."
                  : "Start by searching for homes and scheduling tours."}
              </p>
              <div className="mt-6">
                <button
                  onClick={() => router.push("/dashboard/find-care")}
                  className="inline-flex items-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  <FiPlus className="mr-2 h-4 w-4" />
                  Find Care Homes
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Help Section */}
      {!isLoading && tours.length > 0 && (
        <div className="mt-8 rounded-lg bg-blue-50 p-6">
          <h3 className="text-sm font-medium text-blue-900">
            Tour Tips
          </h3>
          <ul className="mt-2 space-y-1 text-sm text-blue-700">
            <li>• Arrive 10-15 minutes early to your scheduled tour</li>
            <li>• Prepare a list of questions about care services and amenities</li>
            <li>• You can reschedule or cancel tours up to 24 hours before</li>
            <li>• Contact the facility directly if you need to make changes</li>
          </ul>
        </div>
      )}
    </div>
  );
}
