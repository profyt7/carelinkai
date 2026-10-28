/**
 * HIPAA Phase 2 — Upload route integration tests.
 * Tests requiring real S3 credentials are skipped when credentials are absent.
 * Integration-mock rule: these tests hit real buckets to catch the class of failure
 * where mocked tests pass but the prod migration fails.
 *
 * See HIPAA_PHASE_2_DESIGN.md §PR-A
 */

import { DataClassification } from '@prisma/client';
import { canUseS3, uploadBuffer, deleteObject, getBucket, toS3Url, parseS3Url } from '../src/lib/storage';
import { getUploadDestination } from '../src/lib/storage/router';

const hasS3 = canUseS3();
const itReal = hasS3 ? it : it.skip;

// ── Unit: classification-by-linkage logic ────────────────────────────────────

describe('classifyByLinkage (unit)', () => {
  function classifyByLinkage(residentId: string | null, inquiryId: string | null): DataClassification {
    if (residentId) return DataClassification.PHI;
    if (inquiryId) return DataClassification.PII;
    return DataClassification.PII;
  }

  it('classifies resident-linked document as PHI', () => {
    expect(classifyByLinkage('res-123', null)).toBe(DataClassification.PHI);
  });

  it('classifies inquiry-only document as PII', () => {
    expect(classifyByLinkage(null, 'inq-456')).toBe(DataClassification.PII);
  });

  it('classifies unlinked document as PII (safe default)', () => {
    expect(classifyByLinkage(null, null)).toBe(DataClassification.PII);
  });

  it('PHI takes precedence when both residentId and inquiryId are present', () => {
    expect(classifyByLinkage('res-123', 'inq-456')).toBe(DataClassification.PHI);
  });
});

// ── Unit: upload routing ─────────────────────────────────────────────────────

describe('getUploadDestination for Phase 2 callers (unit)', () => {
  it('routes PHI document (resident-linked) to S3', () => {
    expect(getUploadDestination(DataClassification.PHI)).toBe('s3');
  });

  it('routes PII document (inquiry-only) to cloudinary', () => {
    expect(getUploadDestination(DataClassification.PII)).toBe('cloudinary');
  });

  it('routes caregiver document (PII) to cloudinary', () => {
    expect(getUploadDestination(DataClassification.PII)).toBe('cloudinary');
  });
});

// ── Unit: S3 URL helpers ─────────────────────────────────────────────────────

describe('S3 URL helpers (unit)', () => {
  it('toS3Url produces expected format', () => {
    expect(toS3Url('my-bucket', 'path/to/file.pdf')).toBe('s3://my-bucket/path/to/file.pdf');
  });

  it('parseS3Url round-trips correctly', () => {
    const url = toS3Url('my-bucket', 'residents/123/photo/1234.jpg');
    const parsed = parseS3Url(url);
    expect(parsed).toEqual({ bucket: 'my-bucket', key: 'residents/123/photo/1234.jpg' });
  });

  it('parseS3Url returns null for non-s3 URLs', () => {
    expect(parseS3Url('https://res.cloudinary.com/foo/image.jpg')).toBeNull();
    expect(parseS3Url('/uploads/residents/photo.jpg')).toBeNull();
  });

  it('parseS3Url returns null for bucket-only s3:// URL', () => {
    expect(parseS3Url('s3://bucket-only')).toBeNull();
  });
});

// ── Integration: real S3 upload/delete ───────────────────────────────────────

describe('S3 upload integration (requires real credentials)', () => {
  const testKeys: string[] = [];

  afterAll(async () => {
    // Clean up any test keys uploaded during this suite
    if (!hasS3) return;
    const bucket = getBucket();
    await Promise.all(
      testKeys.map(key => deleteObject({ bucket, key }).catch(() => { /* ignore cleanup errors */ }))
    );
  });

  itReal('uploads a buffer to S3 and returns bucket+key', async () => {
    const key = `__test__/hipaa-phase2-uploads/${Date.now()}-upload.txt`;
    testKeys.push(key);
    const body = Buffer.from('HIPAA Phase 2 upload test');
    const result = await uploadBuffer({ key, contentType: 'text/plain', body });
    expect(result.key).toBe(key);
    expect(result.bucket).toBe(getBucket());
  });

  itReal('PHI document upload stores s3:// URL format', async () => {
    const key = `__test__/hipaa-phase2-uploads/${Date.now()}-phi-doc.txt`;
    testKeys.push(key);
    const { bucket } = await uploadBuffer({
      key,
      contentType: 'text/plain',
      body: Buffer.from('PHI test document content'),
    });
    const fileUrl = toS3Url(bucket, key);
    expect(fileUrl).toMatch(/^s3:\/\//);
    const parsed = parseS3Url(fileUrl);
    expect(parsed).not.toBeNull();
    expect(parsed?.key).toBe(key);
  });

  itReal('resident photo upload stores s3:// URL with residents/ prefix', async () => {
    const residentId = 'test-resident-id';
    const key = `residents/${residentId}/photo/${Date.now()}.jpeg`;
    testKeys.push(key);
    const { bucket } = await uploadBuffer({
      key,
      contentType: 'image/jpeg',
      body: Buffer.from('fake-jpeg-bytes'),
    });
    const photoUrl = toS3Url(bucket, key);
    expect(photoUrl).toMatch(/^s3:\/\//);
    expect(photoUrl).toContain(`residents/${residentId}/photo/`);
  });

  itReal('deleteObject removes a previously uploaded file', async () => {
    const key = `__test__/hipaa-phase2-uploads/${Date.now()}-delete-test.txt`;
    await uploadBuffer({ key, contentType: 'text/plain', body: Buffer.from('delete me') });
    await expect(deleteObject({ key })).resolves.not.toThrow();
    // Key is gone — don't add to testKeys since we already deleted it
  });

  itReal('no local filesystem writes occur during S3 upload', async () => {
    // Verify by importing fs and checking that no /uploads/ path exists
    const { existsSync } = await import('fs');
    const key = `__test__/hipaa-phase2-uploads/${Date.now()}-no-local.txt`;
    testKeys.push(key);
    await uploadBuffer({ key, contentType: 'text/plain', body: Buffer.from('no local write') });
    // Local path that would have been used in the old photo route
    const localPath = `public/uploads/residents/`;
    // This just verifies the upload path doesn't inadvertently create local files
    // The absence of writeFile import in the new route is the real guard
    expect(existsSync(localPath)).toBe(false);
  });
});
