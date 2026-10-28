"use client";

import { FiShield, FiClock, FiAlertCircle, FiCheck } from "react-icons/fi";

type Status = "NOT_STARTED" | "PENDING" | "CLEAR" | "CONSIDER" | "FAILED" | "EXPIRED";

interface BackgroundCheckBadgeProps {
  status: Status;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export default function BackgroundCheckBadge({
  status,
  size = "md",
  showLabel = true,
}: BackgroundCheckBadgeProps) {
  const config = {
    CLEAR: {
      icon: <FiCheck />,
      label: "Background Checked",
      bg: "bg-success-100",
      text: "text-success-700",
      border: "border-success-300",
      iconColor: "text-success-600",
    },
    PENDING: {
      icon: <FiClock />,
      label: "Check In Progress",
      bg: "bg-warning-50",
      text: "text-warning-700",
      border: "border-warning-300",
      iconColor: "text-warning-500",
    },
    CONSIDER: {
      icon: <FiAlertCircle />,
      label: "Under Review",
      bg: "bg-warning-50",
      text: "text-warning-700",
      border: "border-warning-300",
      iconColor: "text-warning-500",
    },
    FAILED: {
      icon: <FiAlertCircle />,
      label: "Check Failed",
      bg: "bg-error-50",
      text: "text-error-700",
      border: "border-error-300",
      iconColor: "text-error-500",
    },
    EXPIRED: {
      icon: <FiShield />,
      label: "Check Expired",
      bg: "bg-neutral-100",
      text: "text-neutral-600",
      border: "border-neutral-300",
      iconColor: "text-neutral-400",
    },
    NOT_STARTED: null,
  };

  if (status === "NOT_STARTED") return null;

  const c = config[status];

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5 gap-1",
    md: "text-sm px-3 py-1 gap-1.5",
    lg: "text-base px-4 py-1.5 gap-2",
  };

  const iconSize = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${c.bg} ${c.text} ${c.border} ${sizeClasses[size]}`}
      title={status === "CLEAR" ? "Background check passed through Checkr" : undefined}
    >
      <span className={`flex-shrink-0 ${iconSize[size]} ${c.iconColor}`}>{c.icon}</span>
      {showLabel && <span>{c.label}</span>}
    </span>
  );
}
