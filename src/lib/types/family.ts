/**
 * TypeScript types for the CareLinkAI Family Collaboration System
 * 
 * This file contains all types needed for building family collaboration features:
 * - Document sharing
 * - Collaborative notes
 * - Photo galleries
 * - Family communication
 * - Permission management
 */

import { 
  FamilyMemberRole as PrismaFamilyMemberRole,
  FamilyMemberStatus as PrismaFamilyMemberStatus,
  FamilyDocumentType as PrismaFamilyDocumentType,
  ActivityType as PrismaActivityType,
  User,
  Family,
  Resident
} from '@prisma/client';

// ======================================================
// ================= CORE ENUMS & TYPES =================
// ======================================================

/**
 * Re-export Prisma enums for use in the application
 */
export const FamilyMemberRole = PrismaFamilyMemberRole;
export type FamilyMemberRole = PrismaFamilyMemberRole;

export const FamilyMemberStatus = PrismaFamilyMemberStatus;
export type FamilyMemberStatus = PrismaFamilyMemberStatus;

export const FamilyDocumentType = PrismaFamilyDocumentType;
export type FamilyDocumentType = PrismaFamilyDocumentType;
export type DocumentType = FamilyDocumentType;

export const ActivityType = PrismaActivityType;
export type ActivityType = PrismaActivityType;

/**
 * Document type display names for UI
 */
export const DOCUMENT_TYPE_LABELS: Record<FamilyDocumentType, string> = {
  CARE_PLAN: 'Care Plan',
  MEDICAL_RECORD: 'Medical Record',
  INSURANCE_DOCUMENT: 'Insurance Document',
  PHOTO: 'Photo',
  VIDEO: 'Video',
  LEGAL_DOCUMENT: 'Legal Document',
  PERSONAL_DOCUMENT: 'Personal Document',
  OTHER: 'Other Document'
};

/**
 * Family member role display names and descriptions
 */
export const FAMILY_ROLE_INFO: Record<FamilyMemberRole, { label: string; description: string }> = {
  OWNER: { 
    label: 'Owner', 
    description: 'Full access to all family content and can manage members' 
  },
  CARE_PROXY: { 
    label: 'Care Proxy', 
    description: 'Can make care decisions and access most content' 
  },
  MEMBER: { 
    label: 'Family Member', 
    description: 'Standard access to family content' 
  },
  GUEST: { 
    label: 'Guest', 
    description: 'Limited access to specific shared content' 
  }
};

// ======================================================
// ================= BASE MODEL TYPES ===================
// ======================================================

/**
 * Base family member type
 */
