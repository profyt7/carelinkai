"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  FiUser, 
  FiCalendar, 
  FiHome, 
  FiMapPin,
  FiClipboard,
  FiAlertTriangle 
} from 'react-icons/fi';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CareLevelBadge } from '@/components/ui/CareLevelBadge';
import { calculateAge, getInitials, formatDate } from '@/lib/resident-utils';

interface ResidentCardProps {
  resident: {
    id: string;
    firstName: string;
    lastName: string;
    status: string;
    photoUrl?: string | null;
    dateOfBirth?: string | Date;
    admissionDate?: string | Date | null;
    careLevel?: string | null;
    careNeeds?: {
      roomNumber?: string;
      careLevel?: string;
    } | null;
    home?: {
      id: string;
      name: string;
    } | null;
    primaryCaregiver?: {
      id: string;
      firstName: string;
      lastName: string;
    } | null;
    _count?: {
      assessments?: number;
      incidents?: number;
    };
  };
}

export function ResidentCard({ resident }: ResidentCardProps) {
  const age = resident.dateOfBirth ? calculateAge(resident.dateOfBirth) : null;
  const roomNumber = resident.careNeeds?.roomNumber || '—';
  const careLevel = resident.careLevel || resident.careNeeds?.careLevel;
  const assessmentCount = resident._count?.assessments || 0;
  const incidentCount = resident._count?.incidents || 0;
  const initials = getInitials(resident.firstName, resident.lastName);
  const primaryCaregiverName = resident.primaryCaregiver 
    ? `${resident.primaryCaregiver.firstName} ${resident.primaryCaregiver.lastName}`
    : null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-5 hover:shadow-md transition-all duration-200">
      <Link href={`/operator/residents/${resident.id}`} className="block">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {resident.photoUrl ? (
              <Image
                src={resident.photoUrl}
                alt={`${resident.firstName} ${resident.lastName}`}
                width={64}
                height={64}
                className="h-16 w-16 rounded-full object-cover border-2 border-neutral-200"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center border-2 border-primary-300">
                <span className="text-primary-700 font-semibold text-xl">
                  {initials}
                </span>
              </div>
            )}
          </div>
          
          {/* Main Info */}
          <div className="flex-1 min-w-0">
            {/* Name */}
            <h3 className="text-lg font-semibold text-neutral-900 hover:text-primary-600 transition-colors truncate">
              {resident.firstName} {resident.lastName}
            </h3>
            
            {/* Badges */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <StatusBadge status={resident.status} size="sm" />
              {careLevel && (
                <CareLevelBadge level={careLevel} size="sm" />
              )}
            </div>
            
            {/* Key Info Grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 text-sm">
              {/* Age */}
              {age !== null && (
                <div className="flex items-center gap-2 text-neutral-600">
                  <FiCalendar className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                  <span className="truncate">{age} years</span>
                </div>
              )}
              
              {/* Room Number */}
              <div className="flex items-center gap-2 text-neutral-600">
                <FiMapPin className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                <span className="truncate">Room {roomNumber}</span>
              </div>
              
              {/* Home */}
              {resident.home && (
                <div className="flex items-center gap-2 text-neutral-600 col-span-2">
                  <FiHome className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                  <span className="truncate">{resident.home.name}</span>
                </div>
              )}
              
              {/* Primary Caregiver */}
              {primaryCaregiverName && (
                <div className="flex items-center gap-2 text-neutral-600 col-span-2">
                  <FiUser className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                  <span className="truncate">Caregiver: {primaryCaregiverName}</span>
                </div>
              )}
            </div>
            
            {/* Stats Badges */}
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              {assessmentCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  <FiClipboard className="w-3 h-3" />
                  {assessmentCount} Assessment{assessmentCount !== 1 ? 's' : ''}
                </span>
              )}
              {incidentCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
                  <FiAlertTriangle className="w-3 h-3" />
                  {incidentCount} Incident{incidentCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            
            {/* Admission Date (if available) */}
            {resident.admissionDate && (
              <div className="mt-3 text-xs text-neutral-500">
                Admitted {formatDate(resident.admissionDate)}
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}

/**
 * Grid layout for resident cards
 */
export function ResidentCardGrid({ residents }: { residents: ResidentCardProps['resident'][] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {residents.map((resident) => (
        <ResidentCard key={resident.id} resident={resident} />
      ))}
    </div>
  );
}
