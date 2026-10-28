import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Force dynamic rendering to avoid static optimization
export const dynamic = "force-dynamic";

/**
 * POST /api/timesheets/end
 * 
 * Ends a timesheet for an in-progress shift for the authenticated caregiver
 * Updates the timesheet record with end time and updates the shift status to COMPLETED
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
    const { timesheetId, endTime, breakMinutes, notes } = body;

    if (!timesheetId) {
      return NextResponse.json({ error: "Timesheet ID is required" }, { status: 400 });
    }

    // Find the timesheet
    const timesheet = await prisma.timesheet.findUnique({
      where: { id: timesheetId },
      include: {
        shift: true
      }
    });

    // Check if timesheet exists
    if (!timesheet) {
      return NextResponse.json({ error: "Timesheet not found" }, { status: 404 });
    }

    // Check if timesheet belongs to this caregiver
    if (timesheet.caregiverId !== caregiver.id) {
      return NextResponse.json({ error: "Timesheet does not belong to this caregiver" }, { status: 403 });
    }

    // Check if timesheet has already been ended
    if (timesheet.endTime) {
      return NextResponse.json({ 
        error: "Timesheet has already been ended",
        endTime: timesheet.endTime
      }, { status: 409 });
    }

    // Determine end time (use provided time or current time)
    const effectiveEndTime = endTime ? new Date(endTime) : new Date();
    
    // Determine break minutes (use provided value or default to 0)
    const effectiveBreakMinutes = breakMinutes !== undefined ? breakMinutes : 0;

    // Update timesheet and shift status in a transaction
    const [updatedShift, updatedTimesheet] = await prisma.$transaction([
      prisma.caregiverShift.update({
        where: { id: timesheet.shiftId },
        data: {
          status: "COMPLETED"
        }
      }),
      prisma.timesheet.update({
        where: { id: timesheetId },
        data: {
          endTime: effectiveEndTime,
          breakMinutes: effectiveBreakMinutes,
          status: "SUBMITTED",
          notes: notes || timesheet.notes // Keep existing notes if not provided
        }
      })
    ]);

    // Return success response with the updated timesheet
    return NextResponse.json({
      success: true,
      timesheet: updatedTimesheet
    });

  } catch (error) {
    console.error("Error ending timesheet:", error);
    return NextResponse.json(
      { error: "Failed to end timesheet" },
      { status: 500 }
    );
  }
}
