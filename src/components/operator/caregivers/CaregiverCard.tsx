"use client";

import React from 'react';
import Link from 'next/link';
import { FiUser, FiMail, FiPhone, FiMapPin, FiBriefcase, FiAward, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { CertificationStatusBadge } from './CertificationStatusBadge';

interface CaregiverCardProps {
  caregiver: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
      phoneNumber?: string | null;
    };
    photoUrl?: string | null;
    specializations?: string[];
    employmentType: string;
    employmentStatus: string;
    certifications?: {
      id: string;
      expiryDate?: Date | string | null;
    }[];
  };
}

export function CaregiverCard({ caregiver }: CaregiverCardProps) {
  const { user, specializations = [], employmentType, employmentStatus, certifications = [] } = caregiver;
  const fullName = `${user.firstName} ${user.lastName}`;

  // Check certification status
  const hasExpiredCerts = certifications.some(cert => {
    if (!cert.expiryDate) return false;
    return new Date(cert.expiryDate) < new Date();
  });

  const hasExpiringSoon = certifications.some(cert => {
    if (!cert.expiryDate) return false;
    const expiry = new Date(cert.expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
  });

  const isActive = employmentStatus === 'ACTIVE';

  return (
    <Link href={`/operator/caregivers/${caregiver.id}`}>
      <div className="bg-white rounded-lg border border-neutral-200 p-4 hover:border-primary-300 hover:shadow-md transition-all duration-200 cursor-pointer">
        <div className="flex items-start gap-4">
          {/* Photo */}
          <div className="flex-shrink-0">
            {caregiver.photoUrl ? (
              <img
                src={caregiver.photoUrl}
                alt={fullName}
                className="w-16 h-16 rounded-full object-cover border-2 border-neutral-200"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-neutral-200 flex items-center justify-center">
                <FiUser className="w-8 h-8 text-neutral-500" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 truncate">{fullName}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-neutral-600">{(employmentType || '').replace('_', ' ')}</span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    {isActive ? <FiCheckCircle className="w-3 h-3" /> : null}
                    {employmentStatus}
                  </span>
                </div>
              </div>

              {/* Certification Alerts */}
              <div className="flex gap-1">
                {hasExpiredCerts && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    <FiAlertCircle className="w-3 h-3" />
                    Expired
                  </span>
                )}
                {hasExpiringSoon && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    <FiAlertCircle className="w-3 h-3" />
                    Expiring
                  </span>
                )}
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-1 mb-3">
              <div className="flex items-center gap-2 text-sm text-neutral-600">
                <FiMail className="w-3.5 h-3.5" />
                <span className="truncate">{user.email}</span>
              </div>
              {user.phoneNumber && (
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <FiPhone className="w-3.5 h-3.5" />
                  <span>{user.phoneNumber}</span>
                </div>
              )}
            </div>

            {/* Specializations */}
            {specializations.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {specializations.slice(0, 3).map((spec, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200"
                  >
                    <FiAward className="w-3 h-3" />
                    {spec}
                  </span>
                ))}
                {specializations.length > 3 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600">
                    +{specializations.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
