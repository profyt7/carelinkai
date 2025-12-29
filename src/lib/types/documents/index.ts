export type DocumentType =
  | 'MEDICAL_RECORD'
  | 'INSURANCE'
  | 'IDENTIFICATION'
  | 'FINANCIAL'
  | 'LEGAL'
  | 'ASSESSMENT_FORM'
  | 'EMERGENCY_CONTACT'
  | 'GENERAL';

export type ExtractionStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type ValidationStatus = 'PENDING' | 'VALID' | 'INVALID' | 'NEEDS_REVIEW';

export type ReviewStatus = 'NOT_REQUIRED' | 'PENDING_REVIEW' | 'REVIEWED';

export type ComplianceStatus =
  | 'PENDING'
  | 'COMPLIANT'
  | 'MISSING'
  | 'EXPIRED'
  | 'EXPIRING_SOON';

export interface Document {
  id: string;
  type: DocumentType;
  category: string | null;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  extractedText: string | null;
  extractedData: any;
  extractionStatus: ExtractionStatus;
  extractionError: string | null;
  // Phase 3: Classification & Validation
  classificationConfidence: number | null;
  classificationReasoning: string | null;
  autoClassified: boolean;
  validationStatus: ValidationStatus;
  validationErrors: any;
  reviewStatus: ReviewStatus;
  reviewedById: string | null;
  reviewedAt: Date | null;
  // Compliance
  isRequired: boolean;
  expirationDate: Date | null;
  complianceStatus: ComplianceStatus;
  residentId: string | null;
  inquiryId: string | null;
  uploadedById: string;
  tags: string[];
  notes: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  uploadedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  reviewedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  resident?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  inquiry?: {
    id: string;
    contactName: string;
  };
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  MEDICAL_RECORD: 'Medical Record',
  INSURANCE: 'Insurance',
  IDENTIFICATION: 'Identification',
  FINANCIAL: 'Financial Document',
  LEGAL: 'Legal Document',
  ASSESSMENT_FORM: 'Assessment Form',
  EMERGENCY_CONTACT: 'Emergency Contact',
  GENERAL: 'General',
};

export const DOCUMENT_TYPE_COLORS: Record<DocumentType, string> = {
  MEDICAL_RECORD: 'bg-blue-100 text-blue-800',
  INSURANCE: 'bg-green-100 text-green-800',
  IDENTIFICATION: 'bg-purple-100 text-purple-800',
  FINANCIAL: 'bg-yellow-100 text-yellow-800',
  LEGAL: 'bg-orange-100 text-orange-800',
  ASSESSMENT_FORM: 'bg-pink-100 text-pink-800',
  EMERGENCY_CONTACT: 'bg-red-100 text-red-800',
  GENERAL: 'bg-gray-100 text-gray-800',
};

export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

export function getFileIcon(mimeType: string): string {
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType.startsWith('image/')) return '🖼️';
  return '📎';
}

// Phase 3: Classification & Validation Types

export interface ClassificationResult {
  success: boolean;
  type?: DocumentType;
  confidence?: number;
  reasoning?: string;
  category?: string;
  error?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  success: boolean;
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface DocumentClassificationData {
  documentType: DocumentType;
  confidence: number;
  reasoning: string;
  autoClassified: boolean;
  reviewStatus: ReviewStatus;
}

export interface DocumentValidationData {
  validationStatus: ValidationStatus;
  validationErrors: ValidationError[];
}
