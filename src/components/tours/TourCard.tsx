"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { format, parseISO } from "date-fns";
import {
  FiMapPin,
  FiCalendar,
  FiClock,
  FiUser,
  FiChevronRight,
} from "react-icons/fi";
import TourStatusBadge from "./TourStatusBadge";

type TourStatus =
  | "PENDING"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "RESCHEDULED"
  | "NO_SHOW";

interface TourCardProps {
  tour: {
    id: string;
    status: TourStatus;
    confirmedTime?: Date | string | null;
    requestedTimes: Date[] | string[];
    home: {
      id: string;
      name: string;
      address?: {
        street?: string;
        city?: string;
        state?: string;
      } | null;
    };
    family?: {
      user: {
        firstName: string;
        lastName: string;
      };
    };
    createdAt: Date | string;
  };
  viewAs: "family" | "operator";
  onAction?: (action: string, tourId: string) => void;
}

export default function TourCard({ tour, viewAs, onAction }: TourCardProps) {
  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "Not scheduled";
    try {
      const parsedDate = typeof date === "string" ? parseISO(date) : date;
      return format(parsedDate, "EEEE, MMMM d, yyyy 'at' h:mm a");
    } catch (error) {
      return "Invalid date";
    }
  };

  const getDisplayTime = () => {
    if (tour.confirmedTime) {
      return formatDate(tour.confirmedTime);
    }
    if (tour.requestedTimes && tour.requestedTimes.length > 0) {
      return `${tour.requestedTimes.length} time slot${tour.requestedTimes.length > 1 ? "s" : ""} requested`;
    }
    return "No time selected";
  };

  const address = tour.home.address
    ? `${tour.home.address.street || ""}, ${tour.home.address.city || ""}, ${tour.home.address.state || ""}`
    : "Address not available";

  const canCancel = ["PENDING", "CONFIRMED"].includes(tour.status);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Header */}
          <div className="mb-3 flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {tour.home.name}
              </h3>
              {viewAs === "operator" && tour.family && (
                <div className="mt-1 flex items-center text-sm text-gray-600">
                  <FiUser className="mr-1 h-4 w-4" />
                  {tour.family.user.firstName} {tour.family.user.lastName}
                </div>
              )}
            </div>
            <TourStatusBadge status={tour.status} />
          </div>

          {/* Details */}
          <div className="space-y-2">
            <div className="flex items-start text-sm text-gray-600">
              <FiMapPin className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{address}</span>
            </div>

            <div className="flex items-start text-sm text-gray-600">
              <FiCalendar className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{getDisplayTime()}</span>
            </div>

            <div className="flex items-start text-sm text-gray-500">
              <FiClock className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>Requested {formatDate(tour.createdAt)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 flex items-center space-x-3">
            <Link
              href={
                viewAs === "operator"
                  ? `/operator/tours/${tour.id}`
                  : `/dashboard/tours/${tour.id}`
              }
              className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              View Details
              <FiChevronRight className="ml-1 h-4 w-4" />
            </Link>

            {canCancel && onAction && (
              <button
                onClick={() => onAction("cancel", tour.id)}
                className="text-sm font-medium text-red-600 hover:text-red-700"
              >
                Cancel Tour
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
