/**
 * StatusBadge Component
 * Displays inquiry status with appropriate color coding and icon
 */

import React from 'react';
import { InquiryStatus } from '@prisma/client';
import { getStatusColor, getStatusDisplayText } from '@/lib/inquiry-utils';
import {
  FiCircle,
  FiPhone,
  FiCalendar,
  FiCheckCircle,
  FiAward,
  FiRefreshCw,
  FiCheck,
  FiFileText,
  FiThumbsUp,
  FiX,
} from 'react-icons/fi';

interface StatusBadgeProps {
  status: InquiryStatus;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const statusIcons: Record<InquiryStatus, React.ReactNode> = {
  NEW: <FiCircle className="w-3 h-3" />,
  CONTACTED: <FiPhone className="w-3 h-3" />,
  TOUR_SCHEDULED: <FiCalendar className="w-3 h-3" />,
  TOUR_COMPLETED: <FiCheckCircle className="w-3 h-3" />,
  QUALIFIED: <FiAward className="w-3 h-3" />,
  CONVERTING: <FiRefreshCw className="w-3 h-3" />,
  CONVERTED: <FiCheck className="w-3 h-3" />,
  PLACEMENT_OFFERED: <FiFileText className="w-3 h-3" />,
  PLACEMENT_ACCEPTED: <FiThumbsUp className="w-3 h-3" />,
  CLOSED_LOST: <FiX className="w-3 h-3" />,
};

export default function StatusBadge({
  status,
  showIcon = true,
  size = 'md',
}: StatusBadgeProps) {
  const colorClass = getStatusColor(status);
  const displayText = getStatusDisplayText(status);
  const icon = statusIcons[status];

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${colorClass} ${sizeClasses[size]}`}
      title={`Status: ${displayText}`}
    >
      {showIcon && icon}
      <span>{displayText}</span>
    </span>
  );
}
