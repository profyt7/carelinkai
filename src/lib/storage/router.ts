import { DataClassification } from '@prisma/client';

export type UploadDestination = 's3' | 'cloudinary';

/**
 * Determine upload destination by HIPAA data classification.
 * PHI must go to S3 (AWS BAA-covered bucket carelinkai-prod-phi).
 * PUBLIC and PII go to Cloudinary (no BAA required).
 *
 * See: HIPAA_PHASE_1_DESIGN.md §2.1, CARELINKAI_RISK_REGISTER.md#risk-1
 */
export function getUploadDestination(
  classification: DataClassification
): UploadDestination {
  return classification === DataClassification.PHI ? 's3' : 'cloudinary';
}
