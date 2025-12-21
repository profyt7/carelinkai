"use client";

import React from 'react';
import Link from 'next/link';
import { 
  FiUser, 
  FiMail, 
  FiPhone, 
  FiAward, 
  FiAlertCircle, 
  FiUsers,
  FiFileText,
  FiClock
} from 'react-icons/fi';
import { StatusBadge } from '@/components/ui/StatusBadge';

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
    _count?: {
      certifications?: number;
      assignments?: number;
      documents?: number;
    };
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

  // Get counts from _count or fallback to array length
  const certCount = caregiver._count?.certifications ?? certifications.length;
  const assignmentCount = caregiver._count?.assignments ?? 0;
  const documentCount = caregiver._count?.documents ?? 0;

  // Get initials for avatar fallback (null-safe)
  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();

  return (
    <Link href={`/operator/caregivers/${caregiver.id}`}>
      <div className="group bg-white rounded-lg border border-neutral-200 p-5 hover:border-primary-400 hover:shadow-lg transition-all duration-200 cursor-pointer">
        <div className="flex items-start gap-4">
          {/* Avatar with better styling */}
          <div className="flex-shrink-0">
            {caregiver.photoUrl ? (
              <img
                src={caregiver.photoUrl}
                alt={fullName}
                className="w-16 h-16 rounded-full object-cover border-2 border-primary-100 group-hover:border-primary-300 transition-colors"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center border-2 border-primary-200 group-hover:border-primary-300 transition-colors">
                <span className="text-lg font-semibold text-primary-700">{initials}</span>
              </div>
            )}
          </div>

          {/* Main Info */}
          <div className="flex-1 min-w-0">
            {/* Name and Badges */}
            <div className="mb-2.5">
              <h3 className="text-lg font-semibold text-neutral-900 truncate mb-1.5 group-hover:text-primary-700 transition-colors">
                {fullName}
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge 
                  status={employmentStatus} 
                  size="sm"
                />
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700 border border-neutral-200">
                  <FiClock className="w-3 h-3" />
                  {(employmentType || '').replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            {/* Contact Info with Icons */}
            <div className="space-y-1.5 mb-3">
              <div className="flex items-center gap-2 text-sm text-neutral-600">
                <FiMail className="w-4 h-4 text-neutral-400" />
                <a 
                  href={`mailto:${user.email}`}
                  className="truncate hover:text-primary-600 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  {user.email}
                </a>
              </div>
              {user.phoneNumber && (
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <FiPhone className="w-4 h-4 text-neutral-400" />
                  <a
                    href={`tel:${user.phoneNumber}`}
                    className="hover:text-primary-600 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {user.phoneNumber}
                  </a>
                </div>
              )}
            </div>

            {/* Stats Row */}
            <div className="flex flex-wrap items-center gap-3 mb-3">
              {certCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  <FiAward className="w-3.5 h-3.5" />
                  {certCount} Cert{certCount !== 1 ? 's' : ''}
                </span>
              )}
              {assignmentCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                  <FiUsers className="w-3.5 h-3.5" />
                  {assignmentCount} Assignment{assignmentCount !== 1 ? 's' : ''}
                </span>
              )}
              {documentCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                  <FiFileText className="w-3.5 h-3.5" />
                  {documentCount} Doc{documentCount !== 1 ? 's' : ''}
                </span>
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

          {/* Certification Alert Badge (Top Right) */}
          {(hasExpiredCerts || hasExpiringSoon) && (
            <div className="flex-shrink-0">
              {hasExpiredCerts ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                  <FiAlertCircle className="w-3 h-3" />
                  Expired
                </span>
              ) : hasExpiringSoon ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                  <FiAlertCircle className="w-3 h-3" />
                  Expiring
                </span>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
