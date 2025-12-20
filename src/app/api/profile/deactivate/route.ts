
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-db-simple";
import { PrismaClient, AuditAction, UserStatus } from "@prisma/client";

// Local Prisma client (consistent pattern across routes)
const prisma = new PrismaClient();

/**
 * Minimal in-memory rate limiter (token bucket per identifier).
 * interval: window in ms, limit: max requests in window.
 */
function createRateLimiter(interval: number, limit: number) {
  const cache = new Map<string, { count: number; reset: number }>();
  return {
    async check(token: string) {
      const now = Date.now();
      const entry = cache.get(token) ?? { count: 0, reset: now + interval };
      if (now > entry.reset) {
        entry.count = 0;
        entry.reset = now + interval;
      }
      if (entry.count >= limit) throw new Error("rate-limit");
      entry.count += 1;
      cache.set(token, entry);
    },
  };
}

// Rate limiter: 3 attempts per hour
const limiter = createRateLimiter(60 * 60 * 1000, 3);

/**
 * POST /api/profile/deactivate
 * 
 * Deactivates a user account by setting their status to DEACTIVATED.
 * This is a soft delete that preserves user data for compliance purposes.
 */
export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting
    const identifier = req.ip || "unknown";
    try {
      await limiter.check(identifier); // 3 requests per hour per IP
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Too many deactivation attempts. Please try again later." },
        { status: 429 }
      );
    }

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
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Check if user is already deactivated
    if (user.status === UserStatus.DEACTIVATED) {
      return NextResponse.json(
        { success: false, message: "Account is already deactivated" },
        { status: 400 }
      );
    }

    // Deactivate the account
    await prisma.user.update({
      where: { id: user.id },
      data: {
        status: UserStatus.DEACTIVATED,
        updatedAt: new Date(),
      },
    });

    // Delete all active sessions for this user
    await prisma.session.deleteMany({
      where: {
        userId: user.id,
      },
    });

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: AuditAction.UPDATE,
        resourceType: "Account",
        resourceId: user.id,
        description: `User deactivated their account (${user.email})`,
        ipAddress: req.headers.get("x-forwarded-for") || req.ip || "unknown",
        userAgent: req.headers.get("user-agent") || "unknown",
        metadata: {
          previousStatus: user.status,
          newStatus: UserStatus.DEACTIVATED,
          role: user.role,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Account deactivated successfully",
    });
  } catch (error) {
    console.error("Error deactivating account:", error);
    return NextResponse.json(
      { success: false, message: "Failed to deactivate account" },
      { status: 500 }
    );
  }
}
