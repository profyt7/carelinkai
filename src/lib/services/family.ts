/**
 * Family Collaboration Service
 * 
 * Comprehensive service layer for the CareLinkAI Family Collaboration System.
 * Handles family members, documents, notes, galleries, comments, activity tracking,
 * permissions, search, and file uploads.
 * 
 * @module services/family
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  PrismaClient, 
  FamilyMemberRole, 
  FamilyMemberStatus,
  FamilyDocumentType,
  ActivityType,
  Prisma
} from '@prisma/client';
import { format, subDays, addDays } from 'date-fns';
import { createHash } from 'crypto';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import EmailService from '@/lib/email-service';
import { publish } from '@/lib/server/sse';
import type { 
  FamilyMember,
  FamilyMemberWithUser,
  FamilyDocument,
  FamilyDocumentWithDetails,
  FamilyNote,
  FamilyNoteWithDetails,
  DocumentComment,
  DocumentCommentWithAuthor,
  NoteComment,
  NoteCommentWithAuthor,
  SharedGallery,
  SharedGalleryWithDetails,
  GalleryPhoto,
  GalleryPhotoWithUploader,
  ActivityFeedItem,
  ActivityFeedItemWithActor,
  PaginationParams,
  CreateFamilyMemberRequest,
  UpdateFamilyMemberRequest,
  CreateFamilyDocumentRequest,
  UpdateFamilyDocumentRequest,
  CreateFamilyNoteRequest,
  UpdateFamilyNoteRequest,
  CreateDocumentCommentRequest,
  CreateNoteCommentRequest,
  CreateSharedGalleryRequest,
  UpdateSharedGalleryRequest,
  CreateGalleryPhotoRequest,
  UpdateGalleryPhotoRequest,
  PaginatedResponse,
  DocumentFilterOptions,
  NoteFilterOptions,
  GalleryFilterOptions,
  ActivityFilterOptions,
  FamilyMemberFilterOptions,
  PresignedUrlRequest,
  PresignedUrlResponse,
  ACLEntry,
  RichTextContent
} from '@/lib/types/family';
import { ACLSubjectType, Permission } from '@/lib/types/family';

// ======================================================
// ================= CONFIGURATION ======================
// ======================================================

/**
 * Configuration for the family collaboration service
 */
const CONFIG = {
  // S3 configuration
  s3: {
    region: process.env['AWS_REGION'] || 'us-west-2',
    bucket: process.env['AWS_S3_BUCKET'] || 'carelinkai-family-docs',
    endpoint: process.env['AWS_S3_ENDPOINT'],
    forcePathStyle: process.env['AWS_S3_FORCE_PATH_STYLE'] === 'true',
    presignedUrlExpiration: 3600, // 1 hour
  },
  // Pagination defaults
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },
  // Mock data configuration
  mockData: {
    enabled: process.env['NODE_ENV'] !== 'production',
    seed: 'carelinkai-family-collaboration',
    familyMembersCount: 8,
    documentsCount: 25,
    notesCount: 15,
    galleriesCount: 5,
    photosPerGalleryMin: 5,
    photosPerGalleryMax: 20,
    commentsPerItemMin: 0,
    commentsPerItemMax: 5,
    activitiesCount: 50,
  },
};

// Initialize S3 client
const s3Client = new S3Client({
  region: CONFIG.s3.region,
  endpoint: CONFIG.s3.endpoint,
  forcePathStyle: CONFIG.s3.forcePathStyle,
});

// ======================================================
// ================= HELPER FUNCTIONS ===================
// ======================================================

/**
 * Generates a deterministic random number based on a seed
 * @param seed - Seed string for consistent randomness
 * @returns Random number between 0 and 1
 */
function seededRandom(seed: string): () => number {
  let hash = createHash('sha256').update(seed).digest('hex');
  let a = parseInt(hash.substring(0, 8), 16);
  let b = parseInt(hash.substring(8, 16), 16);
  
  return function() {
    const t = a + b;
    a = b;
    b = t;
    return (b % 1000000) / 1000000;
  };
}

/**
 * Checks if a user has a specific permission for an object with ACL
 * @param userId - User ID to check permissions for
 * @param userRoles - Roles the user has in the family
 * @param acl - Access control list entries
 * @param permission - Permission to check
 * @returns Boolean indicating if the user has the permission
 */
export function checkPermission(
  userId: string, 
  userRoles: FamilyMemberRole[], 
  acl: ACLEntry[] | null | undefined, 
  permission: Permission
): boolean {
  if (!acl || acl.length === 0) return true; // Default to permissive if no ACL
  
  return acl.some(entry => {
    if (entry.subjectType === ACLSubjectType.USER && entry.subjectId === userId) {
      return entry.permissions.includes(permission);
    }
    
    if (entry.subjectType === ACLSubjectType.ROLE && userRoles.includes(entry.subjectId as FamilyMemberRole)) {
      return entry.permissions.includes(permission);
    }
    
    if (entry.subjectType === ACLSubjectType.PUBLIC) {
      return entry.permissions.includes(permission);
    }
    
    return false;
  });
}

/**
 * Creates default ACL entries for a new object
 * @param creatorId - ID of the user creating the object
 * @returns Array of ACL entries
 */
export function createDefaultAcl(creatorId: string): ACLEntry[] {
  return [
    // Creator has all permissions
    {
      subjectType: ACLSubjectType.USER,
      subjectId: creatorId,
      permissions: [
        Permission.VIEW,
        Permission.EDIT,
        Permission.DELETE,
        Permission.SHARE,
        Permission.COMMENT,
      ],
    },
    // Owners have all permissions except delete
    {
      subjectType: ACLSubjectType.ROLE,
      subjectId: FamilyMemberRole.OWNER,
      permissions: [
        Permission.VIEW,
        Permission.EDIT,
        Permission.SHARE,
        Permission.COMMENT,
      ],
    },
    // Care proxies can view, comment, and share
    {
      subjectType: ACLSubjectType.ROLE,
      subjectId: FamilyMemberRole.CARE_PROXY,
      permissions: [
        Permission.VIEW,
        Permission.COMMENT,
        Permission.SHARE,
      ],
    },
    // Regular members can view and comment
    {
      subjectType: ACLSubjectType.ROLE,
      subjectId: FamilyMemberRole.MEMBER,
      permissions: [
        Permission.VIEW,
        Permission.COMMENT,
      ],
    },
    // Guests can only view
    {
      subjectType: ACLSubjectType.ROLE,
      subjectId: FamilyMemberRole.GUEST,
      permissions: [
        Permission.VIEW,
      ],
    },
  ];
}

