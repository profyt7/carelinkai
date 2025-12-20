/**
 * API Route: /api/cron/reminders/schedule
 * 
 * This endpoint schedules notifications for upcoming appointments.
 * It is designed to be called by a cron job or scheduler.
 * 
 * Authentication: Requires CRON_SECRET header
 * Method: POST only
 * Body: { windowMinutes?: number }
 */

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { scheduleUpcomingAppointmentReminders } from "@/lib/services/reminders";

/**
 * POST handler for scheduling appointment reminders
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = request.headers.get("x-cron-secret");
    if (cronSecret !== process.env['CRON_SECRET']) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const windowMinutes = parseInt(body.windowMinutes, 10) || 1440;

    // Call reminder scheduling service
    const result = await scheduleUpcomingAppointmentReminders(windowMinutes);

    // Return success response
    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error("Error scheduling reminders:", error);
    
    return NextResponse.json(
      {
        success: false,
        message: "Failed to schedule reminders",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
