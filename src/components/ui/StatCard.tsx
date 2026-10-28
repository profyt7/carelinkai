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
  /**
   * OL-202: an AA-contrast delta line under the label, e.g. "+2 vs prior 7 days".
   * Opt-in; nothing renders when omitted, so existing cards are unchanged.
   */
  delta?: { text: string; tone?: 'positive' | 'negative' | 'neutral' };
  className?: string;
}

// `color` tints the icon tile only. OL-207 (Direction D): the top accent is one brand tone;
// an `alert` card opts into error-500 — no per-card rainbow.
const colorMap: Record<NonNullable<StatCardProps['color']>, { icon: string }> = {
  blue:   { icon: 'bg-primary-50 text-primary-600'      },
  green:  { icon: 'bg-success-50 text-success-600'      },
  yellow: { icon: 'bg-warning-50 text-warning-600'      },
  orange: { icon: 'bg-warning-100 text-warning-700'     },
  red:    { icon: 'bg-error-50 text-error-600'          },
  purple: { icon: 'bg-secondary-100 text-secondary-600' },
  gray:   { icon: 'bg-neutral-100 text-neutral-500'     },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  color = 'blue',
  alert,
  trend,
  delta,
  className = '',
}: StatCardProps) {
  const colors = colorMap[color];

  const TrendIcon = trend?.direction === 'up'
    ? FiTrendingUp
    : trend?.direction === 'down'
    ? FiTrendingDown
    : FiMinus;

  // OL-205: AA (≥ 4.5:1 on white) — the same tones as the opt-in delta slot below.
  const trendColor = trend?.direction === 'up'
    ? 'text-success-700'
    : trend?.direction === 'down'
    ? 'text-error-700'
    : 'text-neutral-600';

  return (
    <div
      className={`
        bg-white rounded-xl border border-neutral-200 border-t-4 p-5
        transition-shadow duration-200 hover:shadow-md
        ${alert ? 'border-t-error-500' : 'border-t-primary-500'}
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
            {trend.label && <span className="text-neutral-600 font-normal ml-0.5">{trend.label}</span>}
          </span>
        )}
        {!trend && subtitle && (
          <span className="text-xs text-neutral-600 flex-shrink-0">{subtitle}</span>
        )}
      </div>
      {delta && (
        <p
          className={`mt-2 text-xs font-medium ${
            delta.tone === 'positive' ? 'text-success-700' : delta.tone === 'negative' ? 'text-error-700' : 'text-neutral-600'
          }`}
        >
          {delta.text}
        </p>
      )}
    </div>
  );
}
