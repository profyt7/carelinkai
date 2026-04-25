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
  blue:   { icon: 'bg-primary-50 text-primary-600',      border: 'border-l-primary-500' },
  green:  { icon: 'bg-success-50 text-success-600',      border: 'border-l-success-500' },
  yellow: { icon: 'bg-warning-50 text-warning-600',      border: 'border-l-warning-500' },
  orange: { icon: 'bg-warning-100 text-warning-700',     border: 'border-l-warning-600' },
  red:    { icon: 'bg-error-50 text-error-600',          border: 'border-l-error-500' },
  purple: { icon: 'bg-secondary-100 text-secondary-600', border: 'border-l-secondary-500' },
  gray:   { icon: 'bg-neutral-100 text-neutral-500',     border: 'border-l-neutral-400' },
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
        bg-white rounded-lg border-l-4 border border-neutral-200 p-4 sm:p-5
        transition-all duration-200 hover:shadow-card-hover
        ${alert ? 'border-l-warning-500 ring-1 ring-warning-200' : colors.border}
        ${className}
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1.5">
            {title}
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-neutral-900 leading-none tabular-nums">
            {value}
          </p>
          {(subtitle || trend) && (
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              {trend && (
                <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${trendColor}`}>
                  <TrendIcon size={11} />
                  {Math.abs(trend.value)}%
                  {trend.label && <span className="text-neutral-400 font-normal ml-0.5">{trend.label}</span>}
                </span>
              )}
              {subtitle && (
                <p className={`text-xs text-neutral-500 ${trend ? 'before:content-["·"] before:mr-1.5 before:text-neutral-300' : ''}`}>
                  {subtitle}
                </p>
              )}
            </div>
          )}
        </div>
        <div className={`p-2.5 rounded-lg flex-shrink-0 ${colors.icon}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
