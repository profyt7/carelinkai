export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import { AuditAction } from "@prisma/client";
import { createAuditLogFromRequest } from "@/lib/audit";

/**
 * POST /api/admin/impersonate/stop
 * Stop the current impersonation session
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication (could be admin or impersonated user)
    const user = await requireAuth();

    // Find active impersonation session
    const session = await prisma.impersonationSession.findFirst({
      where: {
        adminId: user.id,
        endedAt: null,
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

    if (!session) {
      return NextResponse.json(
        { error: "No active impersonation session found" },
        { status: 404 }
      );
    }

    // End the impersonation session
    await prisma.impersonationSession.update({
      where: { id: session.id },
      data: { endedAt: new Date() },
    });

    // Create audit log
    await createAuditLogFromRequest(request, {
      action: AuditAction.IMPERSONATION_STOPPED,
      userId: user.id,
      details: {
        sessionId: session.id,
        targetUserId: session.targetUser.id,
        targetUserEmail: session.targetUser.email,
        duration: Date.now() - session.startedAt.getTime(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Impersonation session ended successfully",
    });
  } catch (error: any) {
    console.error("[Impersonate Stop]", error);

    if (error.name === "UnauthenticatedError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to stop impersonation session" },
      { status: 500 }
    );
  }
}
