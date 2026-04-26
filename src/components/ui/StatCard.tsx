import React from 'react';
import { FiTrendingUp, FiTrendingDown, FiMinus } from 'react-icons/fi';

interface TrendProps {
  value: number;
  direction: 'up' | 'down' | 'flat';
  label?: string;
}

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'orange' | 'red' | 'purple' | 'gray';
  alert?: boolean;
  trend?: TrendProps;
  className?: string;
}

const colorMap: Record<NonNullable<StatCardProps['color']>, { icon: string; border: string }> = {
  blue:   { icon: 'bg-primary-50 text-primary-600',      border: 'border-t-primary-500'   },
  green:  { icon: 'bg-success-50 text-success-600',      border: 'border-t-success-500'   },
  yellow: { icon: 'bg-warning-50 text-warning-600',      border: 'border-t-warning-500'   },
  orange: { icon: 'bg-warning-100 text-warning-700',     border: 'border-t-warning-600'   },
  red:    { icon: 'bg-error-50 text-error-600',          border: 'border-t-error-500'     },
  purple: { icon: 'bg-secondary-100 text-secondary-600', border: 'border-t-secondary-500' },
  gray:   { icon: 'bg-neutral-100 text-neutral-500',     border: 'border-t-neutral-400'   },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  color = 'blue',
  alert,
  trend,
  className = '',
}: StatCardProps) {
  const colors = colorMap[color];

  const TrendIcon = trend?.direction === 'up'
    ? FiTrendingUp
    : trend?.direction === 'down'
    ? FiTrendingDown
    : FiMinus;

  const trendColor = trend?.direction === 'up'
    ? 'text-success-600'
    : trend?.direction === 'down'
    ? 'text-error-600'
    : 'text-neutral-400';

  return (
    <div
      className={`
        bg-white rounded-xl border border-neutral-200 border-t-4 p-5
        transition-shadow duration-200 hover:shadow-md
        ${alert ? 'border-t-warning-500' : colors.border}
        ${className}
      `}
    >
      {/* Icon row */}
      <div className="flex items-center justify-between mb-4">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${colors.icon}`}>
          {icon}
        </div>
      </div>

      {/* Value */}
      <p className="text-2xl sm:text-3xl font-bold text-neutral-900 leading-none tabular-nums">
        {value}
      </p>

      {/* Label + trend row */}
      <div className="flex items-center justify-between mt-2 gap-2">
        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide truncate">
          {title}
        </p>
        {trend && (
          <span className={`inline-flex items-center gap-0.5 text-xs font-semibold flex-shrink-0 ${trendColor}`}>
            <TrendIcon size={11} />
            {Math.abs(trend.value)}%
            {trend.label && <span className="text-neutral-400 font-normal ml-0.5">{trend.label}</span>}
          </span>
        )}
        {!trend && subtitle && (
          <span className="text-xs text-neutral-400 flex-shrink-0">{subtitle}</span>
        )}
      </div>
    </div>
  );
}
