export type DocumentType =
  | 'MEDICAL_RECORD'
  | 'INSURANCE_CARD'
  | 'ID_DOCUMENT'
  | 'CONTRACT'
  | 'FINANCIAL'
  | 'CARE_PLAN'
  | 'EMERGENCY_CONTACT'
  | 'OTHER';

export type ExtractionStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type ComplianceStatus =
  | 'PENDING'
  | 'COMPLIANT'
  | 'MISSING'
  | 'EXPIRED'
  | 'EXPIRING_SOON';

export interface Document {
  id: string;
  type: DocumentType;
  category?: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  extractedText?: string;
  extractedData?: any;
  extractionStatus: ExtractionStatus;
  extractionError?: string;
  isRequired: boolean;
  expirationDate?: Date;
  complianceStatus: ComplianceStatus;
  residentId?: string;
  inquiryId?: string;
  uploadedById: string;
  tags: string[];
  notes?: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  uploadedBy?: {
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
  INSURANCE_CARD: 'Insurance Card',
  ID_DOCUMENT: 'ID Document',
  CONTRACT: 'Contract',
  FINANCIAL: 'Financial Document',
  CARE_PLAN: 'Care Plan',
  EMERGENCY_CONTACT: 'Emergency Contact',
  OTHER: 'Other',
};

export const DOCUMENT_TYPE_COLORS: Record<DocumentType, string> = {
  MEDICAL_RECORD: 'bg-blue-100 text-blue-800',
  INSURANCE_CARD: 'bg-green-100 text-green-800',
  ID_DOCUMENT: 'bg-purple-100 text-purple-800',
  CONTRACT: 'bg-orange-100 text-orange-800',
  FINANCIAL: 'bg-yellow-100 text-yellow-800',
  CARE_PLAN: 'bg-pink-100 text-pink-800',
  EMERGENCY_CONTACT: 'bg-red-100 text-red-800',
  OTHER: 'bg-gray-100 text-gray-800',
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
