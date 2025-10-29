// Simple in-memory rate limiter per key using a sliding window.
// Note: Works for single-process dev/preview. For production, we also support Redis (ioredis) fixed-window limiter.

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

// Synchronous in-memory limiter (sliding window)
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

// Optional Redis client via ioredis (use REDIS_URL / UPSTASH style URLs)
let redisClient: any | null = null;
function getRedis() {
  try {
    if (redisClient) return redisClient;
    const url = process.env['REDIS_URL'] || process.env['UPSTASH_REDIS_URL'] || '';
    if (!url) return null;
    // Lazy require to avoid bundling in edge runtimes that don't need it
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const IORedis = require('ioredis');
    redisClient = new IORedis(url, {
      tls: url.startsWith('rediss://') ? {} : undefined,
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      lazyConnect: true,
    });
    // Connect on first use; ignore errors and fallback to memory
    redisClient.on('error', () => {});
    return redisClient;
  } catch {
    return null;
  }
}

// Async rate limit using Redis fixed window when available, else memory
export async function rateLimitAsync(opts: RateLimitOptions): Promise<RateLimitResult> {
  const { name, key, limit, windowMs } = opts;
  const redis = getRedis();
  if (!redis) {
    return rateLimit(opts);
  }

  const now = Date.now();
  const windowKey = Math.floor(now / windowMs);
  const redisKey = `rl:${name}:${key}:${windowKey}`;
  try {
    // INCR and set TTL if first hit
    const count: number = await redis.incr(redisKey);
    if (count === 1) {
      await redis.pexpire(redisKey, windowMs);
    }
    const ttlMs: number = await redis.pttl(redisKey);
    const remaining = Math.max(0, limit - count);
    if (count > limit) {
      return { allowed: false, remaining: 0, resetMs: Math.max(0, ttlMs) };
    }
    return { allowed: true, remaining, resetMs: Math.max(0, ttlMs) };
  } catch {
    // On any Redis error, fallback to in-memory
    return rateLimit(opts);
  }
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

// Helper to build standard rate limit headers
export function buildRateLimitHeaders(result: RateLimitResult, limit: number): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(Math.max(0, result.remaining)),
    'X-RateLimit-Reset': String(Math.ceil(result.resetMs / 1000)),
  };
}
