import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import type { UserRole } from "@prisma/client";

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
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
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
