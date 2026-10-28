import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Force dynamic rendering to avoid static optimization
export const dynamic = "force-dynamic";

/**
 * POST /api/timesheets/start
 * 
 * Starts a timesheet for an assigned shift for the authenticated caregiver
 * Creates a timesheet record and updates the shift status to IN_PROGRESS
 * 
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
      select: { id: true }
    });

    if (!caregiver) {
      return NextResponse.json({ error: "User is not registered as a caregiver" }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { shiftId, startTime } = body;

    if (!shiftId) {
      return NextResponse.json({ error: "Shift ID is required" }, { status: 400 });
    }

    // Find the shift
    const shift = await prisma.caregiverShift.findUnique({
      where: { id: shiftId },
      include: {
        timesheet: true
      }
    });

    // Check if shift exists
    if (!shift) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }

    // Check if shift is assigned to this caregiver
    if (shift.caregiverId !== caregiver.id) {
      return NextResponse.json({ error: "Shift is not assigned to this caregiver" }, { status: 403 });
    }

    // Check if shift is in the correct status
    if (shift.status !== "ASSIGNED") {
      return NextResponse.json({ 
        error: "Shift must be in ASSIGNED status to start a timesheet",
        currentStatus: shift.status
      }, { status: 409 });
    }

    // Check if timesheet already exists for this shift
    if (shift.timesheet) {
      return NextResponse.json({ 
        error: "A timesheet already exists for this shift",
        timesheetId: shift.timesheet.id,
        timesheetStatus: shift.timesheet.status
      }, { status: 409 });
    }

    // Determine start time (use provided time or current time)
    const effectiveStartTime = startTime ? new Date(startTime) : new Date();

    // Create timesheet and update shift status in a transaction
    const [updatedShift, newTimesheet] = await prisma.$transaction([
      prisma.caregiverShift.update({
        where: { id: shiftId },
        data: {
          status: "IN_PROGRESS"
        }
      }),
      prisma.timesheet.create({
        data: {
          shiftId,
          caregiverId: caregiver.id,
          startTime: effectiveStartTime,
          status: "DRAFT"
        }
      })
    ]);

    // Return success response with the new timesheet
    return NextResponse.json({
      success: true,
      timesheet: newTimesheet
    });

  } catch (error) {
    console.error("Error starting timesheet:", error);
    return NextResponse.json(
      { error: "Failed to start timesheet" },
      { status: 500 }
    );
  }
}
