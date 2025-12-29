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
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: FiCheckCircle,
    description: 'Valid certification',
  },
  EXPIRING_SOON: {
    label: 'Expiring Soon',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: FiAlertCircle,
    description: 'Expires within 30 days',
  },
  EXPIRED: {
    label: 'Expired',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: FiXCircle,
    description: 'Certification expired',
  },
  PENDING: {
    label: 'Pending',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
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
