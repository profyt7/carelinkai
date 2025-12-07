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
    NEW: "bg-blue-100 text-blue-800 border-blue-200",
    IN_REVIEW: "bg-yellow-100 text-yellow-800 border-yellow-200",
    CONTACTED: "bg-green-100 text-green-800 border-green-200",
    CLOSED: "bg-gray-100 text-gray-800 border-gray-200",
    CANCELLED: "bg-red-100 text-red-800 border-red-200"
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
