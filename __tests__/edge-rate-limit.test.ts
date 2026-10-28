/**
 * Edge-safe middleware rate limiter (src/lib/edge-rate-limit.ts).
 * Proves the revived rate-limiting actually fires on the intended endpoints.
 */

import {
  middlewareRateLimitFor,
  rateLimitExceeded,
  _resetRateLimitStore,
  RL_WINDOW_MS,
} from '@/lib/edge-rate-limit';

beforeEach(() => _resetRateLimitStore());

describe('middlewareRateLimitFor', () => {
  it('rate-limits webhooks (60) and password (8) endpoints', () => {
    expect(middlewareRateLimitFor('/api/webhooks/stripe')).toBe(60);
    expect(middlewareRateLimitFor('/api/webhooks/twilio/sms')).toBe(60);
    expect(middlewareRateLimitFor('/api/password/reset')).toBe(8);
  });

  it('does NOT rate-limit /api/auth (handled at its route) or normal pages', () => {
    expect(middlewareRateLimitFor('/api/auth/session')).toBeNull();
    expect(middlewareRateLimitFor('/api/auth/callback/credentials')).toBeNull();
    expect(middlewareRateLimitFor('/learn/guides/what-medicare-covers')).toBeNull();
    expect(middlewareRateLimitFor('/admin')).toBeNull();
  });
});

describe('rateLimitExceeded', () => {
  const KEY = '/api/password/reset:1.2.3.4';

  it('allows up to the limit, then blocks', () => {
    for (let i = 0; i < 8; i++) {
      expect(rateLimitExceeded(KEY, 8)).toBe(false); // requests 1..8 allowed
    }
    expect(rateLimitExceeded(KEY, 8)).toBe(true); // 9th blocked
    expect(rateLimitExceeded(KEY, 8)).toBe(true); // stays blocked
  });

  it('isolates by key (different IP / endpoint counts separately)', () => {
    for (let i = 0; i < 8; i++) rateLimitExceeded(KEY, 8);
    expect(rateLimitExceeded(KEY, 8)).toBe(true);
    // A different IP and a different endpoint each start fresh.
    expect(rateLimitExceeded('/api/password/reset:9.9.9.9', 8)).toBe(false);
    expect(rateLimitExceeded('/api/webhooks/stripe:1.2.3.4', 60)).toBe(false);
  });

  it('resets after the window elapses', () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 8; i++) expect(rateLimitExceeded(KEY, 8, t0)).toBe(false);
    expect(rateLimitExceeded(KEY, 8, t0)).toBe(true);
    // After the window, the count resets.
    const t1 = t0 + RL_WINDOW_MS + 1;
    expect(rateLimitExceeded(KEY, 8, t1)).toBe(false);
  });
});
