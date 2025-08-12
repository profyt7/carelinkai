import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-db-simple";
import { PrismaClient, AuditAction } from "@prisma/client";

// Local Prisma client (pattern used by other working routes)
const prisma = new PrismaClient();

/**
 * GET /api/profile/account
 * 
 * Returns account settings data including:
 * - Two-factor authentication status
 * - Notification preferences
 * - Last login
 * - Account creation date
 * - Active sessions
 */
export async function GET(req: NextRequest) {
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

    // Get user ID from session
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        twoFactorEnabled: true,
        notificationPrefs: true,
        preferences: true,
        lastLoginAt: true,
        createdAt: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Get active sessions for the user
    const activeSessions = await prisma.session.findMany({
      where: {
        userId: user.id,
        expires: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        expires: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: AuditAction.READ,
        resourceType: "Account",
        resourceId: user.id,
        description: "User viewed account settings",
        ipAddress: req.headers.get("x-forwarded-for") || req.ip || "unknown",
        userAgent: req.headers.get("user-agent") || "unknown",
      },
    });

    // Return account data
    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        twoFactorEnabled: user.twoFactorEnabled,
        notificationPrefs: user.notificationPrefs || {},
        preferences: user.preferences || {},
        lastLogin: user.lastLoginAt,
        createdAt: user.createdAt,
        role: user.role,
        status: user.status,
        activeSessions: activeSessions.map(session => ({
          id: session.id,
          userAgent: session.userAgent,
          ipAddress: session.ipAddress,
          createdAt: session.createdAt,
          expires: session.expires,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching account data:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch account data" },
      { status: 500 }
    );
  }
}
