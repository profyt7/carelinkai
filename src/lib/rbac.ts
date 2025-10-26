import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import type { UserRole } from "@prisma/client";

// RBAC helpers for App Router routes
// Assumptions:
// - Session callback in authOptions populates session.user.role
// - Roles are defined in Prisma enum UserRole

export async function requireAnyRole(allowed: UserRole[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const role = session.user.role as UserRole;
  if (!allowed.includes(role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

export async function requireOperatorOrAdmin() {
  // Convenience wrapper for common operator/admin checks
  const { session, error } = await requireAnyRole(["OPERATOR" as UserRole, "ADMIN" as UserRole]);
  if (error) return { error } as const;
  return { session } as const;
}
