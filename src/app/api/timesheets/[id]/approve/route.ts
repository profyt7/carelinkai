import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Force dynamic rendering to avoid static optimization
export const dynamic = "force-dynamic";

/**
 * POST /api/timesheets/[id]/approve
 * 
 * Approves a timesheet by an operator
 * Updates the timesheet status to APPROVED and sets approvedById and approvedAt
 * 
 * Requires authentication and operator role
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get session and verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find operator record for current user
    const operator = await prisma.operator.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (!operator) {
      return NextResponse.json({ error: "User is not registered as an operator" }, { status: 403 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "Timesheet ID is required" }, { status: 400 });
    }

    // Find the timesheet and validate it belongs to a home operated by this operator
    const timesheet = await prisma.timesheet.findUnique({
      where: { id },
      include: {
        shift: {
          include: {
            home: {
              select: {
                operatorId: true
              }
            }
          }
        }
      }
    });

    // Check if timesheet exists
    if (!timesheet) {
      return NextResponse.json({ error: "Timesheet not found" }, { status: 404 });
    }

    // Check if timesheet is associated with a shift in a home operated by this operator
    if (timesheet.shift?.home?.operatorId !== operator.id) {
      return NextResponse.json({ 
        error: "You don't have permission to approve this timesheet" 
      }, { status: 403 });
    }

    // Check if timesheet is in the correct status for approval
    if (timesheet.status !== "SUBMITTED") {
      return NextResponse.json({ 
        error: "Only timesheets with SUBMITTED status can be approved",
        currentStatus: timesheet.status
      }, { status: 409 });
    }

    // Update timesheet status to APPROVED
    const updatedTimesheet = await prisma.timesheet.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedById: session.user.id,
        approvedAt: new Date()
      }
    });

    // Return success response with the updated timesheet
    return NextResponse.json({
      success: true,
      timesheet: updatedTimesheet
    });

  } catch (error) {
    console.error("Error approving timesheet:", error);
    return NextResponse.json(
      { error: "Failed to approve timesheet" },
      { status: 500 }
    );
  }
}
