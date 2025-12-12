"use client";

import React from 'react';
import Link from 'next/link';
import {
  FiFileText,
  FiCheckCircle,
  FiAlertCircle,
  FiUserPlus,
  FiCalendar,
  FiActivity,
} from 'react-icons/fi';

interface ActivityFeedItemProps {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: Date | string;
  icon?: string;
  url?: string;
}

const iconMap: Record<string, any> = {
  FileText: FiFileText,
  CheckCircle: FiCheckCircle,
  AlertCircle: FiAlertCircle,
  UserPlus: FiUserPlus,
  Calendar: FiCalendar,
  Activity: FiActivity,
};

export function ActivityFeedItem({
  type,
  title,
  description,
  timestamp,
  icon,
  url,
}: ActivityFeedItemProps) {
  const Icon = icon ? iconMap[icon] || FiActivity : FiActivity;

  const getTimeAgo = (date: Date | string) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString();
  };

  const content = (
    <div className="flex items-start space-x-3 p-3 hover:bg-neutral-50 rounded-lg transition-colors duration-150">
      <div className="flex-shrink-0 mt-1">
        <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
          <Icon size={16} className="text-primary-600" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-900">{title}</p>
        <p className="text-sm text-neutral-600 mt-0.5">{description}</p>
        <span className="text-xs text-neutral-500 mt-1 inline-block">
          {getTimeAgo(timestamp)}
        </span>
      </div>
    </div>
  );

  if (url) {
    return <Link href={url}>{content}</Link>;
  }

  return content;
}
