export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-utils";
import { UserRole, AuditAction } from "@prisma/client";
import { createAuditLogFromRequest } from "@/lib/audit";
import { z } from "zod";

// Schema for impersonation request
const impersonateSchema = z.object({
  targetUserId: z.string().min(1, "Target user ID is required"),
  reason: z.string().optional(),
});

/**
 * POST /api/admin/impersonate/start
 * Start an impersonation session
 */
export async function POST(request: NextRequest) {
  try {
    // Require admin role
    const admin = await requireRole(UserRole.ADMIN);

    // Parse request body
    const body = await request.json();
    const { targetUserId, reason } = impersonateSchema.parse(body);

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "Target user not found" },
        { status: 404 }
      );
    }

    // Prevent impersonating other admins
    if (targetUser.role === UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Cannot impersonate other administrators" },
        { status: 403 }
      );
    }

    // Check if user is active
    if (targetUser.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Cannot impersonate inactive users" },
        { status: 403 }
      );
    }

    // End any existing active impersonation sessions for this admin
    await prisma.impersonationSession.updateMany({
      where: {
        adminId: admin.id,
        endedAt: null,
      },
      data: {
        endedAt: new Date(),
      },
    });

    // Get client IP and user agent
    const ipAddress = request.headers.get("x-forwarded-for") || 
                     request.headers.get("x-real-ip") || 
                     "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Create impersonation session (1-hour expiry)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    const session = await prisma.impersonationSession.create({
      data: {
        adminId: admin.id,
        targetUserId: targetUser.id,
        expiresAt,
        ipAddress,
        userAgent,
        reason,
      },
      include: {
        targetUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    // Create audit log
    await createAuditLogFromRequest(request, {
      action: AuditAction.IMPERSONATION_STARTED,
      userId: admin.id,
      details: {
        targetUserId: targetUser.id,
        targetUserEmail: targetUser.email,
        targetUserRole: targetUser.role,
        reason,
        sessionId: session.id,
        expiresAt: expiresAt.toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        targetUser: {
          id: targetUser.id,
          email: targetUser.email,
          firstName: targetUser.firstName,
          lastName: targetUser.lastName,
          role: targetUser.role,
        },
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("[Impersonate Start]", error);

    if (error.name === "UnauthenticatedError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (error.name === "UnauthorizedError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to start impersonation session" },
      { status: 500 }
    );
  }
}
