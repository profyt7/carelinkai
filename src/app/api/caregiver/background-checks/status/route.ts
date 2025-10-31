export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireAnyRole(["CAREGIVER"] as any);
    if (error) return error;

    const caregiver = await prisma.caregiver.findUnique({
      where: { userId: session!.user!.id! },
      select: { id: true, backgroundCheckStatus: true, backgroundCheckProvider: true, backgroundCheckReportUrl: true }
    });

    if (!caregiver) {
      return NextResponse.json({ error: "User is not registered as a caregiver" }, { status: 403 });
    }

    return NextResponse.json({
      status: caregiver.backgroundCheckStatus,
      provider: caregiver.backgroundCheckProvider,
      reportUrl: caregiver.backgroundCheckReportUrl
    });
  } catch (error) {
    console.error("Error fetching background check status:", error);
    return NextResponse.json({ error: "Failed to fetch background check status" }, { status: 500 });
  }
}