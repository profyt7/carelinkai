import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimit } from './src/lib/rate-limit';

// In-memory limiter (replace with Redis in production for multi-instance)
const limiter = rateLimit({ interval: 60_000, limit: 60, uniqueTokenPerInterval: 2000 });

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = (req.headers.get('x-forwarded-for') || req.ip || 'unknown').split(',')[0].trim();

  // Determine route-specific limits
  let limit = 60;
  if (pathname.startsWith('/api/auth')) limit = 10; // brute-force protection
  else if (pathname.startsWith('/api/webhooks')) limit = 30; // upstream retries
  else if (pathname.startsWith('/api/password')) limit = 8; // password reset flows

  try {
    await limiter.check(limit, `${pathname}:${ip}`);
    return NextResponse.next();
  } catch {
    return new NextResponse(
      JSON.stringify({ error: 'Too Many Requests' }),
      {
        status: 429,
        headers: {
          'content-type': 'application/json',
          'retry-after': '60',
        },
      },
    );
  }
}

export const config = {
  matcher: [
    '/api/auth/:path*',
    '/api/webhooks/:path*',
    '/api/password/:path*',
  ],
};