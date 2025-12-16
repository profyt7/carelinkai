/**
 * POST /api/family/tours/request
 * Request a tour for a specific home
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions";
import { z } from "zod";
import { sendTourConfirmationEmail } from "@/lib/notifications/tour-notifications";

const tourRequestSchema = z.object({
  homeId: z.string(),
  requestedTimes: z.array(z.string().datetime()), // ISO 8601 datetime strings
  familyNotes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Authorization - Check if user has permission
    if (!hasPermission(session.user.role, PERMISSIONS.TOURS_REQUEST)) {
      return NextResponse.json({ error: "Forbidden - insufficient permissions" }, { status: 403 });
    }

    // 3. Validate request body
    const body = await request.json();
    const validatedData = tourRequestSchema.parse(body);

    // 4. Get family record
    const family = await prisma.family.findUnique({
      where: { userId: session.user.id },
      include: {
        user: true,
      },
    });

    if (!family) {
      return NextResponse.json({ error: "Family record not found" }, { status: 404 });
    }

    // 5. Get home and operator details
    const home = await prisma.assistedLivingHome.findUnique({
      where: { id: validatedData.homeId },
      include: {
        operator: {
          include: {
            user: true,
          },
        },
        address: true,
      },
    });

    if (!home) {
      return NextResponse.json({ error: "Home not found" }, { status: 404 });
    }

    // 6. Create tour request
    const tourRequest = await prisma.tourRequest.create({
      data: {
        familyId: family.id,
        homeId: home.id,
        operatorId: home.operatorId,
        requestedTimes: validatedData.requestedTimes.map((t) => new Date(t)),
        familyNotes: validatedData.familyNotes,
        status: "PENDING",
      },
      include: {
        family: {
          include: {
            user: true,
          },
        },
        home: {
          include: {
            address: true,
          },
        },
        operator: {
          include: {
            user: true,
          },
        },
      },
    });

    // 7. Send notification (console log for MVP)
    console.log("\n=== NEW TOUR REQUEST NOTIFICATION ===");
    console.log(`Tour Request ID: ${tourRequest.id}`);
    console.log(`Family: ${family.user.firstName} ${family.user.lastName}`);
    console.log(`Home: ${home.name}`);
    console.log(`Requested Times: ${validatedData.requestedTimes.join(", ")}`);
    console.log(`Status: PENDING CONFIRMATION`);
    console.log("=====================================\n");

    return NextResponse.json({
      success: true,
      tourRequest: {
        id: tourRequest.id,
        homeId: tourRequest.homeId,
        homeName: home.name,
        status: tourRequest.status,
        requestedTimes: tourRequest.requestedTimes,
        familyNotes: tourRequest.familyNotes,
        createdAt: tourRequest.createdAt,
      },
    });
  } catch (error) {
    console.error("[Tour Request API] Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create tour request" },
      { status: 500 }
    );
  }
}