/**
 * Applies pagination parameters to a query
 * @param query - Prisma query object
 * @param params - Pagination parameters
 * @returns Updated query with pagination
 */
function applyPagination<T extends Record<string, any>>(
  query: T,
  params?: PaginationParams
): T {
  const { page = 1, limit = CONFIG.pagination.defaultLimit } = params || {};
  const actualLimit = Math.min(limit, CONFIG.pagination.maxLimit);
  
  return {
    ...query,
    skip: (page - 1) * actualLimit,
    take: actualLimit,
  };
}

/**
 * Creates a paginated response
 * @param items - Array of items
 * @param total - Total count of items
 * @param params - Pagination parameters used
 * @returns Paginated response object
 */
function createPaginatedResponse<T>(
  items: T[],
  total: number,
  params?: PaginationParams
): PaginatedResponse<T> {
  const { page = 1, limit = CONFIG.pagination.defaultLimit } = params || {};
  const actualLimit = Math.min(limit, CONFIG.pagination.maxLimit);
  
  return {
    items,
    total,
    page,
    limit: actualLimit,
    hasMore: (page * actualLimit) < total,
  };
}

/**
 * Logs an activity in the family activity feed
 * @param familyId - ID of the family
 * @param actorId - ID of the user performing the action
 * @param type - Type of activity
 * @param resourceType - Type of resource (document, note, etc.)
 * @param resourceId - ID of the resource
 * @param description - Human-readable description of the activity
 * @param metadata - Additional metadata about the activity
 * @returns Created activity feed item
 */
export async function createActivityRecord(
  data: {
    familyId: string;
    actorId: string;
    type: ActivityType;
    resourceType: string;
    resourceId: string | null;
    description: string;
    metadata?: Record<string, any>;
  }
): Promise<ActivityFeedItem> {
  let item: ActivityFeedItem;

  try {
    const created = await prisma.activityFeedItem.create({
      data: {
        familyId: data.familyId,
        actorId: data.actorId,
        type: data.type,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        description: data.description,
        metadata: data.metadata as Prisma.JsonObject,
      },
    });
    
    item = {
      id: created.id,
      familyId: created.familyId,
      actorId: created.actorId,
      type: created.type as ActivityType,
      resourceType: created.resourceType,
      resourceId: created.resourceId,
      description: created.description,
      metadata: created.metadata as Record<string, any> | null,
      createdAt: created.createdAt,
    };
  } catch (error) {
    logger.error('Failed to log activity', {
      error,
      familyId: data.familyId,
      actorId: data.actorId,
      type: data.type,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
    });

    // Mock item fallback
    item = {
      id: uuidv4(),
      familyId: data.familyId,
      actorId: data.actorId,
      type: data.type,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      description: data.description,
      metadata: data.metadata,
      createdAt: new Date(),
    };
  }

  // Attempt to fetch actor details for SSE payload (non-critical)
  let actor: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    profileImageUrl?: Prisma.JsonValue | null;
  } | null = null;

  try {
    actor = await prisma.user.findUnique({
      where: { id: data.actorId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profileImageUrl: true,
      },
    });
  } catch {
    // ignore – missing actor details shouldn't block SSE
  }

  // Publish SSE event with enriched payload
  try {
    const activityWithActor = {
      ...item,
      actor: actor || undefined,
    };

    publish(`family:${data.familyId}`, 'activity:created', {
      familyId: data.familyId,
      activity: activityWithActor,
    });
  } catch (err) {
    logger.error('Failed to publish SSE activity event', {
      err,
      familyId: data.familyId,
      activityId: item.id,
    });
  }

  return item;
}

function extractMentionNames(text: string): string[] {
  const mentionRegex = /@([A-Za-z][A-Za-z\-'. ]+)/g;
  const mentions = new Set<string>();
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    const captured = match?.[1];
    if (!captured) continue;
    let name = captured.trim();
    // Strip trailing punctuation
    name = name.replace(/[.,;:!?)]$/, '').trim();
    mentions.add(name);
  }
  
  return Array.from(mentions);
}

async function resolveMentionedUsers(familyId: string, names: string[]): Promise<Array<{ id: string; email: string; firstName: string; lastName: string }>> {
  const familyMembers = await prisma.familyMember.findMany({
    where: { familyId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true
        }
      }
    }
  });
  
  return familyMembers
    .filter(member => {
      const fullName = `${member.user.firstName} ${member.user.lastName}`;
      return names.some(name => 
        fullName.toLowerCase() === name.toLowerCase()
      );
    })
    .map(member => member.user);
}

function getAppBaseUrl(): string {
  return process.env['NEXT_PUBLIC_APP_URL'] || 
         process.env['APP_URL'] || 
         (process.env['VERCEL_URL'] ? `https://${process.env['VERCEL_URL']}` : 'http://localhost:3000');
}

async function sendMentionEmails(params: { 
  recipients: Array<{ id: string; email: string; firstName: string; lastName: string }>;
  author: { id: string; firstName?: string | null; lastName?: string | null; email?: string | null };
  document: { id: string; title: string };
  familyId: string;
}): Promise<void> {
  try {
    const baseUrl = getAppBaseUrl();
    const documentLink = `${baseUrl}/family?documentId=${params.document.id}`;
    const authorName = params.author.firstName || 'Someone';
    
    for (const recipient of params.recipients) {
      await EmailService.sendEmail({
        to: recipient.email,
        subject: `${authorName} mentioned you on "${params.document.title}"`,
        text: `${authorName} mentioned you in a comment on the document "${params.document.title}".\n\nView the document and comment here: ${documentLink}`,
        html: `
          <p>Hello ${recipient.firstName},</p>
          <p>${authorName} mentioned you in a comment on the document "${params.document.title}".</p>
          <p><a href="${documentLink}">Click here to view the document and comment</a></p>
          <p>Thank you for using CareLinkAI!</p>
        `
      });
    }
  } catch (error) {
    logger.error('Failed to send mention emails', { error });
  }
}

// ======================================================
// ================= PERMISSION CHECKING ================
// ======================================================

/**
 * Checks if a user is a member of a family
 * @param userId - ID of the user
 * @param familyId - ID of the family
 * @returns Boolean indicating if the user is a member
 */
