import { createSignedGetUrl, parseS3Url } from '@/lib/storage';

const DEFAULT_PRESIGN_TTL = 300; // 5 minutes

/**
 * Resolve a stored file URL into a usable download URL.
 *
 * - S3 (storage='s3' or fileUrl starts with 's3://') → presigned GET URL (TTL: expiresIn seconds)
 * - Cloudinary (storage='cloudinary' or URL contains cloudinary.com) → URL returned as-is
 * - Legacy/null storage → inferred from URL pattern: s3:// → presign, otherwise return as-is
 *
 * `createSignedGetUrl` is a local cryptographic operation (no network call),
 * so calling this in Promise.all() over a list is safe and fast.
 *
 * AUTHZ GATE: This function must only be called after the per-resource authorization
 * check has passed. Do NOT expose it via a generic "presign any key" endpoint.
 */
export async function getDownloadUrl(opts: {
  storage?: string | null;
  fileUrl: string;
  expiresIn?: number;
}): Promise<string> {
  const { storage, fileUrl, expiresIn = DEFAULT_PRESIGN_TTL } = opts;

  const isS3 = storage === 's3' || fileUrl.startsWith('s3://');
  const isCloudinary =
    storage === 'cloudinary' || fileUrl.includes('cloudinary.com');

  if (isS3) {
    const parsed = parseS3Url(fileUrl);
    if (!parsed) {
      throw new Error(`getDownloadUrl: cannot parse S3 URL: ${fileUrl}`);
    }
    return createSignedGetUrl({ bucket: parsed.bucket, key: parsed.key, expiresIn });
  }

  if (isCloudinary) {
    return fileUrl;
  }

  // Legacy: storage column is null — infer from URL
  if (fileUrl.startsWith('s3://')) {
    const parsed = parseS3Url(fileUrl);
    if (!parsed) {
      throw new Error(`getDownloadUrl: cannot parse legacy S3 URL: ${fileUrl}`);
    }
    return createSignedGetUrl({ bucket: parsed.bucket, key: parsed.key, expiresIn });
  }

  // Cloudinary URL or any other HTTP URL — return as-is
  return fileUrl;
}
