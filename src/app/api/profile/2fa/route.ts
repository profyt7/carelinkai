import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-db-simple";
import { PrismaClient, AuditAction } from "@prisma/client";

// Initialise local Prisma client (keeps pattern consistent across API routes)
const prisma = new PrismaClient();

/**
 * POST /api/profile/2fa
 * 
 * Enables or disables two-factor authentication for the user.
 * This is a simplified version that just toggles the 2FA flag.
 * A more complete implementation would include TOTP setup.
 */
export async function POST(req: NextRequest) {
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

    // Parse request body
    const body = await req.json();
    const { enabled } = body;

    // Validate the enabled parameter
    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { success: false, message: "Invalid request. 'enabled' must be a boolean." },
        { status: 400 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        twoFactorEnabled: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Update the user's 2FA status
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: enabled,
        // If implementing full TOTP, you would also set twoFactorSecret here
        // when enabling 2FA, and clear it when disabling
        twoFactorSecret: enabled ? user.twoFactorSecret : null,
        updatedAt: new Date(),
      },
    });

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: AuditAction.UPDATE,
        resourceType: "Security",
        resourceId: user.id,
        description: `User ${enabled ? "enabled" : "disabled"} two-factor authentication`,
        ipAddress: req.headers.get("x-forwarded-for") || req.ip || "unknown",
        userAgent: req.headers.get("user-agent") || "unknown",
      },
    });

    return NextResponse.json({
      success: true,
      message: `Two-factor authentication ${enabled ? "enabled" : "disabled"} successfully`,
      data: {
        twoFactorEnabled: enabled,
      },
    });
  } catch (error) {
    console.error("Error updating 2FA status:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update two-factor authentication" },
      { status: 500 }
    );
  }
}