export interface FamilyMember {
  id: string;
  familyId: string;
  userId: string;
  role: FamilyMemberRole;
  status: FamilyMemberStatus;
  invitedById?: string | null;
  invitedAt?: Date | null;
  joinedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Base family document type
 */
export interface FamilyDocument {
  id: string;
  familyId: string;
  uploaderId: string;
  residentId?: string | null;
  type: FamilyDocumentType;
  title: string;
  description?: string | null;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  version: number;
  isEncrypted: boolean;
  acl?: ACLEntry[] | null;
  tags: string[];
  metadata?: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Base family note type
 */
export interface FamilyNote {
  id: string;
  familyId: string;
  authorId: string;
  residentId?: string | null;
  title: string;
  content: RichTextContent;
  tags: string[];
  acl?: ACLEntry[] | null;
  metadata?: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Base document comment type
 */
export interface DocumentComment {
  id: string;
  documentId: string;
  authorId: string;
  content: string;
  parentCommentId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Base note comment type
 */
export interface NoteComment {
  id: string;
  noteId: string;
  authorId: string;
  content: string;
  parentCommentId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Base shared gallery type
 */
export interface SharedGallery {
  id: string;
  familyId: string;
  creatorId: string;
  title: string;
  description?: string | null;
  coverPhotoUrl?: string | null;
  acl?: ACLEntry[] | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Base gallery photo type
 */
export interface GalleryPhoto {
  id: string;
  galleryId: string;
  uploaderId: string;
  fileUrl: string;
  thumbnailUrl: string;
  caption?: string | null;
  metadata?: Record<string, any> | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Base activity feed item type
 */
export interface ActivityFeedItem {
  id: string;
  familyId: string;
  actorId: string;
  type: ActivityType;
  resourceType: string;
  resourceId?: string | null;
  description: string;
  metadata?: Record<string, any> | null;
  createdAt: Date;
}

// ======================================================
// ================= EXTENDED TYPES =====================
// ======================================================

/**
 * Extended family member with user details
 */
export interface FamilyMemberWithUser extends FamilyMember {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profileImageUrl?: {
      thumbnail?: string;
      medium?: string;
      large?: string;
    } | null;
  };
  invitedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

/**
 * Extended family document with uploader and comments
 */
export interface FamilyDocumentWithDetails extends FamilyDocument {
  uploader: {
    id: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: {
      thumbnail?: string;
    } | null;
  };
  resident?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  comments?: DocumentCommentWithAuthor[];
  commentCount?: number;
}

/**
 * Extended family note with author and comments
 */
export interface FamilyNoteWithDetails extends FamilyNote {
  author: {
    id: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: {
      thumbnail?: string;
    } | null;
  };
  resident?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  comments?: NoteCommentWithAuthor[];
  commentCount?: number;
}

/**
 * Extended document comment with author
 */
export interface DocumentCommentWithAuthor extends DocumentComment {
  author: {
    id: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: {
      thumbnail?: string;
    } | null;
  };
  replies?: DocumentCommentWithAuthor[];
}

/**
 * Extended note comment with author
 */
export interface NoteCommentWithAuthor extends NoteComment {
  author: {
    id: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: {
      thumbnail?: string;
    } | null;
  };
  replies?: NoteCommentWithAuthor[];
}

/**
 * Extended shared gallery with creator and photos
 */
export interface SharedGalleryWithDetails extends SharedGallery {
  creator: {
    id: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: {
      thumbnail?: string;
    } | null;
  };
  photos?: GalleryPhotoWithUploader[];
  photoCount?: number;
}

/**
 * Extended gallery photo with uploader
 */
export interface GalleryPhotoWithUploader extends GalleryPhoto {
  uploader: {
    id: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: {
      thumbnail?: string;
    } | null;
  };
}

/**
 * Extended activity feed item with actor
 */
export interface ActivityFeedItemWithActor extends ActivityFeedItem {
  actor: {
    id: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: {
      thumbnail?: string;
    } | null;
  };
  // Optional resource details based on resourceType
  resourceDetails?: FamilyDocumentWithDetails | FamilyNoteWithDetails | SharedGalleryWithDetails | FamilyMemberWithUser;
}

// ======================================================
// ================= API REQUEST TYPES =================
// ======================================================

/**
 * Base pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

/**
 * Create family member request
 */
export interface CreateFamilyMemberRequest {
  familyId: string;
  email: string;  // Email of user to invite
  role: FamilyMemberRole;
  message?: string;  // Optional invitation message
}

/**
 * Update family member request
 */
export interface UpdateFamilyMemberRequest {
  role?: FamilyMemberRole;
  status?: FamilyMemberStatus;
}

/**
 * Create family document request
 */
export interface CreateFamilyDocumentRequest {
  familyId: string;
  title: string;
  description?: string;
  type: FamilyDocumentType;
  residentId?: string;
  tags?: string[];
  acl?: ACLEntry[];
  metadata?: Record<string, any>;
  // File will be uploaded separately
}

/**
 * Update family document request
 */
export interface UpdateFamilyDocumentRequest {
  title?: string;
  description?: string;
  type?: FamilyDocumentType;
  residentId?: string;
  tags?: string[];
  acl?: ACLEntry[];
  metadata?: Record<string, any>;
}

/**
 * Create family note request
 */
export interface CreateFamilyNoteRequest {
  familyId: string;
  title: string;
  content: RichTextContent;
  residentId?: string;
  tags?: string[];
  acl?: ACLEntry[];
  metadata?: Record<string, any>;
}

/**
 * Update family note request
 */
export interface UpdateFamilyNoteRequest {
  title?: string;
  content?: RichTextContent;
  residentId?: string;
  tags?: string[];
  acl?: ACLEntry[];
  metadata?: Record<string, any>;
}

/**
 * Create document comment request
 */
export interface CreateDocumentCommentRequest {
  documentId: string;
  content: string;
  parentCommentId?: string;
}

/**
 * Create note comment request
 */
export interface CreateNoteCommentRequest {
  noteId: string;
  content: string;
  parentCommentId?: string;
}

/**
 * Create shared gallery request
 */
export interface CreateSharedGalleryRequest {
  familyId: string;
  title: string;
  description?: string;
  tags?: string[];
  acl?: ACLEntry[];
}

/**
 * Update shared gallery request
 */
export interface UpdateSharedGalleryRequest {
  title?: string;
  description?: string;
  coverPhotoUrl?: string;
  tags?: string[];
  acl?: ACLEntry[];
}

/**
 * Create gallery photo request
 */
export interface CreateGalleryPhotoRequest {
  galleryId: string;
  caption?: string;
  metadata?: Record<string, any>;
  sortOrder?: number;
  // File will be uploaded separately
}

/**
 * Update gallery photo request
 */
export interface UpdateGalleryPhotoRequest {
  caption?: string;
  metadata?: Record<string, any>;
  sortOrder?: number;
}

// ======================================================
// ================= API RESPONSE TYPES =================
// ======================================================

/**
 * Pagination data for API responses
 */
export interface PaginationData {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  nextCursor?: string;
}

/**
 * Family member response
 */
export type FamilyMemberResponse = FamilyMemberWithUser;

/**
 * Family document response
 */
export type FamilyDocumentResponse = FamilyDocumentWithDetails;

/**
 * Family note response
 */
export type FamilyNoteResponse = FamilyNoteWithDetails;

/**
 * Document comment response
 */
export type DocumentCommentResponse = DocumentCommentWithAuthor;

/**
 * Note comment response
 */
export type NoteCommentResponse = NoteCommentWithAuthor;

/**
 * Shared gallery response
 */
export type SharedGalleryResponse = SharedGalleryWithDetails;

/**
 * Gallery photo response
 */
export type GalleryPhotoResponse = GalleryPhotoWithUploader;

/**
 * Activity feed item response
 */
export type ActivityFeedItemResponse = ActivityFeedItemWithActor;

// ======================================================
// ================= UI COMPONENT TYPES =================
// ======================================================

/**
 * Props for document list component
 */
export interface DocumentListProps {
  familyId: string;
  residentId?: string;
  onDocumentClick?: (document: FamilyDocumentWithDetails) => void;
  onUploadClick?: () => void;
  onFilterChange?: (filters: DocumentFilterOptions) => void;
  emptyStateMessage?: string;
  showFilters?: boolean;
  initialFilters?: DocumentFilterOptions;
  isLoading?: boolean;
  error?: Error | null;
}

/**
 * Props for document viewer component
 */
export interface DocumentViewerProps {
  document: FamilyDocumentWithDetails;
  onClose?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onComment?: (comment: string, parentId?: string) => void;
  onDownload?: () => void;
  onShare?: () => void;
  showComments?: boolean;
  isLoading?: boolean;
  error?: Error | null;
}

/**
 * Props for note editor component
 */
export interface NoteEditorProps {
  note?: FamilyNoteWithDetails;
  familyId: string;
  residentId?: string;
  onSave?: (note: CreateFamilyNoteRequest | UpdateFamilyNoteRequest) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  error?: Error | null;
  readOnly?: boolean;
}

/**
 * Props for gallery component
 */
export interface GalleryProps {
  gallery: SharedGalleryWithDetails;
  onPhotoClick?: (photo: GalleryPhotoWithUploader) => void;
  onUploadClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  isLoading?: boolean;
  error?: Error | null;
}

/**
 * Props for activity feed component
 */
export interface ActivityFeedProps {
  familyId: string;
  residentId?: string;
  onActivityClick?: (activity: ActivityFeedItemWithActor) => void;
  onFilterChange?: (filters: ActivityFilterOptions) => void;
  limit?: number;
  showHeader?: boolean;
  showFilters?: boolean;
  isLoading?: boolean;
  error?: Error | null;
}

/**
 * Props for family member list component
 */
export interface FamilyMemberListProps {
  familyId: string;
  onMemberClick?: (member: FamilyMemberWithUser) => void;
  onInviteClick?: () => void;
  showRoles?: boolean;
  isLoading?: boolean;
  error?: Error | null;
}

// ======================================================
// ================= PERMISSION TYPES ===================
// ======================================================

/**
 * Permission types for access control
 */
export enum Permission {
  VIEW = 'view',
  EDIT = 'edit',
  DELETE = 'delete',
  SHARE = 'share',
  COMMENT = 'comment'
}

/**
 * Subject types for ACL entries
 */
export enum ACLSubjectType {
  USER = 'user',
  ROLE = 'role',
  PUBLIC = 'public'
}

/**
 * ACL entry structure
 */
export interface ACLEntry {
  subjectType: ACLSubjectType;
  subjectId: string;  // User ID or Role name
  permissions: Permission[];
}

/**
 * Helper interface for checking permissions
 */
export interface PermissionChecker {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canShare: boolean;
  canComment: boolean;
}

// ======================================================
// ================= FILE UPLOAD TYPES ==================
// ======================================================

/**
 * Supported file types for upload
 */
export enum SupportedFileType {
  PDF = 'application/pdf',
  DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  DOC = 'application/msword',
  XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  XLS = 'application/vnd.ms-excel',
  PPTX = 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  PPT = 'application/vnd.ms-powerpoint',
  JPG = 'image/jpeg',
  PNG = 'image/png',
  GIF = 'image/gif',
  MP4 = 'video/mp4',
  MOV = 'video/quicktime',
  TXT = 'text/plain'
}

/**
 * Family document upload interface for the upload process
 */
export interface FamilyDocumentUpload {
  familyId: string;
  title: string;
  description?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  file: File;
  type: DocumentType;
  isEncrypted: boolean;
  tags?: string[];
}

/**
 * File upload metadata
 */
export interface FileUploadMetadata {
  fileName: string;
  fileType: string;
  fileSize: number;
  contentType: string;
  lastModified?: number;
  metadata?: Record<string, any>;
}

/**
 * Presigned URL request
 */
export interface PresignedUrlRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
  contentType: string;
  path: string;  // Storage path
}

/**
 * Presigned URL response
 */
export interface PresignedUrlResponse {
  url: string;
  fields?: Record<string, string>;
  fileUrl: string;  // URL where the file will be accessible after upload
  expires: number;  // Timestamp when the URL expires
}

/**
 * File upload progress
 */
export interface FileUploadProgress {
  fileName: string;
  progress: number;  // 0-100
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  fileUrl?: string;
}

// ======================================================
// ================= RICH TEXT CONTENT ==================
// ======================================================

/**
 * Rich text content structure
 * Compatible with Slate.js / TipTap / ProseMirror
 */
export interface RichTextContent {
  type: 'doc' | 'slate' | 'html';
  content: any;  // JSON structure for doc/slate, string for HTML
  plainText?: string;  // Plain text version for search
  mentions?: Array<{
    id: string;
    type: 'user' | 'resident';
    name: string;
    range: [number, number];  // Start and end positions in plainText
  }>;
}

// ======================================================
// ================= FILTER & SEARCH TYPES ==============
// ======================================================

/**
 * Document filter parameters for API requests
 */
export interface DocumentFilterParams {
  familyId: string;
  page: number;
  limit: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'fileSize';
  sortOrder?: 'asc' | 'desc';
  type?: DocumentType | DocumentType[];
  status?: string;
  searchQuery?: string;
  tags?: string[];
  residentId?: string;
  uploaderId?: string;
}

/**
 * Document filter options
 */
export interface DocumentFilterOptions {
  search?: string;
  types?: FamilyDocumentType[];
  tags?: string[];
  residentId?: string;
  uploaderId?: string;
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'fileSize';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Note filter options
 */
export interface NoteFilterOptions {
  search?: string;
  tags?: string[];
  residentId?: string;
  authorId?: string;
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  sortBy?: 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Gallery filter options
 */
export interface GalleryFilterOptions {
  search?: string;
  tags?: string[];
  creatorId?: string;
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'photoCount';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Activity filter options
 */
export interface ActivityFilterOptions {
  search?: string;
  types?: ActivityType[];
  resourceTypes?: string[];
  actorId?: string;
  residentId?: string;
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  sortBy?: 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Family member filter options
 */
export interface FamilyMemberFilterOptions {
  search?: string;
  roles?: FamilyMemberRole[];
  status?: FamilyMemberStatus[];
  sortBy?: 'firstName' | 'lastName' | 'joinedAt' | 'role';
  sortOrder?: 'asc' | 'desc';
}

// ======================================================
// ================= HELPER FUNCTIONS ===================
// ======================================================

/**
 * Get display name for document type
 */
export function getDocumentTypeLabel(type: FamilyDocumentType): string {
  return DOCUMENT_TYPE_LABELS[type] || 'Document';
}

/**
 * Get file icon based on file type
 */
export function getFileIconByType(fileType: string): string {
  if (fileType.includes('pdf')) return 'pdf';
  if (fileType.includes('word') || fileType.includes('doc')) return 'doc';
  if (fileType.includes('sheet') || fileType.includes('excel') || fileType.includes('xls')) return 'xls';
  if (fileType.includes('presentation') || fileType.includes('powerpoint') || fileType.includes('ppt')) return 'ppt';
  if (fileType.includes('image') || fileType.includes('jpg') || fileType.includes('jpeg') || fileType.includes('png')) return 'image';
  if (fileType.includes('video')) return 'video';
  if (fileType.includes('text')) return 'txt';
  return 'file';
}

/**
 * Check if user has permission for an object with ACL
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
 * Get full permission checker for an object with ACL
 */
export function getPermissionChecker(
  userId: string, 
  userRoles: FamilyMemberRole[], 
  acl: ACLEntry[] | null | undefined
): PermissionChecker {
  return {
    canView: checkPermission(userId, userRoles, acl, Permission.VIEW),
    canEdit: checkPermission(userId, userRoles, acl, Permission.EDIT),
    canDelete: checkPermission(userId, userRoles, acl, Permission.DELETE),
    canShare: checkPermission(userId, userRoles, acl, Permission.SHARE),
    canComment: checkPermission(userId, userRoles, acl, Permission.COMMENT)
  };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
