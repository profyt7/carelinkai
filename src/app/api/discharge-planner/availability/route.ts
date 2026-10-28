export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { availabilityView } from "@/lib/availability/availability";

/**
 * GET /api/discharge-planner/availability?homeIds=id1,id2,id3
 * Returns live bed availability for one or more homes.
 * Called by the discharge planner search results to refresh availability.
 */
export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAnyRole(["DISCHARGE_PLANNER", "ADMIN"] as any);
    if (error) return error;

    const homeIdsParam = request.nextUrl.searchParams.get("homeIds") ?? "";
    const homeIds = homeIdsParam
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (homeIds.length === 0) {
      return NextResponse.json({ error: "homeIds required" }, { status: 400 });
    }

    const homes = await prisma.assistedLivingHome.findMany({
      where: { id: { in: homeIds } },
      select: {
        id: true,
        name: true,
        capacity: true,
        currentOccupancy: true,
        availabilityCount: true,
        availabilityVerifiedAt: true,
        availabilitySource: true,
        updatedAt: true,
      },
    });

    const availability = homes.map((home) => {
      const totalBeds = home.capacity ?? 0;
      const occupied = home.currentOccupancy ?? 0;
      // capacity math; never render as availability — see OL-200
      const available = Math.max(0, totalBeds - occupied);
      return {
        homeId: home.id,
        homeName: home.name,
        // OL-200: what the card renders — a verified fact or "Contact to confirm".
        availability: availabilityView(home),
        availableBeds: available,
        totalBeds,
        occupancyRate: totalBeds > 0 ? Math.round((occupied / totalBeds) * 100) : 0,
        lastUpdated: home.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({ success: true, availability, fetchedAt: new Date().toISOString() });
  } catch (error) {
    console.error("[Availability API] Error:", error);
    return NextResponse.json({ error: "Failed to fetch availability" }, { status: 500 });
  }
}
