import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-db-simple";
import { PrismaClient, AuditAction } from "@prisma/client";

// Initialise local Prisma client (consistent with other API routes)
const prisma = new PrismaClient();

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

    // Get current session token from cookies
    const sessionToken = req.cookies.get("next-auth.session-token")?.value || 
                         req.cookies.get("__Secure-next-auth.session-token")?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, message: "Current session not found" },
        { status: 400 }
      );
    }

    // Delete all sessions except the current one
    const deletedSessions = await prisma.session.deleteMany({
      where: {
        userId: user.id,
        sessionToken: {
          not: sessionToken,
        },
      },
    });

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: AuditAction.DELETE,
        resourceType: "Session",
        resourceId: user.id,
        description: `User logged out from all other devices (${deletedSessions.count} sessions deleted)`,
        ipAddress: req.headers.get("x-forwarded-for") || req.ip || "unknown",
        userAgent: req.headers.get("user-agent") || "unknown",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Successfully logged out from all other devices",
      data: {
        sessionsRemoved: deletedSessions.count,
      },
    });
  } catch (error) {
    console.error("Error managing sessions:", error);
    return NextResponse.json(
      { success: false, message: "Failed to logout from other devices" },
      { status: 500 }
    );
  }
}
