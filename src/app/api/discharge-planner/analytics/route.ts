/**
 * GET /api/discharge-planner/analytics
 * Get analytics data for discharge planners
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-utils";
import { UserRole } from "@prisma/client";

export async function GET(request: NextRequest) {
  console.log("📈 [DP-ANALYTICS] Analytics request received");

  try {
    // Require DISCHARGE_PLANNER or ADMIN role
    const user = await requireRole([UserRole.DISCHARGE_PLANNER, UserRole.ADMIN]);

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "month";

    // Calculate date range
    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case "week":
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate.setDate(now.getDate() - 30);
        break;
      case "quarter":
        startDate.setDate(now.getDate() - 90);
        break;
      case "year":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Get all searches for the user in the period
    const searches = await prisma.placementSearch.findMany({
      where: {
        userId: user.id,
        createdAt: {
          gte: startDate,
        },
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
    });

    // Get all requests
    const allRequests = await prisma.placementRequest.findMany({
      where: {
        search: {
          userId: user.id,
        },
        createdAt: {
          gte: startDate,
        },
      },
      include: {
        home: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Calculate overview stats
    const totalSearches = searches.length;
    const totalRequests = allRequests.length;
    const successfulPlacements = allRequests.filter((r) => r.status === "ACCEPTED").length;
    const successRate = totalRequests > 0 ? (successfulPlacements / totalRequests) * 100 : 0;

    // Calculate average matches per search
    const avgMatchesPerSearch =
      totalSearches > 0
        ? searches.reduce((sum, search) => {
            const matches = search.searchResults as any;
            const matchCount = Array.isArray(matches?.matches) ? matches.matches.length : 0;
            return sum + matchCount;
          }, 0) / totalSearches
        : 0;

    // Calculate average response time
    const responseTimes = allRequests
      .filter((r) => r.homeResponseAt)
      .map((r) => {
        const sent = new Date(r.createdAt).getTime();
        const responded = new Date(r.homeResponseAt!).getTime();
        return responded - sent;
      });

    const avgResponseTimeMs =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
        : 0;

    const avgResponseTimeHours = Math.round(avgResponseTimeMs / (1000 * 60 * 60));
    const avgResponseTime = avgResponseTimeHours > 0 ? `${avgResponseTimeHours}h` : "N/A";

    // Group searches by date
    const searchesByDate: Record<string, number> = {};
    searches.forEach((search) => {
      const date = new Date(search.createdAt).toISOString().split("T")[0];
      searchesByDate[date] = (searchesByDate[date] || 0) + 1;
    });

    const searchesByDateArray = Object.entries(searchesByDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14); // Last 14 days

    // Group requests by status
    const requestsByStatus: Record<string, number> = {};
    allRequests.forEach((req) => {
      requestsByStatus[req.status] = (requestsByStatus[req.status] || 0) + 1;
    });

    const requestsByStatusArray = Object.entries(requestsByStatus)
      .map(([status, count]) => ({
        status,
        count,
        percentage: totalRequests > 0 ? (count / totalRequests) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Top matched homes
    const homeMatches: Record<string, { name: string; matchCount: number; acceptedCount: number }> = {};

    allRequests.forEach((req) => {
      const homeId = req.home.id;
      const homeName = req.home.name;

      if (!homeMatches[homeId]) {
        homeMatches[homeId] = { name: homeName, matchCount: 0, acceptedCount: 0 };
      }

      homeMatches[homeId].matchCount++;
      if (req.status === "ACCEPTED") {
        homeMatches[homeId].acceptedCount++;
      }
    });

    const topMatchedHomes = Object.entries(homeMatches)
      .map(([homeId, data]) => ({
        homeId,
        homeName: data.name,
        matchCount: data.matchCount,
        successRate: data.matchCount > 0 ? (data.acceptedCount / data.matchCount) * 100 : 0,
      }))
      .sort((a, b) => b.matchCount - a.matchCount)
      .slice(0, 10);

    // Monthly trends (last 6 months)
    const monthlyTrends: Array<{ month: string; searches: number; placements: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const monthSearches = searches.filter(
        (s) => new Date(s.createdAt) >= monthStart && new Date(s.createdAt) <= monthEnd
      ).length;

      const monthPlacements = allRequests.filter(
        (r) =>
          r.status === "ACCEPTED" &&
          new Date(r.createdAt) >= monthStart &&
          new Date(r.createdAt) <= monthEnd
      ).length;

      monthlyTrends.push({
        month: date.toLocaleString("default", { month: "short", year: "numeric" }),
        searches: monthSearches,
        placements: monthPlacements,
      });
    }

    const analyticsData = {
      overview: {
        totalSearches,
        totalRequests,
        successRate,
        avgMatchesPerSearch,
        avgResponseTime,
      },
      searchesByDate: searchesByDateArray,
      requestsByStatus: requestsByStatusArray,
      topMatchedHomes,
      monthlyTrends,
    };

    console.log("📈 [DP-ANALYTICS] ✅ Analytics data generated");

    return NextResponse.json(analyticsData, { status: 200 });
  } catch (error: any) {
    console.error("📈 [DP-ANALYTICS] ❌ Error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
