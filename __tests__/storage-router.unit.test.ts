/**
 * Unit tests for HIPAA Phase 1 storage router.
 * Verifies getUploadDestination routes PHI → S3, PUBLIC/PII → Cloudinary.
 * See HIPAA_PHASE_1_DESIGN.md §2.1, CARELINKAI_RISK_REGISTER.md#risk-1
 */
import { DataClassification } from '@prisma/client';
import { getUploadDestination } from '../src/lib/storage/router';

describe('getUploadDestination', () => {
  it('routes PHI to s3', () => {
    expect(getUploadDestination(DataClassification.PHI)).toBe('s3');
  });

  it('routes PUBLIC to cloudinary', () => {
    expect(getUploadDestination(DataClassification.PUBLIC)).toBe('cloudinary');
  });

  it('routes PII to cloudinary', () => {
    expect(getUploadDestination(DataClassification.PII)).toBe('cloudinary');
  });

  it('never routes PHI to cloudinary', () => {
    expect(getUploadDestination(DataClassification.PHI)).not.toBe('cloudinary');
  });

  it('never routes PUBLIC to s3', () => {
    expect(getUploadDestination(DataClassification.PUBLIC)).not.toBe('s3');
  });

  it('never routes PII to s3', () => {
    expect(getUploadDestination(DataClassification.PII)).not.toBe('s3');
  });
});
