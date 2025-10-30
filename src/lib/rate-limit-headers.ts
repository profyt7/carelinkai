// Helper to produce standard rate limit headers from limiter usage
// Assumptions:
// - limiter.getUsage(key) returns { count, limit, remaining, resetIn } where resetIn is ms until reset

export async function buildRateLimitHeaders(limiter: any, key: string, defaultWindowMs: number, limit: number) {
  try {
    const usage = await limiter.getUsage(key);
    const resetSec = usage ? Math.ceil(((usage.resetIn ?? defaultWindowMs) as number) / 1000) : Math.ceil(defaultWindowMs / 1000);
    return {
      "Retry-After": String(resetSec),
      "X-RateLimit-Limit": String(limit),
      "X-RateLimit-Reset": String(resetSec),
    } as Record<string, string>;
  } catch {
    const resetSec = Math.ceil(defaultWindowMs / 1000);
    return {
      "Retry-After": String(resetSec),
      "X-RateLimit-Limit": String(limit),
      "X-RateLimit-Reset": String(resetSec),
    } as Record<string, string>;
  }
}
