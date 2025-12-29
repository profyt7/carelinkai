/**
 * Document validation service
 * Phase 3: Smart Document Processing
 * 
 * Validates document content based on document type
 */

import {
  DocumentType,
  ValidationResult,
  ValidationError,
  ValidationStatus,
} from '@/lib/types/documents';

/**
 * Validate document based on its type and extracted data
 */
export async function validateDocument(
  documentType: DocumentType,
  extractedText: string,
  extractedData?: any
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Basic validation - ensure we have text
  if (!extractedText || extractedText.trim().length < 10) {
    errors.push({
      field: 'content',
      message: 'Document has insufficient readable text content',
      severity: 'error',
    });
    
    return {
      success: true,
      isValid: false,
      errors,
      warnings,
    };
  }

  // Type-specific validation
  switch (documentType) {
    case 'MEDICAL_RECORD':
      validateMedicalRecord(extractedText, extractedData, errors, warnings);
      break;
    case 'INSURANCE':
      validateInsurance(extractedText, extractedData, errors, warnings);
      break;
    case 'IDENTIFICATION':
      validateIdentification(extractedText, extractedData, errors, warnings);
      break;
    case 'FINANCIAL':
      validateFinancial(extractedText, extractedData, errors, warnings);
      break;
    case 'LEGAL':
      validateLegal(extractedText, extractedData, errors, warnings);
      break;
    case 'ASSESSMENT_FORM':
      validateAssessmentForm(extractedText, extractedData, errors, warnings);
      break;
    case 'EMERGENCY_CONTACT':
      validateEmergencyContact(extractedText, extractedData, errors, warnings);
      break;
    case 'GENERAL':
      // General documents have minimal validation
      validateGeneral(extractedText, errors, warnings);
      break;
  }

  return {
    success: true,
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate medical record
 */
function validateMedicalRecord(
  text: string,
  data: any,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  // Check for patient name
  if (!hasName(text)) {
    warnings.push({
      field: 'patientName',
      message: 'Patient name may be missing or unclear',
      severity: 'warning',
    });
  }

  // Check for dates
  if (!hasDate(text)) {
    warnings.push({
      field: 'date',
      message: 'Document date may be missing',
      severity: 'warning',
    });
  }

  // Check for medical terms/context
  const medicalKeywords = ['patient', 'doctor', 'diagnosis', 'treatment', 'medical', 'health', 'condition', 'medication'];
  if (!hasAnyKeyword(text, medicalKeywords)) {
    warnings.push({
      field: 'content',
      message: 'Document may not contain medical information',
      severity: 'warning',
    });
  }
}

/**
 * Validate insurance document
 */
function validateInsurance(
  text: string,
  data: any,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  // Check for policy/member number
  const hasNumber = /\b[\dA-Z]{6,}\b/.test(text);
  if (!hasNumber) {
    warnings.push({
      field: 'policyNumber',
      message: 'Policy or member number may be missing',
      severity: 'warning',
    });
  }

  // Check for insurance keywords
  const insuranceKeywords = ['insurance', 'policy', 'member', 'coverage', 'plan', 'premium', 'beneficiary'];
  if (!hasAnyKeyword(text, insuranceKeywords)) {
    errors.push({
      field: 'content',
      message: 'Document does not appear to be an insurance document',
      severity: 'error',
    });
  }

  // Check for dates
  if (!hasDate(text)) {
    warnings.push({
      field: 'date',
      message: 'Effective date or expiration date may be missing',
      severity: 'warning',
    });
  }
}

/**
 * Validate identification document
 */
function validateIdentification(
  text: string,
  data: any,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  // Check for name
  if (!hasName(text)) {
    errors.push({
      field: 'name',
      message: 'Name is missing or unclear',
      severity: 'error',
    });
  }

  // Check for ID number
  const hasIDNumber = /\b[\dA-Z]{5,}\b/.test(text);
  if (!hasIDNumber) {
    warnings.push({
      field: 'idNumber',
      message: 'ID number may be missing',
      severity: 'warning',
    });
  }

  // Check for date of birth or issue/expiration date
  if (!hasDate(text)) {
    warnings.push({
      field: 'date',
      message: 'Date of birth or expiration date may be missing',
      severity: 'warning',
    });
  }

  // Check for ID keywords
  const idKeywords = ['license', 'passport', 'identification', 'id', 'birth', 'issued', 'expires'];
  if (!hasAnyKeyword(text, idKeywords)) {
    warnings.push({
      field: 'content',
      message: 'Document may not be a valid identification document',
      severity: 'warning',
    });
  }
}

/**
 * Validate financial document
 */
function validateFinancial(
  text: string,
  data: any,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  // Check for amounts/currency
  const hasAmount = /\$[\d,]+\.?\d*/i.test(text) || /\d+\.\d{2}/.test(text);
  if (!hasAmount) {
    warnings.push({
      field: 'amount',
      message: 'Financial amounts may be missing',
      severity: 'warning',
    });
  }

  // Check for dates
  if (!hasDate(text)) {
    warnings.push({
      field: 'date',
      message: 'Transaction or statement date may be missing',
      severity: 'warning',
    });
  }

  // Check for financial keywords
  const financialKeywords = ['account', 'balance', 'payment', 'transaction', 'bank', 'statement', 'invoice', 'amount'];
  if (!hasAnyKeyword(text, financialKeywords)) {
    warnings.push({
      field: 'content',
      message: 'Document may not contain financial information',
      severity: 'warning',
    });
  }
}

/**
 * Validate legal document
 */
function validateLegal(
  text: string,
  data: any,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  // Check for names (usually multiple parties)
  if (!hasName(text)) {
    warnings.push({
      field: 'names',
      message: 'Party names may be missing',
      severity: 'warning',
    });
  }

  // Check for dates
  if (!hasDate(text)) {
    warnings.push({
      field: 'date',
      message: 'Document date or effective date may be missing',
      severity: 'warning',
    });
  }

  // Check for legal keywords
  const legalKeywords = ['agreement', 'contract', 'attorney', 'power', 'legal', 'hereby', 'witness', 'signature', 'party'];
  if (!hasAnyKeyword(text, legalKeywords)) {
    warnings.push({
      field: 'content',
      message: 'Document may not be a legal document',
      severity: 'warning',
    });
  }
}

/**
 * Validate assessment form
 */
function validateAssessmentForm(
  text: string,
  data: any,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  // Check for name
  if (!hasName(text)) {
    warnings.push({
      field: 'name',
      message: 'Resident/patient name may be missing',
      severity: 'warning',
    });
  }

  // Check for dates
  if (!hasDate(text)) {
    warnings.push({
      field: 'date',
      message: 'Assessment date may be missing',
      severity: 'warning',
    });
  }

  // Check for assessment keywords
  const assessmentKeywords = ['assessment', 'evaluation', 'score', 'intake', 'form', 'questionnaire', 'care', 'needs'];
  if (!hasAnyKeyword(text, assessmentKeywords)) {
    warnings.push({
      field: 'content',
      message: 'Document may not be an assessment form',
      severity: 'warning',
    });
  }
}

/**
 * Validate emergency contact document
 */
function validateEmergencyContact(
  text: string,
  data: any,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  // Check for names
  if (!hasName(text)) {
    errors.push({
      field: 'name',
      message: 'Contact name is missing',
      severity: 'error',
    });
  }

  // Check for phone number
  if (!hasPhone(text)) {
    errors.push({
      field: 'phone',
      message: 'Phone number is missing or invalid',
      severity: 'error',
    });
  }

  // Check for contact/emergency keywords
  const contactKeywords = ['contact', 'emergency', 'phone', 'call', 'relationship', 'notify'];
  if (!hasAnyKeyword(text, contactKeywords)) {
    warnings.push({
      field: 'content',
      message: 'Document may not contain emergency contact information',
      severity: 'warning',
    });
  }
}

/**
 * Validate general document
 */
function validateGeneral(
  text: string,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  // Minimal validation for general documents
  if (text.trim().length < 50) {
    warnings.push({
      field: 'content',
      message: 'Document has very limited content',
      severity: 'warning',
    });
  }
}

// Helper functions

/**
 * Check if text contains a name pattern
 */
function hasName(text: string): boolean {
  // Look for capitalized words that might be names
  const namePattern = /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/;
  return namePattern.test(text);
}

/**
 * Check if text contains a date pattern
 */
function hasDate(text: string): boolean {
  // Various date formats
  const datePatterns = [
    /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/, // MM/DD/YYYY or MM-DD-YYYY
    /\b\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\b/, // YYYY/MM/DD or YYYY-MM-DD
    /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/i, // Month DD, YYYY
  ];
  
  return datePatterns.some(pattern => pattern.test(text));
}

/**
 * Check if text contains a phone number
 */
function hasPhone(text: string): boolean {
  // Phone number patterns
  const phonePattern = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  return phonePattern.test(text);
}

/**
 * Check if text contains any of the given keywords
 */
function hasAnyKeyword(text: string, keywords: string[]): boolean {
  const lowerText = text.toLowerCase();
  return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

/**
 * Get validation status based on errors
 */
export function getValidationStatus(
  errors: ValidationError[],
  warnings: ValidationError[]
): ValidationStatus {
  if (errors.length > 0) {
    return 'INVALID';
  }
  
  if (warnings.length > 3) {
    return 'NEEDS_REVIEW';
  }
  
  if (warnings.length > 0) {
    return 'NEEDS_REVIEW';
  }
  
  return 'VALID';
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) {
    return 'No validation errors';
  }
  
  return errors
    .map(error => `${error.field}: ${error.message}`)
    .join('; ');
}
