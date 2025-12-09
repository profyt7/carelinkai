"use client";

import React, { useState } from 'react';
import {
  FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
  FiBriefcase,
  FiCalendar,
  FiAward,
  FiGlobe,
  FiEdit2,
} from 'react-icons/fi';
import { PermissionGuard } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';
import { CaregiverModal } from './CaregiverModal';

interface OverviewTabProps {
  caregiver: {
    id: string;
    userId: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
      phoneNumber?: string | null;
    };
    photoUrl?: string | null;
    dateOfBirth?: Date | string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
    employmentType: string;
    employmentStatus: string;
    hireDate?: Date | string | null;
    specializations?: string[];
    languages?: string[];
    yearsOfExperience?: number | null;
    bio?: string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
  };
  onUpdate: () => void;
}

export function OverviewTab({ caregiver, onUpdate }: OverviewTabProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const { user, specializations = [], languages = [] } = caregiver;
  const fullName = `${user.firstName} ${user.lastName}`;

  const InfoItem = ({
    icon: Icon,
    label,
    value,
  }: {
    icon: React.ElementType;
    label: string;
    value: string | null | undefined;
  }) => (
    <div className="flex items-start gap-3">
      <div className="p-2 bg-neutral-100 rounded-lg">
        <Icon className="w-4 h-4 text-neutral-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-neutral-500 mb-0.5">{label}</p>
        <p className="text-sm text-neutral-900 truncate">{value || 'Not specified'}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header with Edit Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-neutral-900">Profile Information</h3>
        <PermissionGuard permission={PERMISSIONS.CAREGIVERS_UPDATE}>
          <button
            onClick={() => setShowEditModal(true)}
            className="btn btn-secondary flex items-center gap-2"
          >
            <FiEdit2 className="w-4 h-4" />
            Edit Profile
          </button>
        </PermissionGuard>
      </div>

      {/* Profile Header */}
      <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            {caregiver.photoUrl ? (
              <img
                src={caregiver.photoUrl}
                alt={fullName}
                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center border-4 border-white shadow-lg">
                <FiUser className="w-12 h-12 text-primary-600" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-neutral-900 mb-1">{fullName}</h2>
            <p className="text-primary-700 font-medium mb-3">
              {caregiver.employmentType.replace('_', ' ')} - {caregiver.employmentStatus}
            </p>
            {caregiver.bio && (
              <p className="text-neutral-700 text-sm leading-relaxed">{caregiver.bio}</p>
            )}
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white rounded-lg border border-neutral-200 p-6">
        <h4 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
          <FiUser className="w-4 h-4" />
          Contact Information
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoItem icon={FiMail} label="Email" value={user.email} />
          <InfoItem icon={FiPhone} label="Phone Number" value={user.phoneNumber} />
          <InfoItem
            icon={FiCalendar}
            label="Date of Birth"
            value={
              caregiver.dateOfBirth
                ? new Date(caregiver.dateOfBirth).toLocaleDateString()
                : null
            }
          />
        </div>
      </div>

      {/* Address Information */}
      {(caregiver.address || caregiver.city || caregiver.state || caregiver.zipCode) && (
        <div className="bg-white rounded-lg border border-neutral-200 p-6">
          <h4 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
            <FiMapPin className="w-4 h-4" />
            Address
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <InfoItem icon={FiMapPin} label="Street Address" value={caregiver.address} />
            </div>
            <InfoItem icon={FiMapPin} label="City" value={caregiver.city} />
            <InfoItem icon={FiMapPin} label="State" value={caregiver.state} />
            <InfoItem icon={FiMapPin} label="ZIP Code" value={caregiver.zipCode} />
          </div>
        </div>
      )}

      {/* Employment Details */}
      <div className="bg-white rounded-lg border border-neutral-200 p-6">
        <h4 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
          <FiBriefcase className="w-4 h-4" />
          Employment Details
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoItem
            icon={FiBriefcase}
            label="Employment Type"
            value={caregiver.employmentType.replace('_', ' ')}
          />
          <InfoItem
            icon={FiBriefcase}
            label="Employment Status"
            value={caregiver.employmentStatus}
          />
          <InfoItem
            icon={FiCalendar}
            label="Hire Date"
            value={
              caregiver.hireDate ? new Date(caregiver.hireDate).toLocaleDateString() : null
            }
          />
          <InfoItem
            icon={FiAward}
            label="Years of Experience"
            value={caregiver.yearsOfExperience?.toString()}
          />
        </div>
      </div>

      {/* Specializations */}
      {specializations.length > 0 && (
        <div className="bg-white rounded-lg border border-neutral-200 p-6">
          <h4 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
            <FiAward className="w-4 h-4" />
            Specializations
          </h4>
          <div className="flex flex-wrap gap-2">
            {specializations.map((spec, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-primary-50 text-primary-700 border border-primary-200"
              >
                <FiAward className="w-3.5 h-3.5" />
                {spec}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Languages */}
      {languages.length > 0 && (
        <div className="bg-white rounded-lg border border-neutral-200 p-6">
          <h4 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
            <FiGlobe className="w-4 h-4" />
            Languages Spoken
          </h4>
          <div className="flex flex-wrap gap-2">
            {languages.map((lang, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200"
              >
                <FiGlobe className="w-3.5 h-3.5" />
                {lang}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="bg-neutral-50 rounded-lg p-4 text-xs text-neutral-600">
        <div className="flex flex-wrap gap-4">
          <div>
            <span className="font-medium">Created:</span>{' '}
            {new Date(caregiver.createdAt).toLocaleString()}
          </div>
          <div>
            <span className="font-medium">Last Updated:</span>{' '}
            {new Date(caregiver.updatedAt).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <CaregiverModal
          caregiver={caregiver}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            onUpdate();
          }}
        />
      )}
    </div>
  );
}
