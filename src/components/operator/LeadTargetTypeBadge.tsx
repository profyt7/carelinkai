/**
 * LeadTargetTypeBadge Component
 * 
 * Displays lead target type (AIDE or PROVIDER) with icon and color coding.
 * 
 * Colors:
 * - AIDE: Purple/Indigo
 * - PROVIDER: Teal/Cyan
 */

import React from "react";
import { LeadTargetType } from "@prisma/client";
import { FiUser, FiUsers } from "react-icons/fi";

interface LeadTargetTypeBadgeProps {
  targetType: LeadTargetType;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

export default function LeadTargetTypeBadge({ 
  targetType, 
  size = "md",
  showIcon = true,
  className = "" 
}: LeadTargetTypeBadgeProps) {
  // Define color schemes for each type
  const colorMap: Record<LeadTargetType, string> = {
    AIDE: "bg-purple-100 text-purple-800 border-purple-200",
    PROVIDER: "bg-teal-100 text-teal-800 border-teal-200"
  };

  // Define icons for each type
  const IconComponent = targetType === "AIDE" ? FiUser : FiUsers;

  // Define size classes
  const sizeMap = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
    lg: "px-3 py-1.5 text-base"
  };

  const iconSizeMap = {
    sm: 10,
    md: 12,
    lg: 14
  };

  return (
    <span
      className={`
        inline-flex items-center justify-center gap-1
        rounded-md border font-medium
        ${colorMap[targetType]}
        ${sizeMap[size]}
        ${className}
      `}
    >
      {showIcon && <IconComponent size={iconSizeMap[size]} />}
      {targetType}
    </span>
  );
}
