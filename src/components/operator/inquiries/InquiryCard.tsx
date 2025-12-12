/**
 * InquiryCard Component
 * Enhanced inquiry card with all key information at a glance
 * - Clear status visibility
 * - Priority indicators
 * - Source badges
 * - Key information (name, contact info, dates)
 * - Quick actions
 * - Age indicators
 * - Next action reminder
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { InquiryStatus } from '@prisma/client';
import {
  FiMail,
  FiPhone,
  FiCalendar,
  FiHome,
  FiUser,
  FiClock,
  FiEdit,
  FiEye,
  FiMessageSquare,
} from 'react-icons/fi';
import StatusBadge from './StatusBadge';
import SourceBadge, { InquirySource } from './SourceBadge';
import PriorityIndicator from './PriorityIndicator';
import {
  calculateInquiryAge,
  getNextActionText,
  calculateDaysInStage,
  getInquiryUrgency,
  formatDate,
  formatPhoneNumber,
} from '@/lib/inquiry-utils';

export interface InquiryCardData {
  id: string;
  status: InquiryStatus;
  createdAt: string | Date;
  updatedAt: string | Date;
  tourDate?: string | Date | null;
  message?: string | null;
  home: {
    id: string;
    name: string;
  };
  family: {
    id: string;
    name: string;
    primaryContactName?: string | null;
    phone?: string | null;
    emergencyPhone?: string | null;
  };
  aiMatchScore?: number | null;
  // Future fields
  source?: InquirySource;
  assignedStaff?: {
    id: string;
    name: string;
  } | null;
}

interface InquiryCardProps {
  inquiry: InquiryCardData;
  onEdit?: (inquiryId: string) => void;
  onContact?: (inquiryId: string) => void;
  isFamily?: boolean;
}

export default function InquiryCard({ inquiry, onEdit, onContact, isFamily = false }: InquiryCardProps) {
  const age = calculateInquiryAge(inquiry.createdAt);
  const daysInStage = calculateDaysInStage({ updatedAt: inquiry.updatedAt });
  const nextAction = getNextActionText(inquiry);
  const urgency = getInquiryUrgency({
    status: inquiry.status,
    createdAt: inquiry.createdAt,
    tourDate: inquiry.tourDate,
  });

  // Get contact info
  const contactName = inquiry.family.primaryContactName || inquiry.family.name;
  const phone = inquiry.family.phone || inquiry.family.emergencyPhone;

  return (
    <div
      className={`group relative bg-white rounded-lg border-2 shadow-sm hover:shadow-md transition-all duration-200 ${
        urgency === 'critical'
          ? 'border-red-300 hover:border-red-400'
          : urgency === 'high'
          ? 'border-orange-300 hover:border-orange-400'
          : 'border-neutral-200 hover:border-neutral-300'
      }`}
    >
      {/* Priority Flag (top-left corner) */}
      <div className="absolute top-3 left-3">
        <PriorityIndicator urgency={urgency} />
      </div>

      {/* Card Content */}
      <div className="p-5 pt-10">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <Link
              href={`/operator/inquiries/${inquiry.id}`}
              className="text-lg font-semibold text-neutral-900 hover:text-primary-600 transition-colors"
            >
              {contactName}
            </Link>
            <div className="flex items-center gap-2 mt-1 text-sm text-neutral-600">
              <FiHome className="w-4 h-4" />
              <span>{inquiry.home.name}</span>
            </div>
          </div>

          {/* Status Badge */}
          <StatusBadge status={inquiry.status} size="md" />
        </div>

        {/* Source Badge (if available) */}
        {inquiry.source && (
          <div className="mb-3">
            <SourceBadge source={inquiry.source} />
          </div>
        )}

        {/* Contact Information */}
        <div className="space-y-2 mb-4">
          {phone && (
            <div className="flex items-center gap-2 text-sm text-neutral-700">
              <FiPhone className="w-4 h-4 text-neutral-400" />
              <a
                href={`tel:${phone}`}
                className="hover:text-primary-600 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {formatPhoneNumber(phone)}
              </a>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-neutral-700">
            <FiUser className="w-4 h-4 text-neutral-400" />
            <span>{inquiry.family.name}</span>
          </div>
        </div>

        {/* Key Dates */}
        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
          <div>
            <div className="text-neutral-500 text-xs mb-1">Inquiry Date</div>
            <div className="flex items-center gap-1.5 text-neutral-700">
              <FiClock className="w-3.5 h-3.5" />
              <span>{age}</span>
            </div>
          </div>
          {inquiry.tourDate && (
            <div>
              <div className="text-neutral-500 text-xs mb-1">Tour Date</div>
              <div className="flex items-center gap-1.5 text-neutral-700">
                <FiCalendar className="w-3.5 h-3.5" />
                <span>{formatDate(inquiry.tourDate, 'MMM d')}</span>
              </div>
            </div>
          )}
        </div>

        {/* AI Match Score (if available) */}
        {inquiry.aiMatchScore !== null && inquiry.aiMatchScore !== undefined && (
          <div className="mb-4">
            <div className="text-xs text-neutral-500 mb-1">AI Match Score</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-neutral-200 rounded-full h-2">
                <div
                  className="bg-primary-500 h-2 rounded-full transition-all"
                  style={{ width: `${inquiry.aiMatchScore * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium text-neutral-700">
                {Math.round(inquiry.aiMatchScore * 100)}%
              </span>
            </div>
          </div>
        )}

        {/* Next Action */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="text-xs font-medium text-blue-700 mb-1">Next Action</div>
          <div className="text-sm text-blue-900">{nextAction}</div>
        </div>

        {/* Stage Duration */}
        {daysInStage > 0 && (
          <div className="text-xs text-neutral-500 mb-4">
            In {inquiry.status.replace(/_/g, ' ').toLowerCase()} stage for {daysInStage} day
            {daysInStage !== 1 ? 's' : ''}
          </div>
        )}

        {/* Quick Actions (visible on hover) */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link
            href={`/operator/inquiries/${inquiry.id}`}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-md hover:bg-neutral-200 transition-colors"
          >
            <FiEye className="w-4 h-4" />
            View
          </Link>
          {/* Hide Edit button for families */}
          {!isFamily && onEdit && (
            <button
              onClick={() => onEdit(inquiry.id)}
              className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-md hover:bg-neutral-200 transition-colors"
            >
              <FiEdit className="w-4 h-4" />
              Edit
            </button>
          )}
          {/* Hide Contact button for families */}
          {!isFamily && phone && onContact && (
            <button
              onClick={() => onContact(inquiry.id)}
              className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-primary-700 bg-primary-50 rounded-md hover:bg-primary-100 transition-colors"
            >
              <FiMessageSquare className="w-4 h-4" />
              Contact
            </button>
          )}
        </div>

        {/* Assigned Staff (if available) - Hide for families */}
        {!isFamily && inquiry.assignedStaff && (
          <div className="mt-3 pt-3 border-t border-neutral-200">
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium">
                {inquiry.assignedStaff.name.charAt(0).toUpperCase()}
              </div>
              <span>Assigned to {inquiry.assignedStaff.name}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
