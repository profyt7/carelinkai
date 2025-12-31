/**
 * GET /api/discharge-planner/requests
 * Get all placement requests for a discharge planner
 * 
 * PATCH /api/discharge-planner/requests
 * Update the status of a placement request
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-utils";
import { UserRole } from "@prisma/client";

export async function GET(request: NextRequest) {
  console.log("📋 [DP-REQUESTS] Requests list request received");

  try {
    // Require DISCHARGE_PLANNER or ADMIN role
    const user = await requireRole([UserRole.DISCHARGE_PLANNER, UserRole.ADMIN]);

    const { searchParams } = new URL(request.url);
    const searchId = searchParams.get("searchId");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "100");

    // Build where clause
    const where: any = {
      search: {
        userId: user.id,
      },
    };

    if (searchId) {
      where.searchId = searchId;
    }

    if (status && ["PENDING", "SENT", "VIEWED", "RESPONDED", "ACCEPTED", "DECLINED"].includes(status)) {
      where.status = status;
    }

    // Get placement requests
    const requests = await prisma.placementRequest.findMany({
      where,
      include: {
        home: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            state: true,
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
            id: true,
            queryText: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    console.log(`📋 [DP-REQUESTS] ✅ Fetched ${requests.length} requests`);

    return NextResponse.json(
      { requests },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("📋 [DP-REQUESTS] ❌ Error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to fetch placement requests" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  console.log("📋 [DP-REQUESTS] Update request received");

  try {
    // Require DISCHARGE_PLANNER or ADMIN role
    const user = await requireRole([UserRole.DISCHARGE_PLANNER, UserRole.ADMIN]);

    const body = await request.json();
    const { requestId, status, notes } = body;

    if (!requestId) {
      return NextResponse.json(
        { error: "Request ID is required" },
        { status: 400 }
      );
    }

    // Verify the request belongs to the user
    const existingRequest = await prisma.placementRequest.findUnique({
      where: { id: requestId },
      include: {
        search: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!existingRequest) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      );
    }

    if (existingRequest.search.userId !== user.id && user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Unauthorized to update this request" },
        { status: 403 }
      );
    }

    // Build update data
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (status && ["PENDING", "SENT", "VIEWED", "RESPONDED", "ACCEPTED", "DECLINED"].includes(status)) {
      updateData.status = status;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    // Update the request
    const updatedRequest = await prisma.placementRequest.update({
      where: { id: requestId },
      data: updateData,
      include: {
        home: {
          select: {
            id: true,
            name: true,
          },
        },
        search: {
          select: {
            id: true,
            queryText: true,
          },
        },
      },
    });

    console.log(`📋 [DP-REQUESTS] ✅ Updated request ${requestId}`);

    return NextResponse.json(
      { request: updatedRequest },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("📋 [DP-REQUESTS] ❌ Error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to update placement request" },
      { status: 500 }
    );
  }
}
