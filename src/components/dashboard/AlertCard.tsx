"use client";

import React from 'react';
import Link from 'next/link';
import { FiAlertCircle, FiAlertTriangle, FiInfo, FiCheckCircle } from 'react-icons/fi';

interface AlertCardProps {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  description: string;
  actionLabel: string;
  actionUrl: string;
  timestamp?: Date | string | null;
}

export function AlertCard({
  type,
  title,
  description,
  actionLabel,
  actionUrl,
  timestamp,
}: AlertCardProps) {
  const typeConfig = {
    error: {
      icon: FiAlertCircle,
      bgColor: 'bg-error-50',
      iconColor: 'text-error-600',
      borderColor: 'border-error-200',
    },
    warning: {
      icon: FiAlertTriangle,
      bgColor: 'bg-amber-50',
      iconColor: 'text-amber-600',
      borderColor: 'border-amber-200',
    },
    info: {
      icon: FiInfo,
      bgColor: 'bg-primary-50',
      iconColor: 'text-primary-600',
      borderColor: 'border-primary-200',
    },
    success: {
      icon: FiCheckCircle,
      bgColor: 'bg-success-50',
      iconColor: 'text-success-600',
      borderColor: 'border-success-200',
    },
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  const getTimeAgo = (date: Date | string | null | undefined) => {
    if (!date) return '';
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div
      className={`${config.bgColor} ${config.borderColor} border rounded-lg p-4 hover:shadow-sm transition-shadow duration-200`}
    >
      <div className="flex items-start">
        <div className={`${config.iconColor} mr-3 mt-0.5`}>
          <Icon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="text-sm font-medium text-neutral-900">{title}</h4>
              <p className="text-sm text-neutral-600 mt-1">{description}</p>
            </div>
            {timestamp && (
              <span className="text-xs text-neutral-500 ml-2 flex-shrink-0">
                {getTimeAgo(timestamp)}
              </span>
            )}
          </div>
          <Link
            href={actionUrl}
            className="inline-block mt-2 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            {actionLabel} →
          </Link>
        </div>
      </div>
    </div>
  );
}
