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
    color: 'bg-primary-50 text-primary-700 border-primary-200',
  },
  phone: {
    icon: <FiPhone className="w-3 h-3" />,
    label: 'Phone',
    color: 'bg-success-50 text-success-700 border-success-200',
  },
  referral: {
    icon: <FiUsers className="w-3 h-3" />,
    label: 'Referral',
    color: 'bg-secondary-50 text-secondary-700 border-secondary-200',
  },
  walkin: {
    icon: <FiUser className="w-3 h-3" />,
    label: 'Walk-in',
    color: 'bg-warning-50 text-warning-700 border-warning-200',
  },
  email: {
    icon: <FiMail className="w-3 h-3" />,
    label: 'Email',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  other: {
    icon: <FiFileText className="w-3 h-3" />,
    label: 'Other',
    color: 'bg-neutral-50 text-neutral-700 border-neutral-200',
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
