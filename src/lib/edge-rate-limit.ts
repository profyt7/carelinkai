/**
 * Edge-runtime-safe rate limiter for the middleware.
 *
 * The app's middleware runs in the Edge runtime, which has NO Node APIs — so it
 * cannot use src/lib/rate-limit.ts (that one uses `require('ioredis')` +
 * `setInterval().unref()` and is for Node-runtime API routes). This is a minimal,
 * dependency-free limiter: a per-isolate Map with lazy expiry. It's a coarse flood
 * guard (state lives per Edge isolate, not cross-instance) — strong, optionally
 * Redis-backed limiting for /api/auth stays at its route handler
 * (src/app/api/auth/[...nextauth]/route.ts), which runs in the Node runtime.
 */

export const RL_WINDOW_MS = 60_000;

/**
 * Per-minute request limit for a path, or null if the path is not rate-limited in
 * the middleware. NOTE: /api/auth is intentionally NOT here — it is already
 * rate-limited (10/min, Redis-capable) at its route handler; double-limiting it in
 * the Edge middleware would be redundant and weaker.
 */
export function middlewareRateLimitFor(pathname: string): number | null {
  // Provider callbacks (Stripe/Twilio/Checkr) are authenticated by signature; this
  // is a generous flood guard only — set high enough not to drop legitimate bursts.
  if (pathname.startsWith('/api/webhooks')) return 60;
  // Password-reset surface (reserved path; protects it the moment routes land here).
  if (pathname.startsWith('/api/password')) return 8;
  return null;
}

type Entry = { count: number; resetAt: number };
const store = new Map<string, Entry>();

/**
 * Returns true when `key` has exceeded `limit` requests in the current window.
 * Lazy-expires the key's window; opportunistically sweeps expired keys to bound memory.
 */
export function rateLimitExceeded(key: string, limit: number, now: number = Date.now()): boolean {
  const e = store.get(key);
  if (!e || now >= e.resetAt) {
    store.set(key, { count: 1, resetAt: now + RL_WINDOW_MS });
    if (store.size > 10_000) {
      for (const [k, v] of store) if (now >= v.resetAt) store.delete(k);
    }
    return false;
  }
  e.count += 1;
  return e.count > limit;
}

/** Test-only: clear the in-memory store. */
export function _resetRateLimitStore(): void {
  store.clear();
}
