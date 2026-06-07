/**
 * src/lib/profile-generator/photo-rehost.ts
 *
 * Downloads operator marketing photos selected by the AI classifier and
 * re-hosts them on Cloudinary so CareLinkAI never hot-links the operator's
 * server. Used by the auto-populator (CLI) — server context, never the browser.
 *
 * Safety rules (Task 3):
 *  - Skip images > 4MB
 *  - Skip 404 / 403 silently
 *  - Skip anything that fails a basic image magic-byte decode check
 *  - Abort remaining downloads once the per-facility budget (90s) is exceeded
 */

import { createHash } from 'crypto';
import { uploadToCloudinary, isCloudinaryConfigured } from '@/lib/cloudinary';

const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4MB
const PER_IMAGE_TIMEOUT_MS = 20_000;
const PER_FACILITY_BUDGET_MS = 90_000;

const DOWNLOAD_USER_AGENT =
  'CareLinkAI Operator Profile Bot (profyt7@gmail.com) - re-hosting operator-published marketing photos';

export interface RehostCandidate {
  url: string;
  altText?: string | null;
}

export interface RehostedPhoto {
  cloudinaryUrl: string;
  publicId: string;
  sourceUrl: string;
  altText: string | null;
}

export interface RehostSkip {
  url: string;
  reason: string;
}

export interface RehostResult {
  uploaded: RehostedPhoto[];
  skipped: RehostSkip[];
  attempted: number;
}

/** Validate the first bytes look like a real raster image we can serve. */
function sniffImageType(buf: Buffer): 'jpeg' | 'png' | 'gif' | 'webp' | null {
  if (buf.length < 12) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return 'png';
  // GIF: "GIF8"
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return 'gif';
  // WEBP: "RIFF"...."WEBP"
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return 'webp';
  return null;
}

/** Stable Cloudinary public_id for a given source URL, so re-runs overwrite. */
function deterministicPublicId(sourceUrl: string): string {
  return createHash('sha256').update(sourceUrl).digest('hex').slice(0, 16);
}

/**
 * Download each candidate and re-host on Cloudinary under
 * "operator-profiles/seeded/{homeId}/". Returns successfully uploaded photos
 * plus a list of skips with reasons. Never throws for a single bad image.
 */
export async function downloadAndRehost(
  homeId: string,
  candidates: RehostCandidate[],
): Promise<RehostResult> {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured — cannot re-host photos');
  }

  const folder = `operator-profiles/seeded/${homeId}`;
  const uploaded: RehostedPhoto[] = [];
  const skipped: RehostSkip[] = [];
  const startedAt = Date.now();
  let attempted = 0;

  for (const candidate of candidates) {
    if (Date.now() - startedAt > PER_FACILITY_BUDGET_MS) {
      skipped.push({ url: candidate.url, reason: 'per-facility time budget exceeded' });
      continue;
    }

    attempted += 1;

    // Download
    let buffer: Buffer;
    try {
      const res = await fetch(candidate.url, {
        headers: { 'User-Agent': DOWNLOAD_USER_AGENT },
        signal: AbortSignal.timeout(PER_IMAGE_TIMEOUT_MS),
        redirect: 'follow',
      });

      if (res.status === 404 || res.status === 403 || res.status === 410 || res.status === 401) {
        skipped.push({ url: candidate.url, reason: `HTTP ${res.status}` });
        continue;
      }
      if (!res.ok) {
        skipped.push({ url: candidate.url, reason: `HTTP ${res.status}` });
        continue;
      }

      // Early size guard via Content-Length when present.
      const contentLength = Number(res.headers.get('content-length') ?? '0');
      if (contentLength && contentLength > MAX_IMAGE_BYTES) {
        skipped.push({ url: candidate.url, reason: `too large (${contentLength} bytes)` });
        continue;
      }

      const arrayBuf = await res.arrayBuffer();
      buffer = Buffer.from(arrayBuf);

      if (buffer.length > MAX_IMAGE_BYTES) {
        skipped.push({ url: candidate.url, reason: `too large (${buffer.length} bytes)` });
        continue;
      }
      if (buffer.length === 0) {
        skipped.push({ url: candidate.url, reason: 'empty response' });
        continue;
      }
    } catch (e: any) {
      const reason = e?.name === 'TimeoutError' || e?.name === 'AbortError'
        ? 'download timeout'
        : `download error: ${e?.message ?? e}`;
      skipped.push({ url: candidate.url, reason });
      continue;
    }

    // Decode / magic-byte check
    if (!sniffImageType(buffer)) {
      skipped.push({ url: candidate.url, reason: 'not a decodable image' });
      continue;
    }

    // Re-host on Cloudinary
    try {
      const publicId = deterministicPublicId(candidate.url);
      const result: any = await uploadToCloudinary(buffer, {
        folder,
        resourceType: 'image',
        publicId,
        transformation: [{ width: 1600, height: 1600, crop: 'limit', quality: 'auto' }],
      });
      const cloudinaryUrl = result?.secure_url || result?.url;
      if (!cloudinaryUrl) {
        skipped.push({ url: candidate.url, reason: 'cloudinary returned no url' });
        continue;
      }
      uploaded.push({
        cloudinaryUrl,
        publicId: result?.public_id ?? `${folder}/${publicId}`,
        sourceUrl: candidate.url,
        altText: candidate.altText ?? null,
      });
    } catch (e: any) {
      skipped.push({ url: candidate.url, reason: `cloudinary upload failed: ${e?.message ?? e}` });
    }
  }

  return { uploaded, skipped, attempted };
}
