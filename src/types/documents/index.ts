/**
 * Type definitions for Feature #6: Smart Document Processing
 */

import { Document, DocumentTemplate, DocumentType, ExtractionStatus, ComplianceStatus } from '@prisma/client';

// Extended Document type with relations
export interface DocumentWithRelations extends Document {
  resident?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  inquiry?: {
    id: string;
    contactName?: string | null;
  };
  uploadedBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

// Document upload request
export interface DocumentUploadRequest {
  file: File;
  type?: DocumentType;
  residentId?: string;
  inquiryId?: string;
  tags?: string[];
  notes?: string;
}

// Document upload response
export interface DocumentUploadResponse {
  success: boolean;
  document?: Document;
  error?: string;
}

// Extracted field with confidence score
export interface ExtractedField {
  value: string | number | Date | null;
  confidence: number;
  source?: string; // Where the data was extracted from
}

// Extracted data structure
export interface ExtractedData {
  [key: string]: ExtractedField;
}

// OCR extraction result
export interface OCRExtractionResult {
  success: boolean;
  extractedText?: string;
  confidence?: number;
  error?: string;
}

// AI field extraction result
export interface AIExtractionResult {
  success: boolean;
  extractedData?: ExtractedData;
  error?: string;
}

// Document classification result
export interface ClassificationResult {
  success: boolean;
  type?: DocumentType;
  category?: string;
  confidence?: number;
  error?: string;
}

// Compliance check result
export interface ComplianceCheckResult {
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIAL';
  required: number;
  completed: number;
  missing: Array<{
    type: DocumentType;
    description: string;
  }>;
  expiring: Array<{
    id: string;
    type: DocumentType;
    fileName: string;
    expirationDate: Date;
    daysUntilExpiration: number;
  }>;
}

// Document search filters
export interface DocumentSearchFilters {
  query?: string;
  type?: DocumentType[];
  residentId?: string;
  inquiryId?: string;
  complianceStatus?: ComplianceStatus[];
  tags?: string[];
  startDate?: Date;
  endDate?: Date;
}

// Document generation request
export interface DocumentGenerationRequest {
  templateId: string;
  residentId?: string;
  inquiryId?: string;
  data?: Record<string, any>;
}

// Document generation response
export interface DocumentGenerationResponse {
  success: boolean;
  document?: Document;
  error?: string;
}

// File validation result
export interface FileValidationResult {
  valid: boolean;
  error?: string;
  errorCode?: 'INVALID_TYPE' | 'FILE_TOO_LARGE' | 'INVALID_NAME';
}

// Supported file types
export const SUPPORTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
} as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Document type labels
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  MEDICAL_RECORD: 'Medical Record',
  INSURANCE_CARD: 'Insurance Card',
  ID_DOCUMENT: 'ID Document',
  CONTRACT: 'Contract',
  FINANCIAL: 'Financial Document',
  CARE_PLAN: 'Care Plan',
  EMERGENCY_CONTACT: 'Emergency Contact',
  OTHER: 'Other',
};

// Compliance status labels
export const COMPLIANCE_STATUS_LABELS: Record<ComplianceStatus, string> = {
  PENDING: 'Pending Review',
  COMPLIANT: 'Compliant',
  MISSING: 'Missing',
  EXPIRED: 'Expired',
  EXPIRING_SOON: 'Expiring Soon',
};

// Extraction status labels
export const EXTRACTION_STATUS_LABELS: Record<ExtractionStatus, string> = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
};