export async function checkFamilyMembership(
  userId: string,
  familyId: string
): Promise<boolean> {
  // --------------------------------------------------
  // Short-circuit in development / mock mode
  // --------------------------------------------------
  if (CONFIG.mockData.enabled) {
    logger.debug('Mock mode: allowing family membership', { userId, familyId });
    return true;
  }

  try {
    const member = await prisma.familyMember.findFirst({
      where: {
        familyId,
        userId
      }
    });
    
    return !!member;
  } catch (error) {
    logger.error('Failed to check family membership', { error, userId, familyId });

    throw error;
  }
}

/**
 * Checks if a user has permission to view documents in a family
 * @param userId - ID of the user
 * @param familyId - ID of the family
 * @returns Boolean indicating if the user has permission
 */
export async function hasPermissionToViewDocuments(
  userId: string,
  familyId: string
): Promise<boolean> {
  // --------------------------------------------------
  // Short-circuit in development / mock mode
  // --------------------------------------------------
  if (CONFIG.mockData.enabled) {
    logger.debug('Mock mode: allowing document view permission', { userId, familyId });
    return true;
  }

  try {
    const member = await prisma.familyMember.findFirst({
      where: {
        familyId,
        userId
      }
    });

    // All family members can view documents
    return !!member;
  } catch (error) {
    logger.error('Failed to check document view permission', { error, userId, familyId });
    throw error;
  }
}

/**
 * Checks if a user has permission to upload documents to a family
 * @param userId - ID of the user
 * @param familyId - ID of the family
 * @returns Boolean indicating if the user has permission
 */
export async function hasPermissionToUploadDocuments(
  userId: string,
  familyId: string
): Promise<boolean> {
  // --------------------------------------------------
  // Short-circuit in development / mock mode
  // --------------------------------------------------
  if (CONFIG.mockData.enabled) {
    logger.debug('Mock mode: allowing document upload permission', { userId, familyId });
    return true;
  }

  try {
    const member = await prisma.familyMember.findFirst({
      where: {
        familyId,
        userId
      }
    });
    
    // Only OWNER, CARE_PROXY, and MEMBER roles can upload documents
    if (!member) return false;
    
    const allowed: FamilyMemberRole[] = [
      FamilyMemberRole.OWNER,
      FamilyMemberRole.CARE_PROXY,
      FamilyMemberRole.MEMBER,
    ];
    return allowed.includes(member.role);
  } catch (error) {
    logger.error('Failed to check document upload permission', { error, userId, familyId });
    throw error;
  }
}

/**
 * Checks if a user has permission to edit a document
 * @param userId - ID of the user
 * @param document - Document to check
 * @returns Boolean indicating if the user has permission
 */
export async function hasPermissionToEditDocument(
  userId: string,
  document: FamilyDocument
): Promise<boolean> {
  try {
    // Document uploader can always edit
    if (document.uploaderId === userId) {
      return true;
    }
    
    // Check ACL if present
    if (document.acl && document.acl.length > 0) {
      const member = await prisma.familyMember.findFirst({
        where: {
          familyId: document.familyId,
          userId
        }
      });
      
      if (!member) return false;
      
      return checkPermission(
        userId,
        [member.role],
        document.acl,
        Permission.EDIT
      );
    }
    
    // Check role-based permissions
    const member = await prisma.familyMember.findFirst({
      where: {
        familyId: document.familyId,
        userId
      }
    });
    
    if (!member) return false;
    
    // By default, only OWNER and CARE_PROXY can edit documents they didn't create
    const allowedEditors: FamilyMemberRole[] = [
      FamilyMemberRole.OWNER,
      FamilyMemberRole.CARE_PROXY,
    ];
    return allowedEditors.includes(member.role);
  } catch (error) {
    logger.error('Failed to check document edit permission', { error, userId, documentId: document.id });
    
    // In development, assume permission for testing
    if (CONFIG.mockData.enabled) {
      return true;
    }
    
    throw error;
  }
}

// ======================================================
// ================= MOCK DATA GENERATION ===============
// ======================================================

/**
 * Sample data for mock generation
 */
