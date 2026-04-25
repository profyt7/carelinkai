/**
 * Utility functions for inquiry management
 * Provides formatting, calculation, and helper functions for inquiries
 */

import { InquiryStatus } from '@prisma/client';
import { differenceInDays, format, formatDistanceToNow, isPast, isToday, isTomorrow } from 'date-fns';

/**
 * Calculate the age of an inquiry in days
 */
export function calculateInquiryAge(inquiryDate: Date | string): string {
  const date = typeof inquiryDate === 'string' ? new Date(inquiryDate) : inquiryDate;
  const days = differenceInDays(new Date(), date);
  
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return '1 week ago';
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 60) return '1 month ago';
  return `${Math.floor(days / 30)} months ago`;
}

/**
 * Get the age category for filtering/grouping
 */
export type InquiryAgeCategory = 'new' | 'recent' | 'aging' | 'old';

export function getInquiryAgeCategory(inquiryDate: Date | string): InquiryAgeCategory {
  const date = typeof inquiryDate === 'string' ? new Date(inquiryDate) : inquiryDate;
  const days = differenceInDays(new Date(), date);
  
  if (days <= 3) return 'new';
  if (days <= 7) return 'recent';
  if (days <= 14) return 'aging';
  return 'old';
}

/**
 * Get the color class for an inquiry status
 */
export function getStatusColor(status: InquiryStatus): string {
  const colorMap: Record<InquiryStatus, string> = {
    NEW: 'bg-primary-100 text-primary-800 border-primary-200',
    CONTACTED: 'bg-secondary-100 text-secondary-800 border-secondary-200',
    TOUR_SCHEDULED: 'bg-warning-100 text-warning-800 border-warning-200',
    TOUR_COMPLETED: 'bg-teal-100 text-teal-800 border-teal-200',
    QUALIFIED: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    CONVERTING: 'bg-warning-100 text-warning-800 border-warning-200',
    CONVERTED: 'bg-success-100 text-success-800 border-success-200',
    PLACEMENT_OFFERED: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    PLACEMENT_ACCEPTED: 'bg-success-100 text-success-800 border-success-200',
    CLOSED_LOST: 'bg-neutral-100 text-neutral-800 border-neutral-200',
  };
  
  return colorMap[status] || 'bg-neutral-100 text-neutral-800 border-neutral-200';
}

/**
 * Get the display text for a status
 */
export function getStatusDisplayText(status: InquiryStatus): string {
  const textMap: Record<InquiryStatus, string> = {
    NEW: 'New',
    CONTACTED: 'Contacted',
    TOUR_SCHEDULED: 'Tour Scheduled',
    TOUR_COMPLETED: 'Tour Completed',
    QUALIFIED: 'Qualified',
    CONVERTING: 'Converting',
    CONVERTED: 'Converted',
    PLACEMENT_OFFERED: 'Placement Offered',
    PLACEMENT_ACCEPTED: 'Placement Accepted',
    CLOSED_LOST: 'Closed/Lost',
  };
  
  return textMap[status] || status;
}

/**
 * Get icon for inquiry source (for future use when source field is added)
 */
export function getSourceIcon(source: string): string {
  const iconMap: Record<string, string> = {
    website: '🌐',
    phone: '📞',
    referral: '👥',
    walkin: '🚶',
    email: '✉️',
    other: '📋',
  };
  
  return iconMap[source.toLowerCase()] || '📋';
}

/**
 * Get color for priority level
 */
export function getPriorityColor(priority: 'high' | 'normal' | 'low'): string {
  const colorMap = {
    high: 'text-error-600',
    normal: 'text-neutral-600',
    low: 'text-neutral-400',
  };
  
  return colorMap[priority] || colorMap.normal;
}

/**
 * Format phone number to standard US format
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  
  return phone;
}

/**
 * Check if a follow-up date is overdue
 */
export function isFollowupOverdue(followupDate: Date | string | null): boolean {
  if (!followupDate) return false;
  const date = typeof followupDate === 'string' ? new Date(followupDate) : followupDate;
  return isPast(date) && !isToday(date);
}

/**
 * Get follow-up status text
 */
export function getFollowupStatusText(followupDate: Date | string | null): string {
  if (!followupDate) return 'No follow-up set';
  
  const date = typeof followupDate === 'string' ? new Date(followupDate) : followupDate;
  
  if (isToday(date)) return 'Follow-up due today';
  if (isTomorrow(date)) return 'Follow-up tomorrow';
  if (isFollowupOverdue(date)) return 'Follow-up overdue';
  
  return `Follow-up ${formatDistanceToNow(date, { addSuffix: true })}`;
}

/**
 * Get the next action text based on inquiry status
 */
