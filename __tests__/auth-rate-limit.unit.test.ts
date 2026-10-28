/**
 * OL-182 — the /api/auth limiter answers 429 + Retry-After instead of throwing
 * (Sentry CARELINK-AI-1A: the throw 500'd NextAuth's own error page), never
 * counts session polling, and still limits POST signin/callback at 10/min.
 */
import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';

const nextAuthHandler = jest.fn(async () => new Response('ok', { status: 200 }));
jest.mock('next-auth', () => ({ __esModule: true, default: () => nextAuthHandler }));
jest.mock('@/lib/auth', () => ({ __esModule: true, default: {} }));

import { rateLimit } from '@/lib/rate-limit';

const ENV = { ...process.env };
let ipSeq = 0;
const freshIp = () => `203.0.113.${++ipSeq}`;

function req(method: string, action: string, ip: string) {
  return new NextRequest(`http://localhost/api/auth/${action}`, {
    method,
    headers: { 'x-forwarded-for': ip },
  });
}

async function loadRoute() {
  let mod: typeof import('@/app/api/auth/[...nextauth]/route');
  jest.isolateModules(() => {
    mod = require('@/app/api/auth/[...nextauth]/route');
  });
  return mod!;
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...ENV };
  delete process.env['ALLOW_DEV_ENDPOINTS'];
  delete process.env['REDIS_URL'];
  delete process.env['REDIS_TLS_URL'];
});
afterAll(() => {
  process.env = ENV;
});

describe('rateLimit().consume (non-throwing)', () => {
  it('reports limited with a Retry-After in seconds instead of throwing', async () => {
    const limiter = rateLimit({ interval: 60_000, limit: 2 });
    expect(await limiter.consume(2, 't1')).toEqual({ limited: false, retryAfterSec: 0 });
    expect(await limiter.consume(2, 't1')).toEqual({ limited: false, retryAfterSec: 0 });
    const third = await limiter.consume(2, 't1');
    expect(third.limited).toBe(true);
    expect(third.retryAfterSec).toBeGreaterThanOrEqual(1);
    expect(third.retryAfterSec).toBeLessThanOrEqual(60);
  });

  it('check() still throws for the routes that rely on it', async () => {
    const limiter = rateLimit({ interval: 60_000, limit: 1 });
    await limiter.check(1, 't2');
    await expect(limiter.check(1, 't2')).rejects.toThrow('Rate limit exceeded');
  });
});

describe('/api/auth/[...nextauth]', () => {
  it('POST callback over 10/min → 429 + Retry-After, no throw, NextAuth not called', async () => {
    const { POST } = await loadRoute();
    const ip = freshIp();
    for (let i = 0; i < 10; i++) {
      const res = await POST(req('POST', 'callback/credentials', ip), {});
      expect(res.status).toBe(200);
    }
    expect(nextAuthHandler).toHaveBeenCalledTimes(10);
    const res = await POST(req('POST', 'callback/credentials', ip), {});
    expect(res.status).toBe(429);
    const retry = Number(res.headers.get('retry-after'));
    expect(retry).toBeGreaterThanOrEqual(1);
    expect(retry).toBeLessThanOrEqual(60);
    expect((await res.json()).error).toMatch(/Too many sign-in attempts/);
    expect(nextAuthHandler).toHaveBeenCalledTimes(10);
  });

  it('POST signin shares the 10/min credential bucket with callback', async () => {
    const { POST } = await loadRoute();
    const ip = freshIp();
    for (let i = 0; i < 5; i++) await POST(req('POST', 'signin/credentials', ip), {});
    for (let i = 0; i < 5; i++) await POST(req('POST', 'callback/credentials', ip), {});
    expect((await POST(req('POST', 'signin/credentials', ip), {})).status).toBe(429);
  });

  it.each(['session', 'csrf', 'providers', 'error'])('GET %s is never counted or limited', async (action) => {
    const { GET, POST } = await loadRoute();
    const ip = freshIp();
    for (let i = 0; i < 50; i++) {
      expect((await GET(req('GET', action, ip), {})).status).toBe(200);
    }
    // Polling did not eat into the sign-in budget.
    for (let i = 0; i < 10; i++) {
      expect((await POST(req('POST', 'callback/credentials', ip), {})).status).toBe(200);
    }
  });

  it('a normal sign-in plus session polling from open tabs stays under the limit', async () => {
    const { GET, POST } = await loadRoute();
    const ip = freshIp();
    const flow: Array<[string, string]> = [
      ['GET', 'providers'], ['GET', 'csrf'], ['GET', 'session'], ['GET', 'csrf'],
      ['POST', 'callback/credentials'], ['POST', 'callback/credentials'], ['POST', 'signin/credentials'],
      ...Array.from({ length: 30 }, () => ['GET', 'session'] as [string, string]),
    ];
    for (const [m, a] of flow) {
      const res = m === 'GET' ? await GET(req(m, a, ip), {}) : await POST(req(m, a, ip), {});
      expect({ m, a, status: res.status }).toEqual({ m, a, status: 200 });
    }
  });

  it('other auth actions use their own looser bucket (60/min) and do not drain sign-in', async () => {
    const { POST } = await loadRoute();
    const ip = freshIp();
    for (let i = 0; i < 60; i++) expect((await POST(req('POST', 'signout', ip), {})).status).toBe(200);
    expect((await POST(req('POST', 'signout', ip), {})).status).toBe(429);
    expect((await POST(req('POST', 'callback/credentials', ip), {})).status).toBe(200);
  });

  it('ALLOW_DEV_ENDPOINTS=1 bypasses the limiter (CI/e2e)', async () => {
    process.env['ALLOW_DEV_ENDPOINTS'] = '1';
    const { POST } = await loadRoute();
    const ip = freshIp();
    for (let i = 0; i < 15; i++) expect((await POST(req('POST', 'callback/credentials', ip), {})).status).toBe(200);
  });
});