const MOCK_DATA = {
  firstNames: ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Susan', 'Richard', 'Jessica', 'Joseph', 'Sarah', 'Thomas', 'Karen', 'Charles', 'Nancy'],
  lastNames: ['Smith', 'Johnson', 'Williams', 'Jones', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Garcia', 'Martinez', 'Robinson'],
  documentTitles: [
    'Care Plan for {firstName}',
    'Medical History Summary',
    'Insurance Policy Documents',
    'Power of Attorney',
    'Advance Directive',
    'Medication Schedule',
    'Doctor Visit Notes - {date}',
    'Therapy Progress Report',
    'Hospital Discharge Summary',
    'Dietary Restrictions and Plan',
    'Physical Therapy Exercises',
    'Family Meeting Notes',
    'Care Facility Contract',
    'Emergency Contact Information',
    'Vaccination Records',
    'Lab Test Results - {date}',
    'Specialist Consultation Notes',
    'Medicare/Insurance Claims',
    'Financial Power of Attorney',
    'Living Will'
  ],
  noteTitles: [
    'Daily Care Notes for {firstName}',
    'Medication Changes and Observations',
    'Behavioral Observations',
    'Family Visit Summary - {date}',
    'Care Team Meeting Notes',
    'Diet and Nutrition Observations',
    'Sleep Pattern Notes',
    'Physical Activity Log',
    'Mood and Mental Health Notes',
    'Caregiver Shift Handoff',
    'Doctor Appointment Preparation',
    'Questions for Next Medical Visit',
    'Weekend Care Plan',
    'Holiday Arrangements',
    'Personal Preferences Update'
  ],
  galleryTitles: [
    '{firstName}\'s Birthday Celebration',
    'Family Reunion {year}',
    'Holiday Memories',
    'Vacation Photos',
    'Care Facility Activities',
    'Special Moments',
    'Family Visits',
    'Seasonal Celebrations',
    'Therapy and Recovery Progress',
    'Legacy Photos'
  ],
  commentContent: [
    'Thank you for sharing this important information.',
    'I noticed a few details we should discuss further.',
    'This is really helpful for coordinating care.',
    'Can we schedule a call to discuss this in more detail?',
    'I\'ll make sure to bring this up at our next family meeting.',
    'This matches what I\'ve been observing as well.',
    'Great documentation, this will help us track progress.',
    'I\'ve updated my calendar with these details.',
    'Let\'s make sure the weekend caregiver sees this.',
    'I\'ll follow up with the doctor about this.',
    'These photos bring back wonderful memories.',
    'I\'m so glad we have this documented.',
    'This is exactly what we needed for the insurance claim.',
    'I\'ve shared this with the care team.',
    'Let\'s review this again next month to see progress.'
  ],
  tags: [
    'medical', 'care-plan', 'medication', 'therapy', 'nutrition', 
    'insurance', 'legal', 'appointments', 'family-visits', 'activities',
    'important', 'follow-up', 'memories', 'daily-care', 'emergency'
  ],
  fileTypes: {
    'CARE_PLAN': ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    'MEDICAL_RECORD': ['application/pdf', 'image/jpeg', 'image/png'],
    'INSURANCE_DOCUMENT': ['application/pdf'],
    'LEGAL_DOCUMENT': ['application/pdf'],
    'FINANCIAL_DOCUMENT': ['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    'MEDICATION_LIST': ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
    'CONTACT_INFO': ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    'OTHER': ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  }
};

/**
 * Generates mock family members for development
 * @param familyId - ID of the family
 * @returns Array of mock family members with user details
 */
export async function generateMockFamilyMembers(familyId: string): Promise<FamilyMemberWithUser[]> {
  const random = seededRandom(`${CONFIG.mockData.seed}-members-${familyId}`);
  const result: FamilyMemberWithUser[] = [];
  
  // Create an owner as the first member
  const ownerFirstName = MOCK_DATA.firstNames[Math.floor(random() * MOCK_DATA.firstNames.length)] ?? 'Alex';
  const ownerLastName = MOCK_DATA.lastNames[Math.floor(random() * MOCK_DATA.lastNames.length)] ?? 'Smith';
  
  const owner: FamilyMemberWithUser = {
    id: `mock-member-${familyId}-owner`,
    familyId,
    userId: `mock-user-${familyId}-owner`,
    role: FamilyMemberRole.OWNER,
    status: FamilyMemberStatus.ACTIVE,
    joinedAt: subDays(new Date(), Math.floor(random() * 365)),
    createdAt: subDays(new Date(), Math.floor(random() * 365) + 10),
    updatedAt: new Date(),
    user: {
      id: `mock-user-${familyId}-owner`,
      firstName: ownerFirstName,
      lastName: ownerLastName,
      email: `${ownerFirstName.toLowerCase()}.${ownerLastName.toLowerCase()}@example.com`,
      profileImageUrl: {
        thumbnail: `https://ui-avatars.com/api/?name=${ownerFirstName}+${ownerLastName}&size=150`
      }
    }
  };
  
  result.push(owner);
  
  // Generate additional members with different roles
  const roles = [
    FamilyMemberRole.CARE_PROXY,
    FamilyMemberRole.MEMBER,
    FamilyMemberRole.MEMBER,
    FamilyMemberRole.MEMBER,
    FamilyMemberRole.GUEST,
    FamilyMemberRole.GUEST
  ];
  
  const statuses = [
    FamilyMemberStatus.ACTIVE,
    FamilyMemberStatus.ACTIVE,
    FamilyMemberStatus.ACTIVE,
    FamilyMemberStatus.ACTIVE,
    FamilyMemberStatus.PENDING,
    FamilyMemberStatus.SUSPENDED
  ];
  
  for (let i = 0; i < Math.min(roles.length, CONFIG.mockData.familyMembersCount - 1); i++) {
    const firstName = MOCK_DATA.firstNames[Math.floor(random() * MOCK_DATA.firstNames.length)] ?? 'Alex';
    const lastName = MOCK_DATA.lastNames[Math.floor(random() * MOCK_DATA.lastNames.length)] ?? 'Smith';
    const role = roles[i] ?? FamilyMemberRole.MEMBER;
    const status = statuses[i] ?? FamilyMemberStatus.ACTIVE;
    const joinedAt = status === FamilyMemberStatus.ACTIVE ? 
      subDays(new Date(), Math.floor(random() * 300)) : 
      undefined;
    const invitedAt = subDays(new Date(), Math.floor(random() * 300) + 5);
    
    const member: FamilyMemberWithUser = {
      id: `mock-member-${familyId}-${i}`,
      familyId,
      userId: `mock-user-${familyId}-${i}`,
      role,
      status,
      invitedById: owner.userId,
      invitedAt,
      joinedAt,
      createdAt: invitedAt || subDays(new Date(), Math.floor(random() * 300) + 10),
      updatedAt: new Date(),
      user: {
        id: `mock-user-${familyId}-${i}`,
        firstName,
        lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
        profileImageUrl: {
          thumbnail: `https://ui-avatars.com/api/?name=${firstName}+${lastName}&size=150`
        }
      },
      invitedBy: {
        id: owner.userId,
        firstName: owner.user.firstName,
        lastName: owner.user.lastName
      }
    };
    
    result.push(member);
  }
  
  return result;
}

/**
 * Generates a mock document for development
 * @param familyId - ID of the family
 * @param uploaderId - ID of the uploader
 * @param index - Index for deterministic generation
 * @param residentId - Optional resident ID
 * @returns Mock family document with details
 */
function generateMockDocument(
  familyId: string,
  uploaderId: string,
  index: number,
  residentId?: string
): FamilyDocumentWithDetails {
  const random = seededRandom(`${CONFIG.mockData.seed}-document-${familyId}-${index}`);
  
  // ------------------------------------------------------------------
  // Simplified uploader: avoid awaiting generateMockFamilyMembers here
  // ------------------------------------------------------------------
  const uploader = {
    userId: uploaderId,
    user: {
      firstName: 'Family',
      lastName: 'Member',
      profileImageUrl: {
        thumbnail: 'https://ui-avatars.com/api/?name=Family+Member&size=150'
      }
    }
  } as Pick<FamilyMemberWithUser, 'userId' | 'user'>;
  
  // Select document type
  const documentTypes = Object.values(FamilyDocumentType);
  const type = documentTypes[Math.floor(random() * documentTypes.length)] ?? FamilyDocumentType.OTHER;
  
  // Generate title
  let title = MOCK_DATA.documentTitles[index % MOCK_DATA.documentTitles.length] ?? 'Document';
  if (title.includes('{firstName}')) {
    title = title.replace('{firstName}', uploader.user.firstName);
  }
  if (title.includes('{date}')) {
    const date = format(subDays(new Date(), Math.floor(random() * 30)), 'MMM d, yyyy');
    title = title.replace('{date}', date);
  }
  
  // Generate file details
  const fileTypes = (MOCK_DATA.fileTypes as Record<string, string[]>)[String(type)] ?? ['application/pdf'];
  const fileType = fileTypes[Math.floor(random() * fileTypes.length)] ?? 'application/pdf';
  const fileExtension = fileType === 'application/pdf' ? 'pdf' : 
                        fileType.includes('word') ? 'docx' :
                        fileType.includes('spreadsheet') ? 'xlsx' :
                        fileType.includes('image/jpeg') ? 'jpg' :
                        fileType.includes('image/png') ? 'png' :
                        fileType.includes('video') ? 'mp4' : 'txt';
  
  const fileName = `${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.${fileExtension}`;
  const fileSize = Math.floor(random() * 10000000) + 100000; // 100KB to 10MB
  
  // Generate random tags
  const tagCount = Math.floor(random() * 4);
  const tags: string[] = [];
  for (let i = 0; i < tagCount; i++) {
    const tag = MOCK_DATA.tags[Math.floor(random() * MOCK_DATA.tags.length)] ?? 'important';
    if (!tags.includes(tag)) {
      tags.push(tag);
    }
  }
  
  // Generate creation date
  const createdAt = subDays(new Date(), Math.floor(random() * 60));
  const updatedAt = random() > 0.7 ? 
    new Date(createdAt.getTime() + Math.floor(random() * 1000000000)) : 
    createdAt;
  
  return {
    id: `mock-document-${familyId}-${index}`,
    familyId,
    uploaderId,
    residentId: residentId || undefined,
    type,
    title,
    description: random() > 0.3 ? `Description for ${title}` : undefined,
    fileUrl: `https://example.com/mock-files/${fileName}`,
    fileName,
    fileType,
    fileSize,
    version: Math.floor(random() * 3) + 1,
    isEncrypted: random() > 0.2,
    tags,
    acl: createDefaultAcl(uploaderId),
    metadata: random() > 0.5 ? { 
      originalName: fileName,
      pageCount: Math.floor(random() * 20) + 1
    } : undefined,
    createdAt,
    updatedAt,
    uploader: {
      id: uploader.userId,
      firstName: uploader.user.firstName,
      lastName: uploader.user.lastName,
      profileImageUrl: uploader.user.profileImageUrl
    },
    resident: residentId ? {
      id: residentId,
      firstName: 'Resident',
      lastName: 'Name'
    } : undefined,
    commentCount: Math.floor(random() * CONFIG.mockData.commentsPerItemMax)
  };
}

/**
 * Generates mock documents for development
 * @param familyId - ID of the family
 * @param uploaderId - ID of the uploader
 * @param residentId - Optional resident ID
 * @param filters - Optional document filters
 * @returns Array of mock documents with details
 */
export function generateMockDocuments(
  familyId: string,
  uploaderId: string,
  residentId?: string,
  filters?: DocumentFilterOptions
): FamilyDocumentWithDetails[] {
  const result: FamilyDocumentWithDetails[] = [];
  const random = seededRandom(`${CONFIG.mockData.seed}-documents-${familyId}`);
  const count = CONFIG.mockData.documentsCount;
  
  for (let i = 0; i < count; i++) {
    const doc = generateMockDocument(familyId, uploaderId, i, residentId);
    
    // Apply filters if provided
    if (filters) {
      // Filter by search text
      if (filters.search && 
          !doc.title.toLowerCase().includes(filters.search.toLowerCase()) &&
          !(doc.description?.toLowerCase().includes(filters.search.toLowerCase()))) {
        continue;
      }
      
      // Filter by document type
      if (filters.types && filters.types.length > 0 && !filters.types.includes(doc.type)) {
        continue;
      }
      
      // Filter by tags
      if (filters.tags && filters.tags.length > 0 && 
          !filters.tags.some(tag => doc.tags.includes(tag))) {
        continue;
      }
      
      // Filter by uploader
      if (filters.uploaderId && doc.uploaderId !== filters.uploaderId) {
        continue;
      }
      
      // Filter by date range
      if (filters.dateRange) {
        if (filters.dateRange.start && doc.createdAt < filters.dateRange.start) {
          continue;
        }
        if (filters.dateRange.end && doc.createdAt > filters.dateRange.end) {
          continue;
        }
      }
    }
    
    result.push(doc);
  }
  
  // Sort results if needed
  if (filters?.sortBy) {
    const { sortBy, sortOrder = 'desc' } = filters;
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'updatedAt':
          comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
          break;
        case 'fileSize':
          comparison = a.fileSize - b.fileSize;
          break;
        case 'createdAt':
        default:
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }
  
  return result;
}

// ======================================================
// ================= DOCUMENT SERVICES =================
// ======================================================

/**
 * Gets all family documents
 * @param familyId - ID of the family
 * @param filters - Optional filters
 * @param pagination - Pagination parameters
 * @returns Paginated list of family documents with details
 */
export async function getFamilyDocuments(
  familyId: string,
  filters?: DocumentFilterOptions,
  pagination?: PaginationParams
): Promise<PaginatedResponse<FamilyDocumentWithDetails>> {
  try {
    // Build where clause
    const where: Prisma.FamilyDocumentWhereInput = { familyId };
    
    // Apply filters
    if (filters) {
      if (filters.types && filters.types.length > 0) {
        where.type = { in: filters.types };
      }
      
      if (filters.tags && filters.tags.length > 0) {
        where.tags = { hasSome: filters.tags };
      }
      
      if (filters.residentId) {
        where.residentId = filters.residentId;
      }
      
      if (filters.uploaderId) {
        where.uploaderId = filters.uploaderId;
      }
      
      if (filters.search) {
        where.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
          { fileName: { contains: filters.search, mode: 'insensitive' } }
        ];
      }
      
      if (filters.dateRange) {
        where.createdAt = {};
        
        if (filters.dateRange.start) {
          where.createdAt.gte = filters.dateRange.start;
        }
        
        if (filters.dateRange.end) {
          where.createdAt.lte = filters.dateRange.end;
        }
      }
    }
    
    // Get total count
    const total = await prisma.familyDocument.count({ where });
    
    // Build order by
    let orderBy: Prisma.FamilyDocumentOrderByWithRelationInput = { createdAt: 'desc' };
    if (filters?.sortBy) {
      const { sortBy, sortOrder = 'desc' } = filters;
      
      switch (sortBy) {
        case 'title':
          orderBy = { title: sortOrder };
          break;
        case 'updatedAt':
          orderBy = { updatedAt: sortOrder };
          break;
        case 'fileSize':
          orderBy = { fileSize: sortOrder };
          break;
        case 'createdAt':
        default:
          orderBy = { createdAt: sortOrder };
      }
    }
    
    // Get documents with pagination
    const documents = await prisma.familyDocument.findMany({
      where,
      orderBy,
      ...applyPagination({}, pagination),
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImageUrl: true
          }
        },
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        _count: {
          select: {
            comments: true
          }
        }
      }
    });
    
    // Map to response type with proper type coercion
    const documentsWithDetails = documents.map(doc => ({
      ...doc,
      uploader: {
        ...doc.uploader,
        profileImageUrl: doc.uploader?.profileImageUrl as unknown as { thumbnail?: string } | null,
      },
      acl: doc.acl as unknown as ACLEntry[] | null,
      metadata: doc.metadata as unknown as Record<string, any> | null,
      commentCount: doc._count.comments,
    }));
    
    return createPaginatedResponse(documentsWithDetails, total, pagination);
  } catch (error) {
    logger.error("Failed to get family documents", { error, familyId });

    /* ------------------------------------------------------------------
     * Fallback to mock data when running in development or mock enabled
     * ------------------------------------------------------------------ */
    if (CONFIG.mockData.enabled) {
      // Use first mock member as uploader for deterministic generation
      const mockMembers = await generateMockFamilyMembers(familyId);
      const uploaderId = mockMembers[0]?.userId || `mock-user-${familyId}-uploader`;

      // Generate mock documents with incoming filters
      const mockDocs = generateMockDocuments(familyId, uploaderId, undefined, filters);
      return createPaginatedResponse(mockDocs, mockDocs.length, pagination);
    }

    throw error;
  }
}