export function getNextActionText(inquiry: {
  status: InquiryStatus;
  tourDate?: Date | string | null;
}): string {
  const actionMap: Record<InquiryStatus, string> = {
    NEW: 'Contact family',
    CONTACTED: 'Schedule tour',
    TOUR_SCHEDULED: inquiry.tourDate ? `Tour on ${format(new Date(inquiry.tourDate), 'MMM d')}` : 'Confirm tour',
    TOUR_COMPLETED: 'Follow up',
    QUALIFIED: 'Prepare offer',
    CONVERTING: 'Complete conversion',
    CONVERTED: 'Onboard resident',
    PLACEMENT_OFFERED: 'Await response',
    PLACEMENT_ACCEPTED: 'Finalize placement',
    CLOSED_LOST: 'No action needed',
  };
  
  return actionMap[inquiry.status] || 'Update status';
}

/**
 * Calculate days in current stage
 */
export function calculateDaysInStage(inquiry: { updatedAt: Date | string }): number {
  const date = typeof inquiry.updatedAt === 'string' ? new Date(inquiry.updatedAt) : inquiry.updatedAt;
  return differenceInDays(new Date(), date);
}

/**
 * Get urgency level based on inquiry age and status
 */
export type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low';

export function getInquiryUrgency(inquiry: {
  status: InquiryStatus;
  createdAt: Date | string;
  tourDate?: Date | string | null;
}): UrgencyLevel {
  const ageCategory = getInquiryAgeCategory(inquiry.createdAt);
  
  // New inquiries that haven't been contacted are critical
  if (inquiry.status === 'NEW' && (ageCategory === 'aging' || ageCategory === 'old')) {
    return 'critical';
  }
  
  if (inquiry.status === 'NEW' && ageCategory === 'recent') {
    return 'high';
  }
  
  // Tour scheduled in the past is critical
  if (inquiry.status === 'TOUR_SCHEDULED' && inquiry.tourDate) {
    const tourDate = typeof inquiry.tourDate === 'string' ? new Date(inquiry.tourDate) : inquiry.tourDate;
    if (isPast(tourDate) && !isToday(tourDate)) {
      return 'critical';
    }
  }
  
  // Tours completed but not followed up are high priority
  if (inquiry.status === 'TOUR_COMPLETED' && ageCategory === 'aging') {
    return 'high';
  }
  
  // Qualified leads aging without action
  if (inquiry.status === 'QUALIFIED' && ageCategory === 'old') {
    return 'high';
  }
  
  // Default priorities
  if (inquiry.status === 'CLOSED_LOST' || inquiry.status === 'CONVERTED') {
    return 'low';
  }
  
  return 'medium';
}

/**
 * Get urgency color
 */
export function getUrgencyColor(urgency: UrgencyLevel): string {
  const colorMap: Record<UrgencyLevel, string> = {
    critical: 'text-error-600 bg-error-50 border-error-200',
    high: 'text-warning-600 bg-warning-50 border-warning-200',
    medium: 'text-warning-600 bg-warning-50 border-warning-200',
    low: 'text-neutral-600 bg-neutral-50 border-neutral-200',
  };
  
  return colorMap[urgency];
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string | null, formatStr: string = 'MMM d, yyyy'): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, formatStr);
}

/**
 * Get relative time (e.g., "2 hours ago")
 */
export function getRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

/**
 * Check if inquiry is a hot lead (high priority)
 */
export function isHotLead(inquiry: {
  status: InquiryStatus;
  createdAt: Date | string;
  tourDate?: Date | string | null;
}): boolean {
  const urgency = getInquiryUrgency(inquiry);
  return urgency === 'critical' || urgency === 'high';
}

/**
 * Get stage progress percentage (for pipeline visualization)
 */
export function getStageProgress(status: InquiryStatus): number {
  const progressMap: Record<InquiryStatus, number> = {
    NEW: 10,
    CONTACTED: 25,
    TOUR_SCHEDULED: 40,
    TOUR_COMPLETED: 55,
    QUALIFIED: 70,
    CONVERTING: 85,
    CONVERTED: 100,
    PLACEMENT_OFFERED: 75,
    PLACEMENT_ACCEPTED: 90,
    CLOSED_LOST: 0,
  };
  
  return progressMap[status] || 0;
}

/**
 * Get all available inquiry statuses for filters
 */
export function getAllInquiryStatuses(): InquiryStatus[] {
  return [
    'NEW',
    'CONTACTED',
    'TOUR_SCHEDULED',
    'TOUR_COMPLETED',
    'QUALIFIED',
    'CONVERTING',
    'CONVERTED',
    'PLACEMENT_OFFERED',
    'PLACEMENT_ACCEPTED',
    'CLOSED_LOST',
  ];
}
