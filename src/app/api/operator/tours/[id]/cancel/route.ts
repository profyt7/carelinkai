/**
 * POST /api/operator/tours/[id]/cancel
 * Cancel a tour
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { z } from "zod";
import { sendTourCancellationEmail } from "@/lib/notifications/tour-notifications";

const cancelSchema = z.object({
  reason: z.string().optional(),
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
    if (!hasPermission(session.user.role, PERMISSIONS.TOURS_CANCEL)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 3. Validate request
    const body = await request.json();
    const validatedData = cancelSchema.parse(body);

    // 4. Determine if operator or family
    const isOperator = session.user.role === "OPERATOR" || session.user.role === "ADMIN";
    
    let operator = null;
    let family = null;

    if (isOperator) {
      operator = await prisma.operator.findUnique({
        where: { userId: session.user.id },
      });
    } else {
      family = await prisma.family.findUnique({
        where: { userId: session.user.id },
      });
    }

    // 5. Get tour and verify ownership
    const tour = await prisma.tourRequest.findUnique({
      where: { id: params.id },
      include: {
        home: { include: { address: true } },
        family: { include: { user: true } },
        operator: { include: { user: true } },
      },
    });

    if (!tour) {
      return NextResponse.json({ error: "Tour not found" }, { status: 404 });
    }

    // Verify ownership
    if (operator && tour.operatorId !== operator.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (family && tour.familyId !== family.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 6. Cancel tour
    const updatedTour = await prisma.tourRequest.update({
      where: { id: params.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledBy: session.user.id,
        cancellationReason: validatedData.reason,
      },
    });

    // 7. Send notification
    await sendTourCancellationEmail(
      {
        tourId: tour.id,
        homeName: tour.home.name,
        homeAddress: `${tour.home.address?.street}, ${tour.home.address?.city}`,
        confirmedTime: tour.confirmedTime || new Date(),
        familyName: `${tour.family.user.firstName} ${tour.family.user.lastName}`,
        familyEmail: tour.family.user.email,
        operatorName: tour.operator.user.firstName,
        operatorEmail: tour.operator.user.email,
      },
      isOperator ? "operator" : "family",
      validatedData.reason
    );

    return NextResponse.json({ success: true, tour: updatedTour });
  } catch (error) {
    console.error("[Cancel Tour API] Error:", error);
    return NextResponse.json(
      { error: "Failed to cancel tour" },
      { status: 500 }
    );
  }
}
