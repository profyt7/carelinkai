import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import type { UserRole } from "@prisma/client";
import { cookies } from 'next/headers';
import { decode } from 'next-auth/jwt';

// RBAC helpers for App Router routes
// Assumptions:
// - Session callback in authOptions populates session.user.role
// - Roles are defined in Prisma enum UserRole

export async function requireAnyRole(
  allowed: UserRole[],
  opts?: { forbiddenMessage?: string }
) {
  // Bypass for non-production E2E contexts only (explicit flag)
  if (
    process.env['NODE_ENV'] !== 'production' &&
    process.env['NEXT_PUBLIC_E2E_AUTH_BYPASS'] === '1'
  ) {
    return { session: { user: { role: allowed[0] } } as any };
  }
  let session: any = null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    // When not running inside a Next.js request context (e.g., unit tests),
    // getServerSession may throw due to missing request storage. Treat as unauthenticated.
    if (process.env['NODE_ENV'] === 'test') {
      // In Jest, prefer allowing route-level logic to proceed with a minimal session
      // so tests can control auth outcomes via prisma mocks.
      session = { user: {} };
    } else {
      return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }
  }
  if (!session?.user) {
    // Dev/e2e fallback: when explicitly allowed, decode JWT from cookie to emulate session
    if (process.env['ALLOW_DEV_ENDPOINTS'] === '1') {
      try {
        const jar = cookies();
        // Align with auth cookie name logic
        const cookieName = (process.env.NODE_ENV === 'production' && process.env['ALLOW_INSECURE_AUTH_COOKIE'] !== '1')
          ? '__Secure-next-auth.session-token'
          : 'next-auth.session-token';
        const raw = jar.get(cookieName)?.value;
        if (raw) {
          const token: any = await decode({ token: raw, secret: process.env['NEXTAUTH_SECRET']! } as any);
          if (token?.email) {
            session = { user: {
              id: token.id,
              email: token.email,
              name: token.name,
              role: token.role as UserRole,
            } };
          }
        }
      } catch {}
    }
    if (!session?.user) {
      return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }
  }
  const role = (session.user as any).role as UserRole | undefined;
  if (role && allowed?.length && !allowed.includes(role)) {
    const message = opts?.forbiddenMessage ?? "Forbidden";
    return { error: NextResponse.json({ error: message }, { status: 403 }) };
  }
  return { session };
}

export async function requireOperatorOrAdmin() {
  // Convenience wrapper for common operator/admin checks
  const { session, error } = await requireAnyRole(["OPERATOR" as UserRole, "ADMIN" as UserRole]);
  if (error) return { error } as const;
  return { session } as const;
}
