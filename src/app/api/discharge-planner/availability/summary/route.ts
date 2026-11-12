export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { summarizeAvailability } from "@/lib/discharge-planner/availability-summary";

/**
 * GET /api/discharge-planner/availability/summary
 * Aggregate availability across listed homes (counts by care level, verified openings).
 * No patient data, so it is NOT behind the PHI 2FA step-up: a DP without 2FA sees it on
 * their landing page. Case search / submission / views stay behind step-up.
 */
export async function GET() {
  try {
    const { error } = await requireAnyRole(["DISCHARGE_PLANNER", "ADMIN"] as any);
    if (error) return error;

    const homes = await prisma.assistedLivingHome.findMany({
      where: { status: "ACTIVE", isDemo: false },
      select: { careLevel: true, availabilityCount: true, availabilityVerifiedAt: true, availabilitySource: true },
    });

    return NextResponse.json({ success: true, summary: summarizeAvailability(homes), fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error("[Availability summary] Error:", err instanceof Error ? err.name : "error");
    return NextResponse.json({ error: "Failed to load availability" }, { status: 500 });
  }
}
