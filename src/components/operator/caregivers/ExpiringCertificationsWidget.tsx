"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import { FiCheckCircle, FiAlertCircle, FiExternalLink } from 'react-icons/fi';
import { getCertificationsExpiringSoon, CaregiverForAnalytics } from '@/lib/caregiver-analytics';

interface ExpiringCertificationsWidgetProps {
  caregivers: CaregiverForAnalytics[];
}

export function ExpiringCertificationsWidget({ caregivers }: ExpiringCertificationsWidgetProps) {
  const expiringCertifications = useMemo(
    () => getCertificationsExpiringSoon(caregivers, 30),
    [caregivers]
  );

  if (expiringCertifications.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-neutral-200 p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">
          Expiring Certifications
        </h3>
        <div className="text-center py-8">
          <FiCheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="text-green-700 font-medium">All certifications are up to date</p>
          <p className="text-sm text-neutral-600 mt-1">
            No certifications expiring in the next 30 days
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-neutral-900">
          Expiring Certifications
        </h3>
        <span className="px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-700">
          {expiringCertifications.length} expiring soon
        </span>
      </div>
      
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {expiringCertifications.map((item) => (
          <Link
            key={item.id}
            href={`/operator/caregivers/${item.caregiver.id}?tab=certifications`}
            className="block"
          >
            <div className="flex items-start justify-between p-4 bg-yellow-50 hover:bg-yellow-100 rounded-lg border border-yellow-200 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <FiAlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                  <p className="font-medium text-neutral-900 truncate">
                    {item.caregiver.user.firstName} {item.caregiver.user.lastName}
                  </p>
                </div>
                <p className="text-sm text-neutral-600 mb-1">
                  Certification ID: {item.id}
                </p>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                    item.daysUntilExpiry <= 7
                      ? 'bg-red-100 text-red-700'
                      : item.daysUntilExpiry <= 14
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {item.daysUntilExpiry} day{item.daysUntilExpiry !== 1 ? 's' : ''} remaining
                  </span>
                </div>
              </div>
              <FiExternalLink className="w-5 h-5 text-neutral-400 flex-shrink-0 ml-3" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
