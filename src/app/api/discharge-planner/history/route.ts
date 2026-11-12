/**
 * GET /api/discharge-planner/history
 * Get search history for discharge planners
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, phiStepUpResponse } from "@/lib/auth-utils";
import { UserRole } from "@prisma/client";

export async function GET(request: NextRequest) {
  console.log("📚 [DP-HISTORY] History request received");

  try {
    // Require DISCHARGE_PLANNER or ADMIN role
    const user = await requireRole([UserRole.DISCHARGE_PLANNER, UserRole.ADMIN]);
    // Patient case data is PHI: a DP without 2FA is sent to setup first (step-up).
    const stepUp = phiStepUpResponse(user);
    if (stepUp) return stepUp;

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100");
    const status = searchParams.get("status");

    // Build where clause
    const where: any = {
      userId: user.id,
    };

    if (status && ["SEARCHING", "COMPLETED", "CANCELLED"].includes(status)) {
      where.status = status;
    }

    // Get search history
    const searches = await prisma.placementSearch.findMany({
      where,
      include: {
        placementRequests: {
          select: {
            id: true,
            status: true,
            homeId: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    console.log(`📚 [DP-HISTORY] ✅ Fetched ${searches.length} searches`);

    return NextResponse.json(
      { searches },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("📚 [DP-HISTORY] ❌ Error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to fetch search history" },
      { status: 500 }
    );
  }
}
