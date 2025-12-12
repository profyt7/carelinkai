"use client";

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { FiTrendingUp, FiTrendingDown, FiMinus } from 'react-icons/fi';
import Link from 'next/link';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: number;
  href?: string;
  iconColor?: string;
  className?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend = 'neutral',
  trendValue,
  href,
  iconColor = 'text-primary-600',
  className = '',
}: MetricCardProps) {
  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-neutral-500',
  };

  const TrendIcon = trend === 'up' ? FiTrendingUp : trend === 'down' ? FiTrendingDown : FiMinus;

  const content = (
    <div
      className={`bg-white rounded-lg shadow-sm border border-neutral-200 p-6 hover:shadow-md transition-shadow duration-200 ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-neutral-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-neutral-900 mb-2">{value}</p>
          {subtitle && (
            <p className="text-sm text-neutral-500">{subtitle}</p>
          )}
          {trendValue !== undefined && (
            <div className={`flex items-center mt-2 text-sm ${trendColors[trend]}`}>
              <TrendIcon size={16} className="mr-1" />
              <span>{trendValue}%</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-primary-50 ${iconColor}`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
