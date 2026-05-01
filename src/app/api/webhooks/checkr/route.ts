export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCheckrWebhook, mapCheckrStatus } from "@/lib/checkr";

/**
 * POST /api/webhooks/checkr
 * Receives Checkr webhook events when a background check report completes.
 * Checkr sends: { type, data: { object: { id, status, candidate_id, ... } } }
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-checkr-signature") ?? "";

    if (!verifyCheckrWebhook(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const type: string = payload.type ?? "";
    const reportData = payload.data?.object;

    // Only handle report completion events
    if (!type.startsWith("report.") || !reportData) {
      return NextResponse.json({ received: true });
    }

    const checkrReportId: string = reportData.id;
    const checkrStatus: string = reportData.status;
    const reportUrl: string | undefined = reportData.report_url;
    const completedAt: string | undefined = reportData.completed_at;

    const mappedStatus = mapCheckrStatus(checkrStatus);

    // Find the order by Checkr report ID
    const order = await prisma.backgroundCheckOrder.findUnique({
      where: { checkrReportId },
      select: { id: true, caregiverId: true },
    });

    if (!order) {
      // Fallback: try to find by caregiverId in the report (for older orders without reportId)
      const candidateId: string | undefined = reportData.candidate_id;
      if (candidateId) {
        const caregiver = await prisma.caregiver.findUnique({
          where: { checkrCandidateId: candidateId },
          select: { id: true },
        });
        if (caregiver) {
          await updateCaregiverStatus(caregiver.id, mappedStatus, reportUrl, completedAt);
        }
      }
      return NextResponse.json({ received: true });
    }

    // Update the specific order
    await prisma.backgroundCheckOrder.update({
      where: { id: order.id },
      data: {
        status: mappedStatus,
        reportUrl: reportUrl ?? undefined,
        completedAt: completedAt ? new Date(completedAt) : new Date(),
      },
    });

    // Update the caregiver's top-level status (use the most favorable result across all orders)
    await updateCaregiverStatus(order.caregiverId, mappedStatus, reportUrl, completedAt);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Checkr webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

async function updateCaregiverStatus(
  caregiverId: string,
  status: "PENDING" | "CLEAR" | "CONSIDER" | "FAILED" | "EXPIRED",
  reportUrl?: string,
  completedAt?: string
) {
  await prisma.caregiver.update({
    where: { id: caregiverId },
    data: {
      backgroundCheckStatus: status,
      backgroundCheckReportUrl: reportUrl ?? undefined,
    },
  });

  // Notify caregiver of result
  if (status === "CLEAR" || status === "CONSIDER" || status === "FAILED") {
    const caregiver = await prisma.caregiver.findUnique({
      where: { id: caregiverId },
      select: { userId: true },
    });
    if (caregiver) {
      const messages: Record<string, string> = {
        CLEAR:
          "Your background check came back clear! A verified badge is now displayed on your profile.",
        CONSIDER:
          "Your background check requires review. A specialist will contact you with next steps.",
        FAILED:
          "Your background check could not be cleared. Please contact support if you have questions.",
      };
      await prisma.notification.create({
        data: {
          userId: caregiver.userId,
          type: "GENERAL",
          title: "Background Check Update",
          message: messages[status] ?? "Your background check status has been updated.",
          isRead: false,
        },
      });
    }
  }
}
