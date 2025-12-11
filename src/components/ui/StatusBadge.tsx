"use client";

import React from 'react';
import { 
  FiCheckCircle, 
  FiXCircle, 
  FiClock, 
  FiAlertCircle, 
  FiStar 
} from 'react-icons/fi';

type BadgeColor = 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'purple' | 'orange';
type BadgeSize = 'sm' | 'md' | 'lg';

interface StatusBadgeProps {
  status: string;
  icon?: React.ReactNode;
  color?: BadgeColor;
  size?: BadgeSize;
  className?: string;
}

const colorClasses: Record<BadgeColor, string> = {
  green: 'bg-green-50 text-green-700 border-green-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  gray: 'bg-gray-50 text-gray-700 border-gray-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  orange: 'bg-orange-50 text-orange-700 border-orange-200',
};

const sizeClasses: Record<BadgeSize, { badge: string; icon: string; text: string }> = {
  sm: {
    badge: 'px-2 py-0.5 text-xs',
    icon: 'w-3 h-3',
    text: 'text-xs',
  },
  md: {
    badge: 'px-2.5 py-1 text-sm',
    icon: 'w-3.5 h-3.5',
    text: 'text-sm',
  },
  lg: {
    badge: 'px-3 py-1.5 text-base',
    icon: 'w-4 h-4',
    text: 'text-base',
  },
};

// Auto-detect color and icon based on status
const getStatusConfig = (status: string): { color: BadgeColor; icon: React.ReactNode } => {
  const normalizedStatus = status.toUpperCase();
  
  // Active/Success states
  if (['ACTIVE', 'CURRENT', 'COMPLETED', 'APPROVED', 'VERIFIED'].includes(normalizedStatus)) {
    return { color: 'green', icon: <FiCheckCircle /> };
  }
  
  // Inactive/Terminated states
  if (['INACTIVE', 'TERMINATED', 'REJECTED', 'CANCELLED', 'EXPIRED'].includes(normalizedStatus)) {
    return { color: 'red', icon: <FiXCircle /> };
  }
  
  // Warning states
  if (['EXPIRING_SOON', 'EXPIRING', 'PENDING', 'WARNING'].includes(normalizedStatus)) {
    return { color: 'yellow', icon: <FiAlertCircle /> };
  }
  
  // On Leave/Paused states
  if (['ON_LEAVE', 'PAUSED', 'SUSPENDED'].includes(normalizedStatus)) {
    return { color: 'orange', icon: <FiClock /> };
  }
  
  // Primary/Featured states
  if (['PRIMARY', 'FEATURED', 'FAVORITE'].includes(normalizedStatus)) {
    return { color: 'blue', icon: <FiStar /> };
  }
  
  // Default
  return { color: 'gray', icon: null };
};

export function StatusBadge({ 
  status, 
  icon, 
  color, 
  size = 'sm', 
  className = '' 
}: StatusBadgeProps) {
  const autoConfig = getStatusConfig(status);
  const finalColor = color || autoConfig.color;
  const finalIcon = icon !== undefined ? icon : autoConfig.icon;
  const sizes = sizeClasses[size];
  
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium border
        ${colorClasses[finalColor]}
        ${sizes.badge}
        ${className}
      `}
    >
      {finalIcon && (
        <span className={sizes.icon}>
          {finalIcon}
        </span>
      )}
      <span className={sizes.text}>
        {status.replace(/_/g, ' ')}
      </span>
    </span>
  );
}

// Specialized badge variants for common use cases
export function EmploymentStatusBadge({ status }: { status: string }) {
  return <StatusBadge status={status} size="sm" />;
}

export function CertificationStatusBadge({ status }: { status: string }) {
  return <StatusBadge status={status} size="sm" />;
}

export function AssignmentTypeBadge({ type, isPrimary }: { type: string; isPrimary?: boolean }) {
  return (
    <StatusBadge 
      status={isPrimary ? 'Primary' : type} 
      color={isPrimary ? 'blue' : 'gray'}
      icon={isPrimary ? <FiStar /> : undefined}
      size="sm" 
    />
  );
}
