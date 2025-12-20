/**
 * POST /api/operator/tours/[id]/reschedule
 * Reschedule a tour
 */

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { z } from "zod";
import { sendTourReschedulingEmail } from "@/lib/notifications/tour-notifications";

const rescheduleSchema = z.object({
  newTime: z.string().datetime(),
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
    if (!hasPermission(session.user.role, PERMISSIONS.TOURS_RESCHEDULE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 3. Validate request
    const body = await request.json();
    const validatedData = rescheduleSchema.parse(body);

    // 4. Get operator
    const operator = await prisma.operator.findUnique({
      where: { userId: session.user.id },
    });

    if (!operator && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Operator not found" }, { status: 404 });
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

    if (operator && tour.operatorId !== operator.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const oldTime = tour.confirmedTime;

    // 6. Update tour
    const updatedTour = await prisma.tourRequest.update({
      where: { id: params.id },
      data: {
        confirmedTime: new Date(validatedData.newTime),
        status: "RESCHEDULED",
      },
      include: {
        home: { include: { address: true } },
        family: { include: { user: true } },
      },
    });

    // 7. Send notifications
    if (oldTime) {
      await sendTourReschedulingEmail(
        {
          tourId: tour.id,
          homeName: tour.home.name,
          homeAddress: `${tour.home.address?.street}, ${tour.home.address?.city}`,
          confirmedTime: oldTime,
          familyName: `${tour.family.user.firstName} ${tour.family.user.lastName}`,
          familyEmail: tour.family.user.email,
          operatorName: tour.operator.user.firstName,
          operatorEmail: tour.operator.user.email,
        },
        new Date(validatedData.newTime)
      );
    }

    return NextResponse.json({ success: true, tour: updatedTour });
  } catch (error) {
    console.error("[Reschedule Tour API] Error:", error);
    return NextResponse.json(
      { error: "Failed to reschedule tour" },
      { status: 500 }
    );
  }
}
