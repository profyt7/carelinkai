"use client";

import React from 'react';
import { 
  FiCheck, 
  FiUsers, 
  FiHeart 
} from 'react-icons/fi';
import { Brain } from 'lucide-react';

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
    color: 'bg-success-50 text-success-700 border-success-200',
    icon: <FiCheck />,
    label: 'Independent',
    description: 'Low care needs',
  },
  ASSISTED: {
    color: 'bg-primary-50 text-primary-700 border-primary-200',
    icon: <FiUsers />,
    label: 'Assisted Living',
    description: 'Moderate care needs',
  },
  MEMORY_CARE: {
    color: 'bg-secondary-50 text-secondary-700 border-secondary-200',
    icon: <Brain />,
    label: 'Memory Care',
    description: 'Specialized care',
  },
  SKILLED_NURSING: {
    color: 'bg-warning-50 text-warning-700 border-warning-200',
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
    color: 'bg-neutral-50 text-neutral-700 border-neutral-200',
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
  return config?.color || 'bg-neutral-50 text-neutral-700 border-neutral-200';
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
