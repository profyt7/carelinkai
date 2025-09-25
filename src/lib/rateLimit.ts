// Simple in-memory rate limiter per key using a sliding window.
// Note: Works for single-process dev/preview. For production, use a shared store (e.g., Redis/Upstash).

type Bucket = {
  windowMs: number;
  limit: number;
  hits: number[]; // epoch ms timestamps
};

// Global map keyed by `${name}:${key}`
const buckets: Map<string, Bucket> = new Map();

export type RateLimitOptions = {
  /** Unique limiter name per route or purpose */
  name: string;
  /** Unique key (e.g., userId or IP) */
  key: string;
  /** Max requests within window */
  limit: number;
  /** Window size in ms */
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetMs: number; // time until reset in ms
};

export function rateLimit(opts: RateLimitOptions): RateLimitResult {
  const { name, key, limit, windowMs } = opts;
  const now = Date.now();
  const bucketKey = `${name}:${key}`;
  let bucket = buckets.get(bucketKey);
  if (!bucket) {
    bucket = { windowMs, limit, hits: [] };
    buckets.set(bucketKey, bucket);
  }

  // Drop hits older than window
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);

  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0] ?? now;
    const resetMs = Math.max(0, windowMs - (now - oldest));
    return { allowed: false, remaining: 0, resetMs };
  }

  bucket.hits.push(now);
  const remaining = Math.max(0, limit - bucket.hits.length);
  const oldest = bucket.hits[0] ?? now;
  const resetMs = Math.max(0, windowMs - (now - oldest));
  return { allowed: true, remaining, resetMs };
}

export function getClientIp(req: Request): string {
  try {
    // App Router Request has headers.get
    const fwd = req.headers.get('x-forwarded-for');
    if (typeof fwd === 'string' && fwd.length > 0) {
      const first = (fwd.split(',')[0] ?? fwd).trim();
      if (first) return first;
    }
    const realIp = req.headers.get('x-real-ip');
    if (typeof realIp === 'string' && realIp.length > 0) {
      return realIp.trim();
    }
  } catch {}
  return 'unknown';
}