/**
 * Gets a specific family document by ID
 * @param familyId - ID of the family
 * @param documentId - ID of the document
 * @returns Family document with details or null if not found
 */
export async function getFamilyDocument(
  familyId: string,
  documentId: string
): Promise<FamilyDocumentWithDetails | null> {
  try {
    const document = await prisma.familyDocument.findUnique({
      where: {
        id: documentId,
        familyId
      },
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImageUrl: true
          }
        },
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        _count: {
          select: {
            comments: true
          }
        }
      }
    });
    
    if (!document) {
      return null;
    }
    
    return {
      ...document,
      uploader: {
        ...document.uploader,
        profileImageUrl: document.uploader?.profileImageUrl as unknown as { thumbnail?: string } | null,
      },
      acl: document.acl as unknown as ACLEntry[] | null,
      metadata: document.metadata as unknown as Record<string, any> | null,
      commentCount: document._count.comments,
    };
  } catch (error) {
    logger.error('Failed to get family document', { error, familyId, documentId });
    
    // Fall back to mock data if database query fails
    if (CONFIG.mockData.enabled) {
      const mockMembers = await generateMockFamilyMembers(familyId);
      const uploaderId = mockMembers[0]?.userId || `mock-user-${familyId}-uploader`;
      const mockDocs = generateMockDocuments(familyId, uploaderId);
      return mockDocs.find(doc => doc.id === documentId) || null;
    }
    
    throw error;
  }
}

