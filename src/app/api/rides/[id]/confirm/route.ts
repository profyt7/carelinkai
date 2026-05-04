export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const confirmSchema = z.object({
  baseFare: z.number().positive().max(10000),
});

// POST /api/rides/[id]/confirm — provider sets fare and confirms
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PROVIDER")
    return NextResponse.json({ error: "Only providers can confirm rides" }, { status: 403 });

  const body = await req.json();
  const parsed = confirmSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  const { baseFare } = parsed.data;

  const ride = await prisma.ride.findUnique({
    where: { id: params.id },
    include: {
      provider: { select: { userId: true } },
      family: { select: { user: { select: { email: true, firstName: true } } } },
    },
  });
  if (!ride) return NextResponse.json({ error: "Ride not found" }, { status: 404 });
  if (ride.provider.userId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (ride.status !== "REQUESTED")
    return NextResponse.json({ error: "Only REQUESTED rides can be confirmed" }, { status: 400 });

  const platformFeePercent = Number(ride.platformFeePercent);
  const platformFee = Math.round(baseFare * (platformFeePercent / 100) * 100) / 100;
  const totalAmount = Math.round((baseFare + platformFee) * 100) / 100;

  const updated = await prisma.ride.update({
    where: { id: params.id },
    data: {
      status: "CONFIRMED",
      baseFare,
      platformFee,
      totalAmount,
    },
  });

  // Notify family by email (fire-and-forget)
  notifyFamilyConfirmed(ride, baseFare, platformFee, totalAmount).catch(() => {});

  return NextResponse.json({ ride: updated });
}

async function notifyFamilyConfirmed(
  ride: { id: string; scheduledAt: Date; pickupAddress: string; dropoffAddress: string; family: { user: { email: string; firstName: string } } | null },
  baseFare: number,
  platformFee: number,
  totalAmount: number
) {
  if (!process.env.RESEND_API_KEY || !ride.family) return;
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const APP_URL = process.env.NEXTAUTH_URL || "https://getcarelinkai.com";
  const scheduledStr = ride.scheduledAt.toLocaleString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", timeZoneName: "short",
  });

  await resend.emails.send({
    from: `CareLinkAI <${process.env.EMAIL_FROM || "noreply@getcarelinkai.com"}>`,
    to: [ride.family.user.email],
    subject: "Your Ride Has Been Confirmed — Complete Your Booking",
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
        <div style="background:#16a34a;padding:24px;border-radius:8px 8px 0 0">
          <h1 style="color:#fff;margin:0;font-size:20px">Ride Confirmed!</h1>
        </div>
        <div style="padding:24px;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 8px 8px">
          <p>Hi ${ride.family!.user.firstName},</p>
          <p>Your transport provider has confirmed your ride request. To secure your booking, please complete payment.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px 0;color:#6b7280;width:140px">Scheduled</td><td style="padding:8px 0;font-weight:600">${scheduledStr}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280">Pickup</td><td style="padding:8px 0">${ride.pickupAddress}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280">Dropoff</td><td style="padding:8px 0">${ride.dropoffAddress}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280">Base Fare</td><td style="padding:8px 0">$${baseFare.toFixed(2)}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280">Service Fee</td><td style="padding:8px 0">$${platformFee.toFixed(2)}</td></tr>
            <tr style="border-top:1px solid #e5e7eb"><td style="padding:8px 0;font-weight:700">Total</td><td style="padding:8px 0;font-weight:700">$${totalAmount.toFixed(2)}</td></tr>
          </table>
          <a href="${APP_URL}/rides" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin-top:8px">
            Pay &amp; Confirm Ride →
          </a>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px">CareLinkAI · Cleveland, OH</p>
        </div>
      </div>`,
  });
}
