import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/shifts/[id]/claim
 * 
 * Claims an open shift for the authenticated caregiver
 * Requires authentication and caregiver role
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

    // Find caregiver record for current user
    const caregiver = await prisma.caregiver.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (!caregiver) {
      return NextResponse.json({ error: "User is not registered as a caregiver" }, { status: 403 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "Shift ID is required" }, { status: 400 });
    }

    // Find the shift
    const shift = await prisma.caregiverShift.findUnique({
      where: { id },
      include: {
        home: {
          select: {
            name: true,
            address: true
          }
        }
      }
    });

    // Check if shift exists
    if (!shift) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }

    // Check if shift is available to claim
    if (shift.status !== "OPEN") {
      return NextResponse.json({ error: "Shift is not available for claiming" }, { status: 409 });
    }

    // Check if shift is already assigned to a caregiver
    if (shift.caregiverId) {
      return NextResponse.json({ error: "Shift is already assigned to another caregiver" }, { status: 409 });
    }

    // Update the shift
    const [updatedShift, newHire] = await prisma.$transaction([
      prisma.caregiverShift.update({
        where: { id },
        data: {
          caregiverId: caregiver.id,
          status: "ASSIGNED",
        },
        include: {
          home: {
            select: {
              name: true,
              address: true,
            },
          },
        },
      }),
      prisma.marketplaceHire.create({
        data: {
          caregiverId: caregiver.id,
          shiftId: id,
          // listingId & applicationId remain null/undefined (implicit)
        },
      }),
    ]);

    // Format address if available
    let address = "";
    if (updatedShift.home?.address) {
      const { street, city, state } = updatedShift.home.address;
      address = `${street ? street + ', ' : ''}${city}, ${state}`;
    }

    // Return success response with updated shift
    return NextResponse.json({
      success: true,
      shift: {
        id: updatedShift.id,
        homeId: updatedShift.homeId,
        homeName: updatedShift.home?.name || "Unknown",
        address,
        startTime: updatedShift.startTime,
        endTime: updatedShift.endTime,
        hourlyRate: updatedShift.hourlyRate.toString(),
        status: updatedShift.status,
        notes: updatedShift.notes
      },
      hireId: newHire.id
    });

  } catch (error) {
    console.error("Error claiming shift:", error);
    return NextResponse.json(
      { error: "Failed to claim shift" },
      { status: 500 }
    );
  }
}