/**
 * Creates a new family document
 * @param familyId - ID of the family
 * @param uploaderId - ID of the user uploading the document
 * @param data - Document creation data
 * @returns Created family document with details
 */
export async function createFamilyDocument(
  familyId: string,
  uploaderId: string,
  data: CreateFamilyDocumentRequest & {
    fileUrl: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    isEncrypted?: boolean;
    metadata?: Record<string, any>;
  }
): Promise<FamilyDocumentWithDetails> {
  try {
    // Create document
    const document = await prisma.familyDocument.create({
      data: {
        familyId,
        uploaderId,
        title: data.title,
        description: data.description,
        type: data.type,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileType: data.fileType,
        fileSize: data.fileSize,
        version: 1,
        isEncrypted: data.isEncrypted || false,
        tags: data.tags || [],
        // cast to JSON value to satisfy Prisma exact type
        acl: createDefaultAcl(uploaderId) as unknown as Prisma.InputJsonValue,
        metadata: data.metadata as Prisma.JsonObject,
        residentId: data.residentId
      },
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImageUrl: true
          }
        },
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });
    
    // Log activity
    await createActivityRecord({
      familyId,
      actorId: uploaderId,
      type: ActivityType.DOCUMENT_UPLOADED,
      resourceType: 'document',
      resourceId: document.id,
      description: `${document.uploader.firstName} uploaded a new document: ${document.title}`,
      metadata: {
        documentType: document.type,
        fileName: document.fileName
      }
    });
    
    return {
      ...document,
      uploader: {
        ...document.uploader,
        profileImageUrl: document.uploader?.profileImageUrl as unknown as { thumbnail?: string } | null,
      },
      acl: document.acl as unknown as ACLEntry[] | null,
      metadata: document.metadata as unknown as Record<string, any> | null,
      commentCount: 0,
    };
  } catch (error) {
    logger.error('Failed to create family document', { error, familyId, data });
    
    // In development, return mock document
    if (CONFIG.mockData.enabled) {
      const mockMembers = await generateMockFamilyMembers(familyId);
      const uploader = (mockMembers.find(m => m.userId === uploaderId) ?? mockMembers[0]) || {
        userId: uploaderId,
        user: {
          firstName: 'Family',
          lastName: 'Member',
          profileImageUrl: { thumbnail: '' }
        }
      } as unknown as FamilyMemberWithUser;
      
      const mockDoc: FamilyDocumentWithDetails = {
        id: uuidv4(),
        familyId,
        uploaderId,
        type: data.type,
        title: data.title,
        description: data.description,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileType: data.fileType,
        fileSize: data.fileSize,
        version: 1,
        isEncrypted: data.isEncrypted || false,
        tags: data.tags || [],
        acl: createDefaultAcl(uploaderId),
        metadata: data.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
        uploader: {
          id: uploader.userId,
          firstName: uploader.user.firstName,
          lastName: uploader.user.lastName,
          profileImageUrl: uploader.user.profileImageUrl
        },
        commentCount: 0
      };
      
      return mockDoc;
    }
    
    throw error;
  }
}

/**
 * Updates a family document
 * @param familyId - ID of the family
 * @param documentId - ID of the document to update
 * @param userId - ID of the user making the update
 * @param data - Document update data
 * @returns Updated family document with details
 */
