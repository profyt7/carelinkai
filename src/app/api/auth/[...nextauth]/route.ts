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
import { authRateLimitResponse } from "@/lib/auth-rate-limit";
import authOptions from "@/lib/auth";

// Re-export authOptions for use in other files
export { authOptions };

// Create handler with our custom authOptions
const nextAuthHandler = NextAuth(authOptions);

export async function GET(req: NextRequest, ctx: any) {
  const limited = await authRateLimitResponse(req);
  if (limited) return limited;
  // @ts-ignore NextAuth handler signature
  return nextAuthHandler(req, ctx);
}

export async function POST(req: NextRequest, ctx: any) {
  const limited = await authRateLimitResponse(req);
  if (limited) return limited;
  // @ts-ignore NextAuth handler signature
  return nextAuthHandler(req, ctx);
}
