/**
 * NextAuth API Route Handler for CareLinkAI
 *
 * This file sets up the NextAuth.js API routes for authentication:
 * - GET endpoint for session validation and CSRF protection
 * - POST endpoint for authentication operations (sign in, sign out)
 *
 * The route uses the authOptions configuration from @/lib/auth
 */

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import NextAuth from "next-auth";
import type { NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import authOptions from "@/lib/auth";

// Re-export authOptions for use in other files
export { authOptions };

// Create handler with our custom authOptions
const nextAuthHandler = NextAuth(authOptions);

// Brute-force protection: 10 requests per minute per IP for auth endpoints
const limiter = rateLimit({ interval: 60_000, limit: 10, uniqueTokenPerInterval: 5000 });

async function withRateLimit(req: NextRequest) {
  // Bypass rate limit in CI/e2e/dev flows when explicitly enabled
  if (process.env['ALLOW_DEV_ENDPOINTS'] === '1') return;
  const ip = (req.headers.get('x-forwarded-for') || (req as any).ip || 'unknown').split(',')[0].trim();
  await limiter.check(10, `auth:${ip}`);
}

export async function GET(req: NextRequest, ctx: any) {
  await withRateLimit(req);
  // @ts-ignore NextAuth handler signature
  return nextAuthHandler(req, ctx);
}

export async function POST(req: NextRequest, ctx: any) {
  await withRateLimit(req);
  // @ts-ignore NextAuth handler signature
  return nextAuthHandler(req, ctx);
}