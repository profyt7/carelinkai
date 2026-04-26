"use client";

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { FiTrendingUp, FiTrendingDown, FiMinus } from 'react-icons/fi';
import Link from 'next/link';

type CardColor = 'blue' | 'green' | 'purple' | 'amber' | 'red' | 'gray';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: number;
  href?: string;
  color?: CardColor;
  className?: string;
  // legacy prop — ignored, color controls styling now
  iconColor?: string;
}

const colorMap: Record<CardColor, { border: string; icon: string }> = {
  blue:   { border: 'border-t-primary-500',   icon: 'bg-primary-50 text-primary-600'      },
  green:  { border: 'border-t-success-500',   icon: 'bg-success-50 text-success-600'      },
  purple: { border: 'border-t-secondary-500', icon: 'bg-secondary-100 text-secondary-600' },
  amber:  { border: 'border-t-warning-500',   icon: 'bg-warning-50 text-warning-600'      },
  red:    { border: 'border-t-error-500',     icon: 'bg-error-50 text-error-600'          },
  gray:   { border: 'border-t-neutral-400',   icon: 'bg-neutral-100 text-neutral-500'     },
};

const trendColors = {
  up:      'text-success-600',
  down:    'text-error-600',
  neutral: 'text-neutral-400',
};

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend = 'neutral',
  trendValue,
  href,
  color = 'blue',
  className = '',
}: MetricCardProps) {
  const { border, icon: iconCls } = colorMap[color];
  const TrendIcon = trend === 'up' ? FiTrendingUp : trend === 'down' ? FiTrendingDown : FiMinus;

  const content = (
    <div
      className={`bg-white rounded-xl border border-neutral-200 border-t-4 ${border} p-5 hover:shadow-md transition-shadow duration-200 ${className}`}
    >
      {/* Icon */}
      <div className="flex items-center justify-between mb-4">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconCls}`}>
          <Icon size={18} />
        </div>
      </div>

      {/* Value */}
      <p className="text-2xl sm:text-3xl font-bold text-neutral-900 leading-none tabular-nums">
        {value}
      </p>

      {/* Label + trend */}
      <div className="flex items-center justify-between mt-2 gap-2">
        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide truncate">
          {title}
        </p>
        {trendValue !== undefined && (
          <span className={`inline-flex items-center gap-0.5 text-xs font-semibold flex-shrink-0 ${trendColors[trend]}`}>
            <TrendIcon size={11} />
            {Math.abs(trendValue)}%
          </span>
        )}
      </div>

      {subtitle && (
        <p className="text-xs text-neutral-400 mt-1 truncate">{subtitle}</p>
      )}
    </div>
  );

  if (href) {
    return <Link href={href} className="block">{content}</Link>;
  }

  return content;
}
