import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-db-simple";
import { PrismaClient, AuditAction } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";

// Local Prisma client (keeps pattern consistent with other routes)
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

// Rate limiter: 5 attempts per minute
const limiter = createRateLimiter(60 * 1000, 5);

// Password schema for validation
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
});

/**
 * POST /api/profile/password
 * 
 * Changes the user's password after validating the current password
 * and ensuring the new password meets security requirements.
 */
export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting
    const identifier = req.ip || "unknown";
    try {
      // 10 requests per minute per IP
      await limiter.check(identifier);
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Too many password change attempts. Please try again later." },
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

    // Parse and validate request body
    const body = await req.json();
    
    try {
      passwordChangeSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => err.message).join(", ");
        return NextResponse.json(
          { success: false, message: `Validation error: ${errorMessages}` },
          { status: 400 }
        );
      }
    }

    const { currentPassword, newPassword } = body;

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Verify current password
    if (!user.passwordHash) {
      return NextResponse.json(
        { success: false, message: "No password set for this account" },
        { status: 400 }
      );
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash
    );

    if (!isCurrentPasswordValid) {
      // Create audit log entry for failed attempt
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: AuditAction.ACCESS_DENIED,
          resourceType: "Password",
          resourceId: user.id,
          description: "Failed password change attempt - incorrect current password",
          ipAddress: req.headers.get("x-forwarded-for") || req.ip || "unknown",
          userAgent: req.headers.get("user-agent") || "unknown",
        },
      });

      return NextResponse.json(
        { success: false, message: "Current password is incorrect" },
        { status: 400 }
      );
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(12);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // Update the user's password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      },
    });

    // Create audit log entry for successful password change
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: AuditAction.UPDATE,
        resourceType: "Password",
        resourceId: user.id,
        description: "User changed their password",
        ipAddress: req.headers.get("x-forwarded-for") || req.ip || "unknown",
        userAgent: req.headers.get("user-agent") || "unknown",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Error changing password:", error);
    return NextResponse.json(
      { success: false, message: "Failed to change password" },
      { status: 500 }
    );
  }
}
