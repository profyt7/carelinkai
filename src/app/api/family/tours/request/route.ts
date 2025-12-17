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
    console.log("[Tour Request API] POST request received");

    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.error("[Tour Request API] Unauthorized - no session");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Tour Request API] User authenticated:", session.user.id, session.user.role);

    // 2. Authorization - Check if user has permission
    if (!hasPermission(session.user.role, PERMISSIONS.TOURS_REQUEST)) {
      console.error("[Tour Request API] Forbidden - insufficient permissions for role:", session.user.role);
      return NextResponse.json({ error: "Forbidden - insufficient permissions" }, { status: 403 });
    }

    // 3. Validate request body
    const body = await request.json();
    console.log("[Tour Request API] Request body:", JSON.stringify(body, null, 2));
    
    const validatedData = tourRequestSchema.parse(body);
    console.log("[Tour Request API] Data validated successfully");

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
    // NOTE: requestedTimes is stored as JSON in Prisma, so we keep them as ISO strings
    // Converting to Date objects would cause serialization errors
    console.log("[Tour Request API] Creating tour request with data:", {
      familyId: family.id,
      homeId: home.id,
      operatorId: home.operatorId,
      requestedTimes: validatedData.requestedTimes,
      familyNotes: validatedData.familyNotes,
    });

    const tourRequest = await prisma.tourRequest.create({
      data: {
        familyId: family.id,
        homeId: home.id,
        operatorId: home.operatorId,
        requestedTimes: validatedData.requestedTimes, // Keep as ISO strings for JSON field
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

    console.log("[Tour Request API] Tour request created successfully:", tourRequest.id);

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
    
    // Log detailed error information
    if (error instanceof Error) {
      console.error("[Tour Request API] Error name:", error.name);
      console.error("[Tour Request API] Error message:", error.message);
      console.error("[Tour Request API] Error stack:", error.stack);
    }

    if (error instanceof z.ZodError) {
      console.error("[Tour Request API] Validation error details:", JSON.stringify(error.errors, null, 2));
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    // Return detailed error message in development, generic in production
    const errorMessage = process.env.NODE_ENV === "development" && error instanceof Error
      ? error.message
      : "Failed to create tour request";

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
