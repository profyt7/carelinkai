import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Validate background check start input
const backgroundCheckStartSchema = z.object({
  provider: z.string().optional().default("CHECKR"),
});

/**
 * POST /api/caregiver/background-checks/start
 * 
 * Initiates a background check for the authenticated caregiver
 * Requires authentication and caregiver role
 */
export async function POST(request: NextRequest) {
  try {
    // Get session and verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find caregiver record for current user
    const caregiver = await prisma.caregiver.findUnique({
      where: { userId: session.user.id },
      select: { id: true, backgroundCheckStatus: true }
    });

    if (!caregiver) {
      return NextResponse.json({ error: "User is not registered as a caregiver" }, { status: 403 });
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    
    // Validate input
    const validationResult = backgroundCheckStartSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { provider } = validationResult.data;

    // Update caregiver record
    const updatedCaregiverData = await prisma.caregiver.update({
      where: { id: caregiver.id },
      data: {
        backgroundCheckStatus: "PENDING",
        backgroundCheckProvider: provider,
        backgroundCheckReportUrl: null,
      },
      select: {
        id: true,
        backgroundCheckStatus: true,
        backgroundCheckProvider: true,
      }
    });

    // Return success response
    return NextResponse.json({
      success: true,
      status: updatedCaregiverData.backgroundCheckStatus,
      provider: updatedCaregiverData.backgroundCheckProvider
    });

  } catch (error) {
    console.error("Error initiating background check:", error);
    return NextResponse.json(
      { error: "Failed to initiate background check" },
      { status: 500 }
    );
  }
}