export async function updateFamilyDocument(
  familyId: string,
  documentId: string,
  userId: string,
  data: UpdateFamilyDocumentRequest & { isEncrypted?: boolean }
): Promise<FamilyDocumentWithDetails> {
  try {
    // Check if document exists
    const existingDocument = await getFamilyDocument(familyId, documentId);
    
    if (!existingDocument) {
      throw new Error('Document not found');
    }
    
    // Check if user has permission to edit
    const hasPermission = await hasPermissionToEditDocument(userId, existingDocument);
    
    if (!hasPermission) {
      throw new Error('No permission to edit this document');
    }
    
    // Update document
    const updatedDocument = await prisma.familyDocument.update({
      where: {
        id: documentId,
        familyId
      },
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        tags: data.tags,
        isEncrypted: data.isEncrypted,
        updatedAt: new Date()
      },
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImageUrl: true
          }
        },
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        _count: {
          select: {
            comments: true
          }
        }
      }
    });
    
    // Log activity
    await createActivityRecord({
      familyId,
      actorId: userId,
      type: ActivityType.DOCUMENT_UPDATED,
      resourceType: 'document',
      resourceId: documentId,
      description: `${updatedDocument.uploader.firstName} updated document: ${updatedDocument.title}`,
      metadata: {
        documentType: updatedDocument.type,
        previousTitle: existingDocument.title !== data.title ? existingDocument.title : undefined
      }
    });
    
    return {
      ...updatedDocument,
      uploader: {
        ...updatedDocument.uploader,
        profileImageUrl: updatedDocument.uploader?.profileImageUrl as unknown as { thumbnail?: string } | null,
      },
      acl: updatedDocument.acl as unknown as ACLEntry[] | null,
      metadata: updatedDocument.metadata as unknown as Record<string, any> | null,
      commentCount: updatedDocument._count.comments,
    };
  } catch (error) {
    logger.error('Failed to update family document', { error, familyId, documentId, data });
    
    // In development, return mock document
    if (CONFIG.mockData.enabled) {
      const mockMembers = await generateMockFamilyMembers(familyId);
      const mockDocs = generateMockDocuments(
        familyId,
        mockMembers[0]?.userId || `mock-user-${familyId}-uploader`
      );
      const existingDoc = mockDocs.find(doc => doc.id === documentId);
      
      if (!existingDoc) {
        throw new Error('Document not found');
      }
      
      const updatedDoc: FamilyDocumentWithDetails = {
        ...existingDoc,
        title: data.title || existingDoc.title,
        description: data.description !== undefined ? data.description : existingDoc.description,
        type: data.type || existingDoc.type,
        tags: data.tags || existingDoc.tags,
        isEncrypted: data.isEncrypted !== undefined ? data.isEncrypted : existingDoc.isEncrypted,
        updatedAt: new Date()
      };
      
      return updatedDoc;
    }
    
    throw error;
  }
}

/**
 * Deletes a family document
 * @param familyId - ID of the family
 * @param documentId - ID of the document to delete
 * @param userId - ID of the user making the request
 * @returns True if successful
 */
export async function deleteFamilyDocument(
  familyId: string,
  documentId: string,
  userId: string
): Promise<boolean> {
  try {
    // Check if document exists
    const existingDocument = await getFamilyDocument(familyId, documentId);
    
    if (!existingDocument) {
      throw new Error('Document not found');
    }
    
    // Check if user is the uploader or has permission to delete
    const isUploader = existingDocument.uploaderId === userId;
    
    if (!isUploader) {
      // Check if user has delete permission via ACL
      const member = await prisma.familyMember.findFirst({
        where: {
          familyId,
          userId
        }
      });
      
      if (!member) {
        throw new Error('User is not a member of this family');
      }
      
      const hasPermission = checkPermission(
        userId,
        [member.role],
        existingDocument.acl,
        Permission.DELETE
      );
      
      if (!hasPermission) {
        throw new Error('No permission to delete this document');
      }
    }
    
    // Store document info for activity log
    const documentTitle = existingDocument.title;
    
    // Delete document
    await prisma.familyDocument.delete({
      where: {
        id: documentId,
        familyId
      }
    });
    
    // Log activity
    await createActivityRecord({
      familyId,
      actorId: userId,
      type: ActivityType.DOCUMENT_DELETED,
      resourceType: 'document',
      resourceId: null, // Document no longer exists
      description: `${existingDocument.uploader.firstName} deleted document: ${documentTitle}`,
      metadata: {
        documentType: existingDocument.type,
        documentTitle
      }
    });
    
    return true;
  } catch (error) {
    logger.error('Failed to delete family document', { error, familyId, documentId });
    
    // In development, return success
    if (CONFIG.mockData.enabled) {
      return true;
    }
    
    throw error;
  }
}

/**
 * Gets document comments for a document
 * @param familyId - ID of the family
 * @param documentId - ID of the document
 * @param pagination - Pagination parameters
 * @returns Paginated list of document comments with authors
 */
export async function getDocumentComments(
  familyId: string,
  documentId: string,
  pagination?: PaginationParams
): Promise<PaginatedResponse<DocumentCommentWithAuthor>> {
  try {
    // Check if document exists
    const document = await prisma.familyDocument.findUnique({
      where: {
        id: documentId,
        familyId
      }
    });
    
    if (!document) {
      throw new Error('Document not found');
    }
    
    // Get total count of top-level comments
    const total = await prisma.documentComment.count({
      where: {
        documentId,
        parentCommentId: null
      }
    });
    
    // Get comments with pagination
    const comments = await prisma.documentComment.findMany({
      where: {
        documentId,
        parentCommentId: null
      },
      orderBy: {
        createdAt: 'desc'
      },
      ...applyPagination({}, pagination),
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImageUrl: true
          }
        },
        replies: {
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImageUrl: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });
    
    const mapped = comments.map(c => ({
      ...c,
      author: {
        ...c.author,
        profileImageUrl: c.author?.profileImageUrl as unknown as { thumbnail?: string } | null,
      },
      replies: c.replies.map(r => ({
        ...r,
        author: {
          ...r.author,
          profileImageUrl: r.author?.profileImageUrl as unknown as { thumbnail?: string } | null,
        }
      }))
    }));
    return createPaginatedResponse(mapped, total, pagination);
  } catch (error) {
    logger.error('Failed to get document comments', { error, familyId, documentId });
    
    // Fall back to mock data if database query fails
    if (CONFIG.mockData.enabled) {
      const mockComments: DocumentCommentWithAuthor[] = [];
      
      // Apply pagination
      const { page = 1, limit = CONFIG.pagination.defaultLimit } = pagination || {};
      const actualLimit = Math.min(limit, CONFIG.pagination.maxLimit);
      const start = (page - 1) * actualLimit;
      const end = start + actualLimit;
      const paginatedComments = mockComments.slice(start, end);
      
      return createPaginatedResponse(paginatedComments, mockComments.length, pagination);
    }
    
    throw error;
  }
}

