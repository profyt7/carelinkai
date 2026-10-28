import { NextResponse, type NextRequest } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

/*
 * OL-182: brute-force protection without breaking normal sign-in.
 * - GET session / csrf / providers / error are read-only and polled by every
 *   open tab: never counted.
 * - POST signin/* and callback/* (the credential surface): 10/min per IP.
 * - Everything else under /api/auth (signout, _log, session update, the
 *   signin page / OAuth callback GETs): its own looser bucket, 60/min per IP.
 * Over the limit → 429 + Retry-After. Never throws (a throw here 500'd
 * NextAuth's own error page — Sentry CARELINK-AI-1A).
 */
const SIGNIN_LIMIT = 10;
const OTHER_LIMIT = 60;
const limiter = rateLimit({ interval: 60_000, limit: SIGNIN_LIMIT, uniqueTokenPerInterval: 5000 });

const EXEMPT_GET_ACTIONS = new Set(['session', 'csrf', 'providers', 'error']);

function authAction(req: NextRequest): string {
  const rest = req.nextUrl.pathname.replace(/^\/api\/auth\/?/, '');
  return rest.split('/')[0] ?? '';
}

export async function authRateLimitResponse(req: NextRequest): Promise<NextResponse | null> {
  // Bypass rate limit in CI/e2e/dev flows when explicitly enabled
  if (process.env['ALLOW_DEV_ENDPOINTS'] === '1') return null;
  const action = authAction(req);
  if (req.method === 'GET' && EXEMPT_GET_ACTIONS.has(action)) return null;

  const ip = (req.headers.get('x-forwarded-for') || (req as any).ip || 'unknown').split(',')[0].trim();
  const credential = req.method === 'POST' && (action === 'signin' || action === 'callback');
  const { limited, retryAfterSec } = credential
    ? await limiter.consume(SIGNIN_LIMIT, `auth:${ip}`)
    : await limiter.consume(OTHER_LIMIT, `auth-other:${ip}`);
  if (!limited) return null;

  return NextResponse.json(
    { error: 'Too many sign-in attempts. Please wait a minute and try again.' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSec) } }
  );
}
