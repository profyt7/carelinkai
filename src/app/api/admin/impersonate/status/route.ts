export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";

/**
 * GET /api/admin/impersonate/status
 * Check if there's an active impersonation session
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth();

    // Find active impersonation session
    const session = await prisma.impersonationSession.findFirst({
      where: {
        adminId: user.id,
        endedAt: null,
        expiresAt: {
          gt: new Date(), // Not expired
        },
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
        admin: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({
        active: false,
        session: null,
      });
    }

    return NextResponse.json({
      active: true,
      session: {
        id: session.id,
        targetUser: session.targetUser,
        admin: session.admin,
        startedAt: session.startedAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
        reason: session.reason,
      },
    });
  } catch (error: any) {
    console.error("[Impersonate Status]", error);

    if (error.name === "UnauthenticatedError") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to check impersonation status" },
      { status: 500 }
    );
  }
}
