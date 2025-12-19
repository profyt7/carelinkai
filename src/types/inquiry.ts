// TypeScript types for Inquiry Management System

export enum InquiryStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  TOUR_SCHEDULED = 'TOUR_SCHEDULED',
  TOUR_COMPLETED = 'TOUR_COMPLETED',
  QUALIFIED = 'QUALIFIED',
  CONVERTING = 'CONVERTING',
  CONVERTED = 'CONVERTED',
  PLACEMENT_OFFERED = 'PLACEMENT_OFFERED',
  PLACEMENT_ACCEPTED = 'PLACEMENT_ACCEPTED',
  CLOSED_LOST = 'CLOSED_LOST',
}

export enum InquiryUrgency {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum InquirySource {
  WEBSITE = 'WEBSITE',
  PHONE = 'PHONE',
  EMAIL = 'EMAIL',
  REFERRAL = 'REFERRAL',
  SOCIAL_MEDIA = 'SOCIAL_MEDIA',
  WALK_IN = 'WALK_IN',
  OTHER = 'OTHER',
}

export enum ContactMethod {
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  SMS = 'SMS',
  ANY = 'ANY',
}

export enum ResponseType {
  AI_GENERATED = 'AI_GENERATED',
  MANUAL = 'MANUAL',
  AUTOMATED = 'AUTOMATED',
  TEMPLATE = 'TEMPLATE',
}

export enum ResponseChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PHONE = 'PHONE',
  IN_APP = 'IN_APP',
}

export enum ResponseStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  BOUNCED = 'BOUNCED',
}

export enum FollowUpType {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PHONE_CALL = 'PHONE_CALL',
  TASK = 'TASK',
  REMINDER = 'REMINDER',
}

export enum FollowUpStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  OVERDUE = 'OVERDUE',
}

// Main Inquiry interface
export interface Inquiry {
  id: string;
  familyId: string;
  homeId: string;
  status: InquiryStatus;
  message?: string | null;
  internalNotes?: string | null;
  tourDate?: Date | string | null;
  aiMatchScore?: number | null;

  // Contact & Recipient Details
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  careRecipientName?: string | null;
  careRecipientAge?: number | null;
  careNeeds?: string[];
  additionalInfo?: string | null;
  urgency: InquiryUrgency;
  source: InquirySource;
  preferredContactMethod: ContactMethod;

  // Assignment
  assignedToId?: string | null;
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;

  // Conversion tracking
  convertedToResidentId?: string | null;
  conversionDate?: Date | string | null;
  convertedByUserId?: string | null;
  conversionNotes?: string | null;

  // Relationships (optional for includes)
  family?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
  };
  home?: {
    id: string;
    name: string;
    city: string;
    state: string;
  };
  responses?: InquiryResponse[];
  followUps?: FollowUp[];

  // Timestamps
  createdAt: Date | string;
  updatedAt: Date | string;
}

// InquiryResponse interface
export interface InquiryResponse {
  id: string;
  inquiryId: string;
  content: string;
  type: ResponseType;
  channel: ResponseChannel;
  sentBy?: string | null;
  sentAt?: Date | string | null;
  status: ResponseStatus;
  metadata?: any;
  subject?: string | null;
  toAddress?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// FollowUp interface
export interface FollowUp {
  id: string;
  inquiryId: string;
  scheduledFor: Date | string;
  type: FollowUpType;
  subject?: string | null;
  content?: string | null;
  status: FollowUpStatus;
  completedAt?: Date | string | null;
  completedBy?: string | null;
  metadata?: any;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Filter types
export interface InquiryFilters {
  search?: string;
  urgency?: InquiryUrgency[];
  status?: InquiryStatus[];
  source?: InquirySource[];
  assignedToId?: string;
  requiresAttention?: boolean;
  dateFrom?: Date | string;
  dateTo?: Date | string;
}

// Analytics types
export interface InquiryAnalytics {
  totalInquiries: number;
  newThisWeek: number;
  requiresAttention: number;
  conversionRate: number;
  pendingFollowUps: number;
  byStage: Record<InquiryStatus, number>;
  byUrgency: Record<InquiryUrgency, number>;
  bySource: Record<InquirySource, number>;
}

// Form types
export interface CreateInquiryInput {
  familyId: string;
  homeId: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  careRecipientName: string;
  careRecipientAge?: number;
  careNeeds?: string[];
  additionalInfo?: string;
  urgency: InquiryUrgency;
  source: InquirySource;
  preferredContactMethod?: ContactMethod;
  message?: string;
}

export interface UpdateInquiryInput {
  status?: InquiryStatus;
  assignedToId?: string;
  internalNotes?: string;
  urgency?: InquiryUrgency;
  tourDate?: Date | string;
  [key: string]: any;
}

export interface GenerateResponseInput {
  responseType: 'INITIAL' | 'URGENT' | 'FOLLOW_UP' | 'TOUR_CONFIRMATION' | 'ADDITIONAL_INFO';
  sendEmail: boolean;
  customInstructions?: string;
}

export interface ScheduleFollowUpInput {
  type: FollowUpType;
  scheduledFor: Date | string;
  subject?: string;
  content?: string;
}

// Utility types
export type InquiryWithRelations = Inquiry & {
  family: NonNullable<Inquiry['family']>;
  home: NonNullable<Inquiry['home']>;
  assignedTo?: NonNullable<Inquiry['assignedTo']>;
  responses: InquiryResponse[];
  followUps: FollowUp[];
};

// Kanban column type
export interface KanbanColumn {
  id: InquiryStatus;
  title: string;
  inquiries: Inquiry[];
  count: number;
  color: string;
}

// Color mapping utilities
export const URGENCY_COLORS: Record<InquiryUrgency, string> = {
  [InquiryUrgency.URGENT]: 'red',
  [InquiryUrgency.HIGH]: 'orange',
  [InquiryUrgency.MEDIUM]: 'yellow',
  [InquiryUrgency.LOW]: 'green',
};

export const STATUS_COLORS: Record<InquiryStatus, string> = {
  [InquiryStatus.NEW]: 'blue',
  [InquiryStatus.CONTACTED]: 'indigo',
  [InquiryStatus.TOUR_SCHEDULED]: 'purple',
  [InquiryStatus.TOUR_COMPLETED]: 'pink',
  [InquiryStatus.QUALIFIED]: 'cyan',
  [InquiryStatus.CONVERTING]: 'teal',
  [InquiryStatus.CONVERTED]: 'green',
  [InquiryStatus.PLACEMENT_OFFERED]: 'lime',
  [InquiryStatus.PLACEMENT_ACCEPTED]: 'emerald',
  [InquiryStatus.CLOSED_LOST]: 'gray',
};

// Status labels
export const STATUS_LABELS: Record<InquiryStatus, string> = {
  [InquiryStatus.NEW]: 'New',
  [InquiryStatus.CONTACTED]: 'Contacted',
  [InquiryStatus.TOUR_SCHEDULED]: 'Tour Scheduled',
  [InquiryStatus.TOUR_COMPLETED]: 'Tour Completed',
  [InquiryStatus.QUALIFIED]: 'Qualified',
  [InquiryStatus.CONVERTING]: 'Converting',
  [InquiryStatus.CONVERTED]: 'Converted',
  [InquiryStatus.PLACEMENT_OFFERED]: 'Placement Offered',
  [InquiryStatus.PLACEMENT_ACCEPTED]: 'Placement Accepted',
  [InquiryStatus.CLOSED_LOST]: 'Closed Lost',
};