/**
 * Creates a new document comment
 * @param familyId - ID of the family
 * @param documentId - ID of the document
 * @param authorId - ID of the comment author
 * @param data - Comment creation data
 * @returns Created document comment with author
 */
export async function createDocumentComment(
  familyId: string,
  documentId: string,
  authorId: string,
  data: CreateDocumentCommentRequest
): Promise<DocumentCommentWithAuthor> {
  try {
    // Check if document exists
    const document = await prisma.familyDocument.findUnique({
      where: {
        id: documentId,
        familyId
      }
    });
    
    if (!document) {
      throw new Error('Document not found');
    }
    
    // Check if parent comment exists if provided
    if (data.parentCommentId) {
      const parentComment = await prisma.documentComment.findUnique({
        where: {
          id: data.parentCommentId,
          documentId
        }
      });
      
      if (!parentComment) {
        throw new Error('Parent comment not found');
      }
      
      // Ensure we're not creating a nested reply (only one level of nesting allowed)
      if (parentComment.parentCommentId) {
        throw new Error('Cannot reply to a reply');
      }
    }
    
    // Create comment
    const comment = await prisma.documentComment.create({
      data: {
        documentId,
        authorId,
        content: data.content,
        parentCommentId: data.parentCommentId
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImageUrl: true,
            email: true
          }
        }
      }
    });
    
    // Extract @mentions from the comment content
    const names = extractMentionNames(data.content || '');
    
    // Process mentions if any were found
    if (names.length > 0) {
      // Resolve mentioned users
      const mentionedUsers = await resolveMentionedUsers(familyId, names);
      
      // Filter out the author and build a unique recipient list by email
      const recipientsMap = new Map<
        string,
        { id: string; email: string; firstName: string; lastName: string }
      >();

      for (const u of mentionedUsers) {
        if (u.id === authorId || !u.email) continue;
        if (!recipientsMap.has(u.email)) {
          recipientsMap.set(u.email, u);
        }
      }

      const recipients = Array.from(recipientsMap.values());
      
      // Send emails to mentioned users
      if (recipients.length > 0) {
        await sendMentionEmails({
          recipients,
          author: {
            id: authorId,
            firstName: comment.author.firstName,
            lastName: comment.author.lastName,
            email: comment.author.email
          },
          document: {
            id: documentId,
            title: document.title
          },
          familyId
        });
      }
      
      // Log activity with mention metadata
      await createActivityRecord({
        familyId,
        actorId: authorId,
        type: ActivityType.DOCUMENT_COMMENTED,
        resourceType: 'document',
        resourceId: documentId,
        description: `${comment.author.firstName} commented on document: ${document.title}`,
        metadata: {
          commentId: comment.id,
          isReply: !!data.parentCommentId,
          mentionUserIds: recipients.map(r => r.id),
          mentionNames: names
        }
      });
    } else {
      // Log regular activity without mentions
      await createActivityRecord({
        familyId,
        actorId: authorId,
        type: ActivityType.DOCUMENT_COMMENTED,
        resourceType: 'document',
        resourceId: documentId,
        description: `${comment.author.firstName} commented on document: ${document.title}`,
        metadata: {
          commentId: comment.id,
          isReply: !!data.parentCommentId
        }
      });
    }
    
    // Return the created comment (without the email field)
    return {
      ...comment,
      author: {
        id: comment.author.id,
        firstName: comment.author.firstName,
        lastName: comment.author.lastName,
        profileImageUrl: comment.author.profileImageUrl as unknown as { thumbnail?: string } | null
      },
      replies: []
    };
  } catch (error) {
    logger.error('Failed to create document comment', { error, familyId, documentId, data });
    throw error;
  }
}

/**
 * Gets a presigned URL for document upload
 * @param familyId - ID of the family
 * @param userId - ID of the user requesting the URL
 * @param data - Presigned URL request data
 * @returns Presigned URL response
 */
export async function getDocumentUploadUrl(
  familyId: string,
  userId: string,
  data: PresignedUrlRequest
): Promise<PresignedUrlResponse> {
  try {
    // Check if user has permission to upload documents
    const hasPermission = await hasPermissionToUploadDocuments(userId, familyId);
    
    if (!hasPermission) {
      throw new Error('No permission to upload documents');
    }
    
    // Generate a unique key for the file
    const timestamp = Date.now();
    const uuid = uuidv4();
    const key = `family/${familyId}/documents/${timestamp}-${uuid}-${data.fileName}`;
    
    // Create command for generating presigned URL
    const command = new PutObjectCommand({
      Bucket: CONFIG.s3.bucket,
      Key: key,
      ContentType: data.contentType,
      Metadata: {
        userId,
        familyId,
        originalName: data.fileName
      }
    });
    
    // Generate presigned URL
    const url = await getSignedUrl(s3Client, command, {
      expiresIn: CONFIG.s3.presignedUrlExpiration
    });

    // Compute public file URL that the document will ultimately be accessible at
    const base =
      CONFIG.s3.endpoint ??
      `https://${CONFIG.s3.bucket}.s3.${CONFIG.s3.region}.amazonaws.com`;
    const fileUrl = `${base}/${key}`;

    return {
      url,
      fields: {},
      fileUrl,
      expires: CONFIG.s3.presignedUrlExpiration
    };
  } catch (error) {
    logger.error('Failed to get document upload URL', { error, familyId, data });
    
    // In development, return a mock URL
    if (CONFIG.mockData.enabled) {
      const mockKey = `family/${familyId}/documents/${Date.now()}-${uuidv4()}-${data.fileName}`;
      return {
        url: `https://example.com/mock-upload/${familyId}/${uuidv4()}/${data.fileName}`,
        fields: {},
        fileUrl: `https://example.com/mock-files/${familyId}/${uuidv4()}-${data.fileName}`,
        expires: CONFIG.s3.presignedUrlExpiration
      };
    }
    
    throw error;
  }
}
