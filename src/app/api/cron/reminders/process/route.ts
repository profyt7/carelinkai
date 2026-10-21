/**
 * API Route: /api/cron/reminders/process
 * 
 * This endpoint processes due scheduled notifications and sends them
 * via appropriate channels (email, SMS, push, in-app).
 * It is designed to be called by a cron job or scheduler.
 * 
 * Authentication: Requires CRON_SECRET header
 * Method: POST only
 * Body: { maxPerRun?: number }
 */

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { checkCronAuth, cronUnauthorized } from "@/lib/cron-auth";
import { processDueScheduledNotifications } from "@/lib/services/reminders";

/**
 * POST handler for processing due notifications
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret — fails CLOSED (an unset CRON_SECRET used to pass:
    // `undefined !== undefined` is false). Reason is logged, never the secret (OL-160).
    const auth = checkCronAuth(request.headers);
    if (!auth.ok) {
      cronUnauthorized(`reminders/process`, auth);
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const maxPerRun = parseInt(body.maxPerRun, 10) || 100;

    // Call notification processing service
    const result = await processDueScheduledNotifications(maxPerRun);

    // Return success response
    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error("Error processing notifications:", error);
    
    return NextResponse.json(
      {
        success: false,
        message: "Failed to process notifications",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
