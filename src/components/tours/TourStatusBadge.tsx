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
    bgColor: "bg-warning-100",
    textColor: "text-warning-800",
    iconColor: "text-warning-600",
  },
  CONFIRMED: {
    label: "Confirmed",
    icon: FiCheckCircle,
    bgColor: "bg-success-100",
    textColor: "text-success-800",
    iconColor: "text-success-600",
  },
  COMPLETED: {
    label: "Completed",
    icon: FiCheckCircle,
    bgColor: "bg-primary-100",
    textColor: "text-primary-800",
    iconColor: "text-primary-600",
  },
  CANCELLED: {
    label: "Cancelled",
    icon: FiXCircle,
    bgColor: "bg-error-100",
    textColor: "text-error-800",
    iconColor: "text-error-600",
  },
  RESCHEDULED: {
    label: "Rescheduled",
    icon: FiCalendar,
    bgColor: "bg-secondary-100",
    textColor: "text-secondary-800",
    iconColor: "text-secondary-600",
  },
  NO_SHOW: {
    label: "No Show",
    icon: FiSlash,
    bgColor: "bg-neutral-100",
    textColor: "text-neutral-800",
    iconColor: "text-neutral-600",
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
