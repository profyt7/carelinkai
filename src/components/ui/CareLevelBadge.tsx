"use client";

import React from 'react';
import { 
  FiCheck, 
  FiUsers, 
  FiBrain, 
  FiHeart 
} from 'react-icons/fi';

type CareLevel = 'INDEPENDENT' | 'ASSISTED' | 'MEMORY_CARE' | 'SKILLED_NURSING';
type BadgeSize = 'sm' | 'md' | 'lg';

interface CareLevelBadgeProps {
  level: CareLevel | string;
  size?: BadgeSize;
  showIcon?: boolean;
  className?: string;
}

const careLevelConfig: Record<CareLevel, { 
  color: string; 
  icon: React.ReactNode; 
  label: string;
  description: string;
}> = {
  INDEPENDENT: {
    color: 'bg-green-50 text-green-700 border-green-200',
    icon: <FiCheck />,
    label: 'Independent',
    description: 'Low care needs',
  },
  ASSISTED: {
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: <FiUsers />,
    label: 'Assisted Living',
    description: 'Moderate care needs',
  },
  MEMORY_CARE: {
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: <FiBrain />,
    label: 'Memory Care',
    description: 'Specialized care',
  },
  SKILLED_NURSING: {
    color: 'bg-orange-50 text-orange-700 border-orange-200',
    icon: <FiHeart />,
    label: 'Skilled Nursing',
    description: 'High care needs',
  },
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

export function CareLevelBadge({ 
  level, 
  size = 'sm', 
  showIcon = true,
  className = '' 
}: CareLevelBadgeProps) {
  const normalizedLevel = level.toUpperCase() as CareLevel;
  const config = careLevelConfig[normalizedLevel] || {
    color: 'bg-gray-50 text-gray-700 border-gray-200',
    icon: <FiUsers />,
    label: level,
    description: '',
  };
  
  const sizes = sizeClasses[size];
  
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium border
        ${config.color}
        ${sizes.badge}
        ${className}
      `}
      title={config.description}
    >
      {showIcon && (
        <span className={sizes.icon}>
          {config.icon}
        </span>
      )}
      <span className={sizes.text}>
        {config.label}
      </span>
    </span>
  );
}

// Utility function to get care level color class for other components
export function getCareLevelColor(level: string): string {
  const normalizedLevel = level.toUpperCase() as CareLevel;
  const config = careLevelConfig[normalizedLevel];
  return config?.color || 'bg-gray-50 text-gray-700 border-gray-200';
}

// Utility function to get care level icon for other components
export function getCareLevelIcon(level: string): React.ReactNode {
  const normalizedLevel = level.toUpperCase() as CareLevel;
  const config = careLevelConfig[normalizedLevel];
  return config?.icon || <FiUsers />;
}

// Utility function to get care level label
export function getCareLevelLabel(level: string): string {
  const normalizedLevel = level.toUpperCase() as CareLevel;
  const config = careLevelConfig[normalizedLevel];
  return config?.label || level;
}
