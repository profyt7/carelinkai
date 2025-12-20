/**
 * POST /api/operator/tours/[id]/confirm
 * Confirm a tour request
 */

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { z } from "zod";
import { sendTourConfirmationEmail } from "@/lib/notifications/tour-notifications";

const confirmSchema = z.object({
  confirmedTime: z.string().datetime(),
  operatorNotes: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Authorization
    if (!hasPermission(session.user.role, PERMISSIONS.TOURS_CONFIRM)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 3. Validate request body
    const body = await request.json();
    const validatedData = confirmSchema.parse(body);

    // 4. Get operator record
    const operator = await prisma.operator.findUnique({
      where: { userId: session.user.id },
      include: { user: true },
    });

    if (!operator) {
      return NextResponse.json({ error: "Operator not found" }, { status: 404 });
    }

    // 5. Get tour request and verify ownership
    const tour = await prisma.tourRequest.findUnique({
      where: { id: params.id },
      include: {
        home: { include: { address: true } },
        family: { include: { user: true } },
      },
    });

    if (!tour) {
      return NextResponse.json({ error: "Tour not found" }, { status: 404 });
    }

    if (tour.operatorId !== operator.id) {
      return NextResponse.json(
        { error: "Forbidden - not your tour" },
        { status: 403 }
      );
    }

    // 6. Update tour request
    const updatedTour = await prisma.tourRequest.update({
      where: { id: params.id },
      data: {
        status: "CONFIRMED",
        confirmedTime: new Date(validatedData.confirmedTime),
        operatorNotes: validatedData.operatorNotes,
      },
      include: {
        home: { include: { address: true } },
        family: { include: { user: true } },
        operator: { include: { user: true } },
      },
    });

    // 7. Send confirmation emails
    await sendTourConfirmationEmail({
      tourId: updatedTour.id,
      homeName: updatedTour.home.name,
      homeAddress: `${updatedTour.home.address?.street}, ${updatedTour.home.address?.city}, ${updatedTour.home.address?.state}`,
      confirmedTime: updatedTour.confirmedTime!,
      familyName: `${updatedTour.family.user.firstName} ${updatedTour.family.user.lastName}`,
      familyEmail: updatedTour.family.user.email,
      operatorName: updatedTour.operator.user.firstName,
      operatorEmail: updatedTour.operator.user.email,
      familyNotes: updatedTour.familyNotes || undefined,
      operatorNotes: updatedTour.operatorNotes || undefined,
    });

    return NextResponse.json({ success: true, tour: updatedTour });
  } catch (error) {
    console.error("[Confirm Tour API] Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to confirm tour" },
      { status: 500 }
    );
  }
}
