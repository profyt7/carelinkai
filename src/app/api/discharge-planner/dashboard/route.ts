/**
 * GET /api/discharge-planner/dashboard
 * Get dashboard data for discharge planners
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/auth-utils";
import { UserRole } from "@prisma/client";

export async function GET(request: NextRequest) {
  console.log("📊 [DP-DASHBOARD] Dashboard request received");

  try {
    // Require DISCHARGE_PLANNER role
    const user = await requireRole([UserRole.DISCHARGE_PLANNER, UserRole.ADMIN]);

    // Get recent searches
    const recentSearches = await prisma.placementSearch.findMany({
      where: {
        userId: user.id,
      },
      include: {
        placementRequests: {
          include: {
            home: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    });

    // Get pending placement requests
    const pendingRequests = await prisma.placementRequest.findMany({
      where: {
        search: {
          userId: user.id,
        },
        status: {
          in: ["PENDING", "SENT", "VIEWED"],
        },
      },
      include: {
        home: {
          select: {
            id: true,
            name: true,
            operator: {
              select: {
                user: {
                  select: {
                    email: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
        search: {
          select: {
            queryText: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    // Calculate statistics
    const stats = {
      totalSearches: await prisma.placementSearch.count({
        where: { userId: user.id },
      }),
      totalPlacements: await prisma.placementRequest.count({
        where: {
          search: { userId: user.id },
        },
      }),
      successfulPlacements: await prisma.placementRequest.count({
        where: {
          search: { userId: user.id },
          status: "ACCEPTED",
        },
      }),
      pendingResponses: pendingRequests?.length ?? 0,
    };

    // Get searches from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentStats = {
      searchesLast30Days: await prisma.placementSearch.count({
        where: {
          userId: user.id,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      placementsLast30Days: await prisma.placementRequest.count({
        where: {
          search: { userId: user.id },
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
    };

    console.log("📊 [DP-DASHBOARD] ✅ Dashboard data fetched");

    return NextResponse?.json?.(
      {
        recentSearches,
        pendingRequests,
        stats: {
          ...stats,
          ...recentStats,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("📊 [DP-DASHBOARD] ❌ Error:", error);
    return NextResponse?.json?.(
      { error: error?.message ?? "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
