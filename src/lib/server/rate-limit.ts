import Redis from 'ioredis';

// In-memory fallback when Redis is not available
const inMemoryStore = new Map<string, { count: number; expiry: number }>();

// Redis client singleton
let redisClient: Redis | null = null;

// Initialize Redis client if URL is provided
function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;
  
  const url = process.env.REDIS_URL;
  if (!url) return null;
  
  try {
    redisClient = new Redis(url);
    return redisClient;
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    return null;
  }
}

export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const redis = getRedisClient();
  
  if (redis) {
    // Use Redis-based rate limiting
    const redisKey = `ratelimit:${key}`;
    const now = Math.floor(Date.now() / 1000);
    const resetAt = now + windowSeconds;
    
    // Increment counter and set expiry if not exists
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.expire(redisKey, windowSeconds);
    }
    
    // Get TTL to calculate reset time
    const ttl = await redis.ttl(redisKey);
    const remaining = Math.max(0, limit - count);
    
    return {
      allowed: count <= limit,
      remaining,
      resetAt: now + (ttl > 0 ? ttl : windowSeconds)
    };
  } else {
    // Use in-memory rate limiting fallback
    const now = Date.now();
    const redisKey = `ratelimit:${key}`;
    
    // Clean up expired entries
    for (const [storedKey, data] of inMemoryStore.entries()) {
      if (data.expiry < now) {
        inMemoryStore.delete(storedKey);
      }
    }
    
    // Get or create entry
    let entry = inMemoryStore.get(redisKey);
    if (!entry || entry.expiry < now) {
      entry = { count: 0, expiry: now + windowSeconds * 1000 };
      inMemoryStore.set(redisKey, entry);
    }
    
    // Increment counter
    entry.count++;
    
    // Calculate remaining and allowed
    const remaining = Math.max(0, limit - entry.count);
    
    return {
      allowed: entry.count <= limit,
      remaining,
      resetAt: Math.floor(entry.expiry / 1000)
    };
  }
}
