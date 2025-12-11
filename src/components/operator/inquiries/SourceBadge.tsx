/**
 * SourceBadge Component
 * Displays the source of an inquiry with icon
 * (Website, Phone, Referral, Walk-in, Email, Other)
 */

import React from 'react';
import { FiGlobe, FiPhone, FiUsers, FiUser, FiMail, FiFileText } from 'react-icons/fi';

export type InquirySource = 'website' | 'phone' | 'referral' | 'walkin' | 'email' | 'other';

interface SourceBadgeProps {
  source: InquirySource | string;
  size?: 'sm' | 'md';
}

const sourceConfig: Record<InquirySource, { icon: React.ReactNode; label: string; color: string }> = {
  website: {
    icon: <FiGlobe className="w-3 h-3" />,
    label: 'Website',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  phone: {
    icon: <FiPhone className="w-3 h-3" />,
    label: 'Phone',
    color: 'bg-green-50 text-green-700 border-green-200',
  },
  referral: {
    icon: <FiUsers className="w-3 h-3" />,
    label: 'Referral',
    color: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  walkin: {
    icon: <FiUser className="w-3 h-3" />,
    label: 'Walk-in',
    color: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  email: {
    icon: <FiMail className="w-3 h-3" />,
    label: 'Email',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  other: {
    icon: <FiFileText className="w-3 h-3" />,
    label: 'Other',
    color: 'bg-gray-50 text-gray-700 border-gray-200',
  },
};

export default function SourceBadge({ source, size = 'sm' }: SourceBadgeProps) {
  const normalizedSource = source.toLowerCase() as InquirySource;
  const config = sourceConfig[normalizedSource] || sourceConfig.other;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded border ${config.color} ${sizeClasses[size]}`}
      title={`Source: ${config.label}`}
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
}
