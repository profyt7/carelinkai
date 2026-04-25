/**
 * LeadStatusBadge Component
 * 
 * Displays lead status with appropriate color coding and styling.
 * 
 * Status Colors:
 * - NEW: Blue (primary)
 * - IN_REVIEW: Yellow (warning)
 * - CONTACTED: Green (success)
 * - CLOSED: Gray (neutral)
 * - CANCELLED: Red (danger)
 */

import React from "react";
import { LeadStatus } from "@prisma/client";

interface LeadStatusBadgeProps {
  status: LeadStatus;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function LeadStatusBadge({ 
  status, 
  size = "md",
  className = "" 
}: LeadStatusBadgeProps) {
  // Define color schemes for each status
  const colorMap: Record<LeadStatus, string> = {
    NEW: "bg-primary-100 text-primary-800 border-primary-200",
    IN_REVIEW: "bg-warning-100 text-warning-800 border-warning-200",
    CONTACTED: "bg-success-100 text-success-800 border-success-200",
    CLOSED: "bg-neutral-100 text-neutral-800 border-neutral-200",
    CANCELLED: "bg-error-100 text-error-800 border-error-200"
  };

  // Define size classes
  const sizeMap = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
    lg: "px-3 py-1.5 text-base"
  };

  // Format status text (replace underscores with spaces)
  const statusText = status.replace(/_/g, " ");

  return (
    <span
      className={`
        inline-flex items-center justify-center
        rounded-md border font-medium
        ${colorMap[status]}
        ${sizeMap[size]}
        ${className}
      `}
    >
      {statusText}
    </span>
  );
}
