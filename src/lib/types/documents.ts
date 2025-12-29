/**
 * Document-related type definitions
 */

import { 
  DocumentType as PrismaDocumentType, 
  ValidationStatus as PrismaValidationStatus,
  ReviewStatus as PrismaReviewStatus 
} from '@prisma/client';

// Re-export Prisma types
export type DocumentType = PrismaDocumentType;
export type ValidationStatus = PrismaValidationStatus;
export type ReviewStatus = PrismaReviewStatus;

export interface ComplianceCheckResult {
  compliant?: boolean;
  status?: string;
  required?: number;
  completed?: number;
  missing?: Array<{
    type: string;
    description?: string;
  }>;
  expiring?: Array<{
    id: string;
    type: string;
    fileName: string;
    expirationDate: Date;
    daysUntilExpiration: number;
  }>;
  missingDocuments?: string[];
  expiringDocuments?: Array<{
    type: string;
    expiryDate: Date;
  }>;
  warnings?: string[];
}

export interface DocumentGenerationRequest {
  residentId: string;
  type: string;
  templateId?: string;
  data: Record<string, any>;
}

export interface DocumentGenerationResponse {
  success: boolean;
  documentId?: string;
  url?: string;
  error?: string;
}

export interface DocumentClassificationResult {
  type: string;
  category: string;
  confidence: number;
  reasoning: string;
}

export interface ClassificationResult {
  success: boolean;
  type?: string;
  category?: string;
  confidence?: number;
  reasoning?: string;
  error?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  success: boolean;
  valid: boolean;
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface DocumentProcessingResult {
  success: boolean;
  documentId: string;
  classified: boolean;
  valid: boolean;
  requiresReview: boolean;
  validationErrors?: ValidationError[];
  error?: string;
}
