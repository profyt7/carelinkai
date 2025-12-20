
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Validate webhook payload
const checkrWebhookSchema = z.object({
  caregiverId: z.string().min(1, "Caregiver ID is required"),
  status: z.enum(["PENDING", "CLEAR", "CONSIDER", "FAILED", "EXPIRED"], {
    errorMap: () => ({ message: "Status must be PENDING, CLEAR, CONSIDER, FAILED, or EXPIRED" }),
  }),
  reportUrl: z.string().url().optional(),
});

/**
 * POST /api/webhooks/checkr
 * 
 * Handles background check webhook events from Checkr
 * Updates caregiver background check status based on webhook data
 * No authentication required (webhook endpoint)
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json().catch(() => ({}));
    
    // Validate input
    const validationResult = checkrWebhookSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid webhook payload", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { caregiverId, status, reportUrl } = validationResult.data;

    // Find caregiver record
    const caregiver = await prisma.caregiver.findUnique({
      where: { id: caregiverId },
      select: { id: true }
    });

    if (!caregiver) {
      return NextResponse.json({ error: "Caregiver not found" }, { status: 404 });
    }

    // Update caregiver background check status
    await prisma.caregiver.update({
      where: { id: caregiverId },
      data: {
        backgroundCheckStatus: status,
        backgroundCheckReportUrl: reportUrl || undefined,
      }
    });

    // Return success response
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error processing background check webhook:", error);
    return NextResponse.json(
      { error: "Failed to process background check webhook" },
      { status: 500 }
    );
  }
}
