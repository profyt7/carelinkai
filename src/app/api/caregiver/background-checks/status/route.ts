export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/caregiver/background-checks/status
 * 
 * Returns the background check status for the authenticated caregiver
 * Requires authentication and caregiver role
 */
export async function GET(request: NextRequest) {
  try {
    // Get session and verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find caregiver record for current user
    const caregiver = await prisma.caregiver.findUnique({
      where: { userId: session.user.id },
      select: { 
        id: true, 
        backgroundCheckStatus: true,
        backgroundCheckProvider: true,
        backgroundCheckReportUrl: true
      }
    });

    if (!caregiver) {
      return NextResponse.json({ error: "User is not registered as a caregiver" }, { status: 403 });
    }

    // Return background check status
    return NextResponse.json({
      status: caregiver.backgroundCheckStatus,
      provider: caregiver.backgroundCheckProvider,
      reportUrl: caregiver.backgroundCheckReportUrl
    });

  } catch (error) {
    console.error("Error fetching background check status:", error);
    return NextResponse.json(
      { error: "Failed to fetch background check status" },
      { status: 500 }
    );
  }
}
