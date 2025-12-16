/**
 * GET /api/family/tours/available-slots/[homeId]
 * Get AI-suggested optimal tour times for a home
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { suggestOptimalTimes } from "@/lib/tour-scheduler/ai-tour-scheduler";

export async function GET(
  request: NextRequest,
  { params }: { params: { homeId: string } }
) {
  try {
    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Authorization
    if (!hasPermission(session.user.role, PERMISSIONS.TOURS_REQUEST)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 3. Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate") || new Date().toISOString();
    const endDate = searchParams.get("endDate") || 
      new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(); // +14 days

    // 4. Get AI suggestions
    const suggestions = await suggestOptimalTimes(
      params.homeId,
      {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      }
    );

    return NextResponse.json({ success: true, suggestions });
  } catch (error) {
    console.error("[Available Slots API] Error:", error);
    return NextResponse.json(
      { error: "Failed to get available slots" },
      { status: 500 }
    );
  }
}
