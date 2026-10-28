/**
 * GET /api/cron/ride-reminders
 *
 * Sends 24-hour reminder emails to both the booker and the transport provider
 * for rides scheduled within the next 23–25 hours.
 * Call once daily via Render cron: Authorization: Bearer <CRON_SECRET>
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const windowEnd   = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const rides = await prisma.ride.findMany({
    where: {
      status: { in: ["PAID", "IN_PROGRESS"] },
      scheduledAt: { gte: windowStart, lte: windowEnd },
    },
    include: {
      provider: { select: { contactEmail: true, contactName: true, businessName: true } },
      family:   { select: { user: { select: { email: true, firstName: true } } } },
      operator: { select: { user: { select: { email: true, firstName: true } } } },
    },
  });

  if (rides.length === 0) {
    return NextResponse.json({ sent: 0, message: "No upcoming rides in window" });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ sent: 0, message: "RESEND_API_KEY not configured" });
  }

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const APP_URL = process.env.NEXTAUTH_URL || "https://getcarelinkai.com";
  let sent = 0;

  for (const ride of rides) {
    const scheduledStr = ride.scheduledAt.toLocaleString("en-US", {
      weekday: "long", month: "long", day: "numeric",
      hour: "numeric", minute: "2-digit", timeZoneName: "short",
    });
    const passengerLabel = ride.residentName ?? (
      ride.family ? `${ride.family.user.firstName}` : ride.operator?.user?.firstName ?? "Passenger"
    );

    // Email the booker
    const bookerEmail = ride.family?.user?.email ?? ride.operator?.user?.email;
    const bookerFirstName = ride.family?.user?.firstName ?? ride.operator?.user?.firstName ?? "there";
    if (bookerEmail) {
      await resend.emails.send({
        from: `CareLinkAI <${process.env.EMAIL_FROM || "noreply@getcarelinkai.com"}>`,
        to: [bookerEmail],
        subject: `Ride Reminder — Tomorrow at ${ride.scheduledAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`,
        html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
          <h2>Your ride is tomorrow</h2>
          <p>Hi ${bookerFirstName},</p>
          <p>Just a reminder that ${ride.residentName ? `<strong>${ride.residentName}'s</strong> ride` : "your ride"} with <strong>${ride.provider.businessName}</strong> is scheduled for:</p>
          <p style="font-size:18px;font-weight:700;color:#4f46e5">${scheduledStr}</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:6px 0;color:#6b7280;width:100px">Pickup</td><td style="padding:6px 0">${ride.pickupAddress}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280">Dropoff</td><td style="padding:6px 0">${ride.dropoffAddress}</td></tr>
          </table>
          <a href="${APP_URL}/rides" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">View Ride Details →</a>
        </div>`,
      }).catch(() => {});
      sent++;
    }

    // Email the provider
    await resend.emails.send({
      from: `CareLinkAI <${process.env.EMAIL_FROM || "noreply@getcarelinkai.com"}>`,
      to: [ride.provider.contactEmail],
      subject: `Ride Tomorrow — ${passengerLabel}`,
      html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <h2>Upcoming Ride Tomorrow</h2>
        <p>Hi ${ride.provider.contactName},</p>
        <p>You have a confirmed ride scheduled for tomorrow:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:6px 0;color:#6b7280;width:120px">Passenger</td><td style="padding:6px 0;font-weight:600">${passengerLabel}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Scheduled</td><td style="padding:6px 0;font-weight:600">${scheduledStr}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Pickup</td><td style="padding:6px 0">${ride.pickupAddress}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Dropoff</td><td style="padding:6px 0">${ride.dropoffAddress}</td></tr>
          ${ride.mobilityNeeds ? `<tr><td style="padding:6px 0;color:#6b7280">Accessibility</td><td style="padding:6px 0">${ride.mobilityNeeds}</td></tr>` : ""}
        </table>
        <a href="${APP_URL}/rides" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">View Dispatch →</a>
      </div>`,
    }).catch(() => {});
    sent++;
  }

  return NextResponse.json({ sent, rides: rides.length });
}
