"use client";

import React from "react";
import {
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiCalendar,
  FiSlash,
} from "react-icons/fi";

type TourStatus =
  | "PENDING"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "RESCHEDULED"
  | "NO_SHOW";

interface TourStatusBadgeProps {
  status: TourStatus;
  className?: string;
}

const statusConfig = {
  PENDING: {
    label: "Pending",
    icon: FiClock,
    bgColor: "bg-yellow-100",
    textColor: "text-yellow-800",
    iconColor: "text-yellow-600",
  },
  CONFIRMED: {
    label: "Confirmed",
    icon: FiCheckCircle,
    bgColor: "bg-green-100",
    textColor: "text-green-800",
    iconColor: "text-green-600",
  },
  COMPLETED: {
    label: "Completed",
    icon: FiCheckCircle,
    bgColor: "bg-blue-100",
    textColor: "text-blue-800",
    iconColor: "text-blue-600",
  },
  CANCELLED: {
    label: "Cancelled",
    icon: FiXCircle,
    bgColor: "bg-red-100",
    textColor: "text-red-800",
    iconColor: "text-red-600",
  },
  RESCHEDULED: {
    label: "Rescheduled",
    icon: FiCalendar,
    bgColor: "bg-purple-100",
    textColor: "text-purple-800",
    iconColor: "text-purple-600",
  },
  NO_SHOW: {
    label: "No Show",
    icon: FiSlash,
    bgColor: "bg-gray-100",
    textColor: "text-gray-800",
    iconColor: "text-gray-600",
  },
};

export default function TourStatusBadge({
  status,
  className = "",
}: TourStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        config.bgColor
      } ${config.textColor} ${className}`}
    >
      <Icon className={`mr-1 h-3 w-3 ${config.iconColor}`} />
      {config.label}
    </span>
  );
}
