/**
 * GET /api/tours/[id]
 * Get details of a specific tour (with permission checks)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Authorization - User must have tours view permission
    if (!hasPermission(session.user.role, PERMISSIONS.TOURS_VIEW)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 3. Get tour details
    const tour = await prisma.tourRequest.findUnique({
      where: { id: params.id },
      include: {
        home: {
          include: {
            address: true,
            operator: {
              include: {
                user: true,
              },
            },
          },
        },
        family: {
          include: {
            user: true,
          },
        },
        operator: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!tour) {
      return NextResponse.json({ error: "Tour not found" }, { status: 404 });
    }

    // 4. Verify access - user must be the family member or operator
    const isFamily = tour.family.userId === session.user.id;
    const isOperator = tour.operator.userId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isFamily && !isOperator && !isAdmin) {
      return NextResponse.json(
        { error: "Forbidden - not authorized to view this tour" },
        { status: 403 }
      );
    }

    // 5. Return tour details (hide sensitive info based on role)
    const response: any = {
      id: tour.id,
      status: tour.status,
      outcome: tour.outcome,
      requestedTimes: tour.requestedTimes,
      aiSuggestedTimes: tour.aiSuggestedTimes,
      confirmedTime: tour.confirmedTime,
      familyNotes: tour.familyNotes,
      createdAt: tour.createdAt,
      updatedAt: tour.updatedAt,
      home: {
        id: tour.home.id,
        name: tour.home.name,
        address: tour.home.address,
      },
      family: {
        name: `${tour.family.user.firstName} ${tour.family.user.lastName}`,
        email: tour.family.user.email,
        phone: tour.family.user.phone,
      },
    };

    // Include operator notes only for operators and admins
    if (isOperator || isAdmin) {
      response.operatorNotes = tour.operatorNotes;
      response.cancelledBy = tour.cancelledBy;
      response.cancellationReason = tour.cancellationReason;
    }

    return NextResponse.json({ success: true, tour: response });
  } catch (error) {
    console.error("[Tour Details API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tour details" },
      { status: 500 }
    );
  }
}
