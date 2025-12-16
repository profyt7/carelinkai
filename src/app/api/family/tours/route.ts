/**
 * GET /api/family/tours
 * List all tours for the authenticated family
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  try {
    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Authorization
    if (!hasPermission(session.user.role, PERMISSIONS.TOURS_VIEW)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 3. Get family record
    const family = await prisma.family.findUnique({
      where: { userId: session.user.id },
    });

    if (!family) {
      return NextResponse.json({ error: "Family not found" }, { status: 404 });
    }

    // 4. Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");

    // 5. Fetch tours
    const tours = await prisma.tourRequest.findMany({
      where: {
        familyId: family.id,
        ...(status ? { status: status as any } : {}),
      },
      include: {
        home: {
          include: {
            address: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ success: true, tours });
  } catch (error) {
    console.error("[Family Tours API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tours" },
      { status: 500 }
    );
  }
}
