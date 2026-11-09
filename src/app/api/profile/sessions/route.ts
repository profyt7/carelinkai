
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AuditAction } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { endOtherSessions } from "@/lib/auth/session-version";


/**
 * DELETE /api/profile/sessions
 * 
 * Logs out the user from all devices except the current one
 * by deleting all other active sessions.
 */
export async function DELETE(req: NextRequest) {
  try {
    // Get authenticated session
    const session = await getServerSession(authOptions);

    // Check if user is authenticated
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Sessions are JWTs (no Session rows exist), so deleting rows from the Session
    // table — what this route used to do — signed nobody out. Bump the user's session
    // version instead: every other token fails the jwt callback's check, and this
    // device's cookie is re-issued with the new version so it stays signed in.
    const res = NextResponse.json({
      success: true,
      message: "Signed out of all other devices. This device stays signed in.",
    });
    await endOtherSessions(req, res, user.id);

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: AuditAction.DELETE,
        resourceType: "Session",
        resourceId: user.id,
        description: "User signed out of all other devices (session version bumped)",
        ipAddress: req.headers.get("x-forwarded-for") || "unknown",
        userAgent: req.headers.get("user-agent") || "unknown",
      },
    });

    return res;
  } catch (error) {
    console.error("Error managing sessions:", error);
    return NextResponse.json(
      { success: false, message: "Failed to logout from other devices" },
      { status: 500 }
    );
  }
}
