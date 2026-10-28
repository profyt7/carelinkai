export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { createCandidate, createReport, CHECKR_PACKAGES } from "@/lib/checkr";

/**
 * POST /api/provider/credentials/order-background-check
 * Initiates a Checkr background check for the logged-in provider.
 * Creates a ProviderCredential of type BACKGROUND_CHECK, status PENDING.
 * Checkr webhook will update status when complete.
 */
export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireAnyRole(["PROVIDER"] as any);
    if (error) return error;

    const provider = await prisma.provider.findUnique({
      where: { userId: session!.user!.id! },
      select: { id: true, contactName: true, contactEmail: true },
    });
    if (!provider) {
      return NextResponse.json({ error: "Not registered as a provider" }, { status: 403 });
    }

    // Check if a BACKGROUND_CHECK credential already exists and is PENDING or VERIFIED
    const existing = await prisma.providerCredential.findFirst({
      where: {
        providerId: provider.id,
        type: "BACKGROUND_CHECK",
        status: { in: ["PENDING", "VERIFIED"] },
      },
      select: { id: true, status: true },
    });

    if (existing) {
      return NextResponse.json({
        success: false,
        error:
          existing.status === "VERIFIED"
            ? "Background check already verified."
            : "A background check is already in progress.",
        alreadyOrdered: existing.status === "PENDING",
        alreadyCleared: existing.status === "VERIFIED",
      }, { status: 409 });
    }

    // Parse contact name into first/last
    const nameParts = provider.contactName.trim().split(/\s+/);
    const firstName = nameParts[0] ?? provider.contactName;
    const lastName = nameParts.slice(1).join(" ") || firstName;

    // Create Checkr candidate
    const candidate = await createCandidate({
      firstName,
      lastName,
      email: provider.contactEmail,
    });

    // Create Checkr report (basic package — free for the provider)
    const report = await createReport(candidate.id, CHECKR_PACKAGES.BASIC.checkrName);

    // Create ProviderCredential record
    const credential = await prisma.providerCredential.create({
      data: {
        providerId: provider.id,
        type: "BACKGROUND_CHECK",
        status: "PENDING",
        checkrReportId: report.id,
        notes: `Ordered via CareLinkAI. Checkr candidate: ${candidate.id}`,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      },
    });

    // Notify provider
    await prisma.notification.create({
      data: {
        userId: session!.user!.id!,
        type: "SYSTEM",
        title: "Background Check Initiated",
        message: `Your background check has been ordered via Checkr. Results typically arrive within ${CHECKR_PACKAGES.BASIC.turnaround}.`,
        isRead: false,
      },
    });

    return NextResponse.json({
      success: true,
      credentialId: credential.id,
      reportId: report.id,
      turnaround: CHECKR_PACKAGES.BASIC.turnaround,
    });
  } catch (err) {
    console.error("Provider background check order failed:", err);
    return NextResponse.json({ error: "Failed to initiate background check" }, { status: 500 });
  }
}
