/**
 * PriorityIndicator Component
 * Visual indicator for high-priority inquiries
 */

import React from 'react';
import { FiFlag, FiAlertCircle } from 'react-icons/fi';
import { UrgencyLevel } from '@/lib/inquiry-utils';

interface PriorityIndicatorProps {
  urgency: UrgencyLevel;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const urgencyConfig: Record<UrgencyLevel, { icon: React.ReactNode; label: string; color: string }> = {
  critical: {
    icon: <FiAlertCircle />,
    label: 'Critical',
    color: 'text-red-600',
  },
  high: {
    icon: <FiFlag />,
    label: 'High Priority',
    color: 'text-orange-600',
  },
  medium: {
    icon: <FiFlag />,
    label: 'Medium',
    color: 'text-yellow-600',
  },
  low: {
    icon: <FiFlag />,
    label: 'Low',
    color: 'text-gray-400',
  },
};

export default function PriorityIndicator({
  urgency,
  showLabel = false,
  size = 'md',
}: PriorityIndicatorProps) {
  const config = urgencyConfig[urgency];

  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  // Only show indicator for high and critical priorities
  if (urgency === 'low' || urgency === 'medium') {
    if (!showLabel) return null;
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 ${config.color}`}
      title={config.label}
    >
      <span className={sizeClasses[size]}>
        {config.icon}
      </span>
      {showLabel && <span className="text-sm font-medium">{config.label}</span>}
    </div>
  );
}
