/**
 * Simple rate limiting utility with Redis (multi-instance) fallback to in-memory
 *
 * Limits requests per identifier (typically IP address) within a time interval.
 */

interface RateLimitOptions {
  interval: number;  // Time window in milliseconds
  limit: number;     // Maximum number of requests allowed in the interval
  uniqueTokenPerInterval?: number; // Max number of unique tokens to track (in-memory only)
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Use a single, process-wide cleanup interval for in-memory fallback to avoid
// leaking multiple timers across imports/tests. The timer is unref()'d so it
// won't keep the Node.js process alive.
let __inMemoryCleanupInterval__: NodeJS.Timeout | undefined;

export function rateLimit(options: RateLimitOptions) {
  const { interval, limit, uniqueTokenPerInterval = 500 } = options;

  // Try Redis (multi-instance safe); fallback to in-memory Map
  let RedisCtor: any = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    RedisCtor = require('ioredis');
  } catch {
    RedisCtor = null;
  }

  const redisUrl = process.env['REDIS_URL'] || process.env['REDIS_TLS_URL'] || '';
  const g = globalThis as any;
  if (RedisCtor && redisUrl) {
    if (!g.__carelinkai_redis__) {
      g.__carelinkai_redis__ = new RedisCtor(redisUrl, {
        lazyConnect: false,
        maxRetriesPerRequest: 2,
      });
    }
  }
  const redis: any = g.__carelinkai_redis__ || null;

  // In-memory store for single-instance fallback
  const tokenCache: Map<string, RateLimitEntry> = new Map();

  // Cleanup function to prevent memory leaks
  const cleanup = () => {
    const now = Date.now();
    for (const [key, value] of tokenCache.entries()) {
      if (now > value.resetTime) tokenCache.delete(key);
    }
  };

  if (!redis) {
    // Run cleanup every interval only when using in-memory fallback
    if (!__inMemoryCleanupInterval__) {
      __inMemoryCleanupInterval__ = setInterval(cleanup, interval);
      // Do not keep the process alive because of this timer (important for Jest/CI)
      if (typeof __inMemoryCleanupInterval__.unref === 'function') {
        __inMemoryCleanupInterval__.unref();
      }
    }
  }

  return {
    /**
     * Check if the rate limit has been exceeded
     * @param limitOverride Optional override for the default limit
     * @param token Unique identifier (usually IP address, include a route prefix like "fp:")
     */
    check: async (limitOverride: number = limit, token: string): Promise<void> => {
      if (redis) {
        const key = 'rl:' + token;
        const current = await redis.incr(key);
        if (current === 1) {
          const ttlSec = Math.ceil(interval / 1000);
          await redis.expire(key, ttlSec);
        }
        if (current > limitOverride) {
          throw new Error('Rate limit exceeded');
        }
        return;
      }

      // Fallback to in-memory per-process limiter
      if (tokenCache.size >= uniqueTokenPerInterval) cleanup();

      const now = Date.now();
      const entry = tokenCache.get(token) || { count: 0, resetTime: now + interval };
      if (now > entry.resetTime) {
        entry.count = 0;
        entry.resetTime = now + interval;
      }
      if (entry.count >= limitOverride) throw new Error('Rate limit exceeded');
      entry.count++;
      tokenCache.set(token, entry);
    },

    getUsage: async (token: string) => {
      if (redis) {
        const key = 'rl:' + token;
        const [countStr, ttl] = await Promise.all([
          redis.get(key),
          redis.ttl(key),
        ]);
        const count = countStr ? parseInt(countStr, 10) : 0;
        return { count, limit, remaining: Math.max(0, ttl * 1000), resetIn: Math.max(0, ttl * 1000) };
      }

      const entry = tokenCache.get(token);
      if (!entry) return null;
      const now = Date.now();
      const remaining = Math.max(0, entry.resetTime - now);
      return { count: entry.count, limit, remaining, resetIn: remaining };
    },
  };
}