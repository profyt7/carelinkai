
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const backgroundCheckStartSchema = z.object({
  provider: z.string().optional().default("CHECKR"),
});

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireAnyRole(["CAREGIVER"] as any);
    if (error) return error;

    const caregiver = await prisma.caregiver.findUnique({
      where: { userId: session!.user!.id! },
      select: { id: true, backgroundCheckStatus: true }
    });

    if (!caregiver) {
      return NextResponse.json({ error: "User is not registered as a caregiver" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const validationResult = backgroundCheckStartSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ error: "Invalid input", details: validationResult.error.format() }, { status: 400 });
    }

    const { provider } = validationResult.data;

    const updatedCaregiverData = await prisma.caregiver.update({
      where: { id: caregiver.id },
      data: {
        backgroundCheckStatus: "PENDING",
        backgroundCheckProvider: provider,
        backgroundCheckReportUrl: null,
      },
      select: { id: true, backgroundCheckStatus: true, backgroundCheckProvider: true }
    });

    return NextResponse.json({
      success: true,
      status: updatedCaregiverData.backgroundCheckStatus,
      provider: updatedCaregiverData.backgroundCheckProvider
    });

  } catch (error) {
    console.error("Error initiating background check:", error);
    return NextResponse.json({ error: "Failed to initiate background check" }, { status: 500 });
  }
}