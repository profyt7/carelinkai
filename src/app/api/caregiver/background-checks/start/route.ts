export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { createCandidate, createReport } from "@/lib/checkr";

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireAnyRole(["CAREGIVER"] as any);
    if (error) return error;

    const caregiver = await prisma.caregiver.findUnique({
      where: { userId: session!.user!.id! },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    });

    if (!caregiver) {
      return NextResponse.json({ error: "Not registered as a caregiver" }, { status: 403 });
    }

    if (caregiver.backgroundCheckStatus === "PENDING") {
      return NextResponse.json(
        { error: "A background check is already in progress" },
        { status: 409 }
      );
    }

    if (caregiver.backgroundCheckStatus === "CLEAR") {
      return NextResponse.json(
        { error: "Background check already passed" },
        { status: 409 }
      );
    }

    // Create or reuse Checkr candidate
    let candidateId = caregiver.checkrCandidateId;
    if (!candidateId) {
      const candidate = await createCandidate({
        firstName: caregiver.user.firstName,
        lastName: caregiver.user.lastName,
        email: caregiver.user.email,
      });
      candidateId = candidate.id;
      await prisma.caregiver.update({
        where: { id: caregiver.id },
        data: { checkrCandidateId: candidateId },
      });
    }

    // Create report
    const report = await createReport(candidateId, "basic");

    // Record the order
    const order = await prisma.backgroundCheckOrder.create({
      data: {
        caregiverId: caregiver.id,
        orderedByType: "SELF",
        orderedByUserId: session!.user!.id!,
        status: "PENDING",
        package: "basic",
        checkrReportId: report.id,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      },
    });

    // Update caregiver status to PENDING
    await prisma.caregiver.update({
      where: { id: caregiver.id },
      data: {
        backgroundCheckStatus: "PENDING",
        backgroundCheckProvider: "CHECKR",
        backgroundCheckReportUrl: null,
      },
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      reportId: report.id,
      status: "PENDING",
      message: "Background check initiated. Results typically arrive within 1–3 business days.",
    });
  } catch (error) {
    console.error("Error starting background check:", error);
    return NextResponse.json({ error: "Failed to initiate background check" }, { status: 500 });
  }
}

// GET — return current status for the logged-in caregiver
export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireAnyRole(["CAREGIVER"] as any);
    if (error) return error;

    const caregiver = await prisma.caregiver.findUnique({
      where: { userId: session!.user!.id! },
      select: {
        backgroundCheckStatus: true,
        backgroundCheckProvider: true,
        backgroundCheckReportUrl: true,
        backgroundCheckOrders: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { status: true, createdAt: true, completedAt: true, expiresAt: true },
        },
      },
    });

    if (!caregiver) {
      return NextResponse.json({ error: "Not registered as a caregiver" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      status: caregiver.backgroundCheckStatus,
      provider: caregiver.backgroundCheckProvider,
      reportUrl: caregiver.backgroundCheckReportUrl,
      latestOrder: caregiver.backgroundCheckOrders[0] ?? null,
    });
  } catch (error) {
    console.error("Error fetching background check status:", error);
    return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 });
  }
}
