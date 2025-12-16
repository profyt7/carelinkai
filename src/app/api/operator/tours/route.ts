/**
 * GET /api/operator/tours
 * List all tours for the authenticated operator
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
    if (!hasPermission(session.user.role, PERMISSIONS.TOURS_VIEW_ALL)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 3. Get operator record
    const operator = await prisma.operator.findUnique({
      where: { userId: session.user.id },
    });

    if (!operator && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Operator not found" }, { status: 404 });
    }

    // 4. Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const homeId = searchParams.get("homeId");

    // 5. Fetch tours
    const whereClause: any = {};

    if (operator) {
      whereClause.operatorId = operator.id;
    }

    if (status) {
      whereClause.status = status;
    }

    if (homeId) {
      whereClause.homeId = homeId;
    }

    const tours = await prisma.tourRequest.findMany({
      where: whereClause,
      include: {
        home: {
          include: {
            address: true,
          },
        },
        family: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ success: true, tours });
  } catch (error) {
    console.error("[Operator Tours API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tours" },
      { status: 500 }
    );
  }
}
