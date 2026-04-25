"use client";

import React from 'react';
import { FiCheckCircle, FiAlertCircle, FiXCircle, FiClock } from 'react-icons/fi';

type CertificationStatus = 'CURRENT' | 'EXPIRING_SOON' | 'EXPIRED' | 'PENDING';

interface CertificationStatusBadgeProps {
  status: CertificationStatus;
  expiryDate?: Date | string | null;
  className?: string;
}

const STATUS_CONFIG = {
  CURRENT: {
    label: 'Current',
    color: 'bg-success-100 text-success-800 border-success-200',
    icon: FiCheckCircle,
    description: 'Valid certification',
  },
  EXPIRING_SOON: {
    label: 'Expiring Soon',
    color: 'bg-warning-100 text-warning-800 border-warning-200',
    icon: FiAlertCircle,
    description: 'Expires within 30 days',
  },
  EXPIRED: {
    label: 'Expired',
    color: 'bg-error-100 text-error-800 border-error-200',
    icon: FiXCircle,
    description: 'Certification expired',
  },
  PENDING: {
    label: 'Pending',
    color: 'bg-primary-100 text-primary-800 border-primary-200',
    icon: FiClock,
    description: 'Awaiting verification',
  },
};

export function CertificationStatusBadge({ status, expiryDate, className = '' }: CertificationStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  // Calculate days until expiry
  let daysUntilExpiry: number | null = null;
  if (expiryDate && status === 'EXPIRING_SOON') {
    const expiry = new Date(expiryDate);
    const today = new Date();
    daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.color} ${className}`}
      title={config.description}
    >
      <Icon className="w-3 h-3" />
      {config.label}
      {daysUntilExpiry !== null && (
        <span className="ml-0.5">({daysUntilExpiry}d)</span>
      )}
    </span>
  );
}

export function getCertificationStatus(
  expiryDate: Date | string | null | undefined
): CertificationStatus {
  if (!expiryDate) return 'CURRENT';

  const expiry = new Date(expiryDate);
  const today = new Date();
  const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) return 'EXPIRED';
  if (daysUntilExpiry <= 30) return 'EXPIRING_SOON';
  return 'CURRENT';
}
