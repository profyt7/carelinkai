'use client';

import React from 'react';
import {
  FiInbox,
  FiPhone,
  FiCalendar,
  FiCheckCircle,
  FiRefreshCw,
  FiUserCheck,
  FiGift,
  FiThumbsUp,
  FiXCircle,
} from 'react-icons/fi';

type InquiryStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'TOUR_SCHEDULED'
  | 'TOUR_COMPLETED'
  | 'QUALIFIED'
  | 'CONVERTING'
  | 'CONVERTED'
  | 'PLACEMENT_OFFERED'
  | 'PLACEMENT_ACCEPTED'
  | 'CLOSED_LOST';

interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
  description: string;
}

const STATUS_CONFIG: Record<InquiryStatus, StatusConfig> = {
  NEW: {
    label: 'New',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
    icon: <FiInbox className="w-3.5 h-3.5" />,
    description: 'New inquiry, not yet contacted',
  },
  CONTACTED: {
    label: 'Contacted',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
    icon: <FiPhone className="w-3.5 h-3.5" />,
    description: 'Family has been contacted',
  },
  TOUR_SCHEDULED: {
    label: 'Tour Scheduled',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-100',
    borderColor: 'border-indigo-300',
    icon: <FiCalendar className="w-3.5 h-3.5" />,
    description: 'Tour has been scheduled',
  },
  TOUR_COMPLETED: {
    label: 'Tour Completed',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-300',
    icon: <FiCheckCircle className="w-3.5 h-3.5" />,
    description: 'Tour has been completed',
  },
  QUALIFIED: {
    label: 'Qualified',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-300',
    icon: <FiThumbsUp className="w-3.5 h-3.5" />,
    description: 'Lead is qualified for placement',
  },
  CONVERTING: {
    label: 'Converting',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-300',
    icon: <FiRefreshCw className="w-3.5 h-3.5" />,
    description: 'In process of creating resident record',
  },
  CONVERTED: {
    label: 'Converted',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-300',
    icon: <FiUserCheck className="w-3.5 h-3.5" />,
    description: 'Successfully converted to resident',
  },
  PLACEMENT_OFFERED: {
    label: 'Placement Offered',
    color: 'text-teal-700',
    bgColor: 'bg-teal-100',
    borderColor: 'border-teal-300',
    icon: <FiGift className="w-3.5 h-3.5" />,
    description: 'Placement has been offered',
  },
  PLACEMENT_ACCEPTED: {
    label: 'Placement Accepted',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-100',
    borderColor: 'border-emerald-300',
    icon: <FiUserCheck className="w-3.5 h-3.5" />,
    description: 'Placement accepted by family',
  },
  CLOSED_LOST: {
    label: 'Closed Lost',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
    icon: <FiXCircle className="w-3.5 h-3.5" />,
    description: 'Inquiry closed without placement',
  },
};

interface InquiryStatusBadgeProps {
  status: InquiryStatus;
  showIcon?: boolean;
  showDescription?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function InquiryStatusBadge({
  status,
  showIcon = true,
  showDescription = false,
  size = 'md',
  className = '',
}: InquiryStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.NEW;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  return (
    <div className={className}>
      <span
        className={`
          inline-flex items-center gap-1.5 rounded-full font-medium border
          ${config.color} ${config.bgColor} ${config.borderColor}
          ${sizeClasses[size]}
        `}
        title={config.description}
      >
        {showIcon && config.icon}
        {config.label}
      </span>
      {showDescription && (
        <p className="text-xs text-gray-600 mt-1">{config.description}</p>
      )}
    </div>
  );
}

/**
 * Status selector component for changing inquiry status
 */
interface StatusSelectorProps {
  currentStatus: InquiryStatus;
  onStatusChange: (newStatus: InquiryStatus) => void;
  disabled?: boolean;
  className?: string;
}

export function InquiryStatusSelector({
  currentStatus,
  onStatusChange,
  disabled = false,
  className = '',
}: StatusSelectorProps) {
  const statuses: InquiryStatus[] = [
    'NEW',
    'CONTACTED',
    'TOUR_SCHEDULED',
    'TOUR_COMPLETED',
    'QUALIFIED',
    'CONVERTING',
    'CONVERTED',
    'PLACEMENT_OFFERED',
    'PLACEMENT_ACCEPTED',
    'CLOSED_LOST',
  ];

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Status
      </label>
      <select
        value={currentStatus}
        onChange={(e) => onStatusChange(e.target.value as InquiryStatus)}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {statuses.map((status) => {
          const config = STATUS_CONFIG[status];
          return (
            <option key={status} value={status}>
              {config.label} - {config.description}
            </option>
          );
        })}
      </select>
    </div>
  );
}

/**
 * Get all available statuses for filtering
 */
export function getInquiryStatuses(): Array<{ value: InquiryStatus; label: string }> {
  return Object.entries(STATUS_CONFIG).map(([value, config]) => ({
    value: value as InquiryStatus,
    label: config.label,
  }));
}

/**
 * Get status configuration
 */
export function getStatusConfig(status: InquiryStatus): StatusConfig {
  return STATUS_CONFIG[status] || STATUS_CONFIG.NEW;
}
