"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FiCalendar,
  FiClock,
  FiMapPin,
  FiAlertCircle,
  FiLoader,
  FiSearch,
  FiFilter,
  FiUser,
  FiCheckCircle,
  FiXCircle,
  FiEdit,
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
  family: {
    user: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
    };
  };
  createdAt: string;
  familyNotes?: string;
}

export default function OperatorToursPage() {
  const router = useRouter();
  const [tours, setTours] = useState<Tour[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | TourStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch tours
  const fetchTours = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      if (filter !== "all") {
        queryParams.append("status", filter);
      }

      const response = await fetch(
        `/api/operator/tours${queryParams.toString() ? `?${queryParams}` : ""}`
      );

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
  }, [filter]);

  // Quick actions
  const handleQuickAction = async (
    action: "confirm" | "decline" | "view",
    tourId: string
  ) => {
    if (action === "view") {
      router.push(`/operator/tours/${tourId}`);
      return;
    }

    if (action === "decline") {
      if (!confirm("Are you sure you want to decline this tour request?")) {
        return;
      }

      try {
        const response = await fetch(`/api/operator/tours/${tourId}/cancel`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cancellationReason: "Declined by operator",
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to decline tour");
        }

        // Refresh tours list
        fetchTours();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to decline tour");
      }
    }
  };

  // Search and filter
  const filteredAndSearchedTours = tours.filter((tour) => {
    const matchesSearch =
      searchQuery === "" ||
      tour.home.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${tour.family.user.firstName} ${tour.family.user.lastName}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  // Count tours by status
  const pendingCount = tours.filter((t) => t.status === "PENDING").length;
  const confirmedCount = tours.filter((t) => t.status === "CONFIRMED").length;
  const completedCount = tours.filter((t) => t.status === "COMPLETED").length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Tour Management</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage tour requests and schedules
        </p>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Requests</p>
              <p className="mt-1 text-2xl font-semibold text-yellow-600">
                {pendingCount}
              </p>
            </div>
            <div className="rounded-full bg-yellow-100 p-3">
              <FiClock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Confirmed Tours</p>
              <p className="mt-1 text-2xl font-semibold text-green-600">
                {confirmedCount}
              </p>
            </div>
            <div className="rounded-full bg-green-100 p-3">
              <FiCheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="mt-1 text-2xl font-semibold text-blue-600">
                {completedCount}
              </p>
            </div>
            <div className="rounded-full bg-blue-100 p-3">
              <FiCalendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <FiSearch className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by family name or home..."
            className="block w-full rounded-md border-gray-300 pl-10 focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          />
        </div>

        <div className="flex items-center space-x-2">
          <FiFilter className="h-5 w-5 text-gray-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="block rounded-md border-gray-300 py-2 pl-3 pr-10 text-sm focus:border-primary-500 focus:ring-primary-500"
          >
            <option value="all">All Statuses ({tours.length})</option>
            <option value="PENDING">Pending ({pendingCount})</option>
            <option value="CONFIRMED">Confirmed ({confirmedCount})</option>
            <option value="COMPLETED">Completed ({completedCount})</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
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
          {filteredAndSearchedTours.length > 0 ? (
            <div className="space-y-4">
              {filteredAndSearchedTours.map((tour) => (
                <div
                  key={tour.id}
                  className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Header */}
                      <div className="mb-3 flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {tour.home.name}
                          </h3>
                          <div className="mt-1 flex items-center text-sm text-gray-600">
                            <FiUser className="mr-1 h-4 w-4" />
                            {tour.family.user.firstName}{" "}
                            {tour.family.user.lastName}
                            <span className="mx-2">•</span>
                            <a
                              href={`mailto:${tour.family.user.email}`}
                              className="text-primary-600 hover:text-primary-700"
                            >
                              {tour.family.user.email}
                            </a>
                          </div>
                        </div>
                        <TourStatusBadge status={tour.status} />
                      </div>

                      {/* Details */}
                      <div className="space-y-2">
                        {tour.home.address && (
                          <div className="flex items-start text-sm text-gray-600">
                            <FiMapPin className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0" />
                            <span>
                              {tour.home.address.street},{" "}
                              {tour.home.address.city}, {tour.home.address.state}
                            </span>
                          </div>
                        )}

                        <div className="flex items-start text-sm text-gray-600">
                          <FiCalendar className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0" />
                          <span>
                            {tour.requestedTimes.length} time slot
                            {tour.requestedTimes.length > 1 ? "s" : ""} requested
                          </span>
                        </div>

                        {tour.familyNotes && (
                          <div className="mt-2 rounded-md bg-gray-50 p-3">
                            <p className="text-sm text-gray-700">
                              <span className="font-medium">Note:</span>{" "}
                              {tour.familyNotes}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Quick Actions */}
                      <div className="mt-4 flex items-center space-x-3">
                        <button
                          onClick={() => handleQuickAction("view", tour.id)}
                          className="inline-flex items-center rounded-md border border-transparent bg-primary-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                        >
                          <FiEdit className="mr-1.5 h-4 w-4" />
                          View & Respond
                        </button>

                        {tour.status === "PENDING" && (
                          <button
                            onClick={() => handleQuickAction("decline", tour.id)}
                            className="inline-flex items-center text-sm font-medium text-red-600 hover:text-red-700"
                          >
                            <FiXCircle className="mr-1.5 h-4 w-4" />
                            Decline
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white p-12 text-center">
              <FiCalendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                No tours found
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                {searchQuery
                  ? "No tours match your search criteria."
                  : filter !== "all"
                  ? `No tours with status "${filter}".`
                  : "You don't have any tour requests yet."}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
