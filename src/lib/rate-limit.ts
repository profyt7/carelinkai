/**
 * Simple in-memory rate limiting utility
 * 
 * This provides basic protection against brute force attacks by limiting
 * the number of requests per identifier (typically IP address) within a
 * specified time interval.
 */

interface RateLimitOptions {
  interval: number;  // Time window in milliseconds
  limit: number;     // Maximum number of requests allowed in the interval
  uniqueTokenPerInterval?: number; // Max number of unique tokens to track
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export function rateLimit(options: RateLimitOptions) {
  const { interval, limit, uniqueTokenPerInterval = 500 } = options;
  
  // In-memory store for tracking requests
  const tokenCache = new Map<string, RateLimitEntry>();
  
  // Cleanup function to prevent memory leaks
  const cleanup = () => {
    const now = Date.now();
    for (const [key, value] of tokenCache.entries()) {
      if (now > value.resetTime) {
        tokenCache.delete(key);
      }
    }
  };
  
  // Run cleanup every interval
  setInterval(cleanup, interval);
  
  return {
    /**
     * Check if the rate limit has been exceeded
     * 
     * @param limit Optional override for the default limit
     * @param token Unique identifier (usually IP address)
     * @returns Promise that resolves if under limit, rejects if exceeded
     */
    check: (limitOverride: number = limit, token: string): Promise<void> => {
      // Ensure we don't track too many unique tokens
      if (tokenCache.size >= uniqueTokenPerInterval) {
        cleanup();
      }
      
      const now = Date.now();
      
      // Get or create entry for this token
      const entry = tokenCache.get(token) || {
        count: 0,
        resetTime: now + interval
      };
      
      // If the entry has expired, reset it
      if (now > entry.resetTime) {
        entry.count = 0;
        entry.resetTime = now + interval;
      }
      
      // Check against limit
      if (entry.count >= limitOverride) {
        return Promise.reject(new Error('Rate limit exceeded'));
      }
      
      // Increment count and save
      entry.count++;
      tokenCache.set(token, entry);
      
      return Promise.resolve();
    },
    
    /**
     * Get current usage for a token
     * 
     * @param token Unique identifier
     * @returns Object with count and remaining time, or null if not found
     */
    getUsage: (token: string) => {
      const entry = tokenCache.get(token);
      if (!entry) return null;
      
      const now = Date.now();
      const remaining = Math.max(0, entry.resetTime - now);
      
      return {
        count: entry.count,
        limit,
        remaining,
        resetIn: remaining
      };
    }
  };
}
