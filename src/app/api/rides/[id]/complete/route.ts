export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/rides/[id]/complete — provider marks ride as COMPLETED
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PROVIDER")
    return NextResponse.json({ error: "Only providers can complete rides" }, { status: 403 });

  const ride = await prisma.ride.findUnique({
    where: { id: params.id },
    include: { provider: { select: { userId: true, businessName: true } } },
  });
  if (!ride) return NextResponse.json({ error: "Ride not found" }, { status: 404 });
  if (ride.provider.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (ride.status !== "IN_PROGRESS")
    return NextResponse.json({ error: "Only IN_PROGRESS rides can be completed" }, { status: 400 });

  const updated = await prisma.ride.update({
    where: { id: params.id },
    data: { status: "COMPLETED", actualDropoffAt: new Date() },
  });

  // Notify booker that ride is complete
  notifyRideComplete(ride).catch(() => {});

  return NextResponse.json({ ride: updated });
}

async function notifyRideComplete(ride: any) {
  if (!process.env.RESEND_API_KEY) return;

  // Load booker email
  const full = await prisma.ride.findUnique({
    where: { id: ride.id },
    include: {
      family: { select: { user: { select: { email: true, firstName: true } } } },
      operator: { select: { user: { select: { email: true, firstName: true } } } },
    },
  });
  if (!full) return;

  const bookerEmail = full.family?.user?.email ?? full.operator?.user?.email;
  const bookerFirstName = full.family?.user?.firstName ?? full.operator?.user?.firstName ?? "there";
  if (!bookerEmail) return;

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const APP_URL = process.env.NEXTAUTH_URL || "https://getcarelinkai.com";

  await resend.emails.send({
    from: `CareLinkAI <${process.env.EMAIL_FROM || "noreply@getcarelinkai.com"}>`,
    to: [bookerEmail],
    subject: "Ride Completed",
    html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
      <h2 style="color:#16a34a">Ride Completed ✓</h2>
      <p>Hi ${bookerFirstName},</p>
      <p>Your ride${ride.residentName ? ` for <strong>${ride.residentName}</strong>` : ""} with <strong>${ride.provider.businessName}</strong> has been completed.</p>
      <p style="color:#6b7280;font-size:14px">${ride.pickupAddress} → ${ride.dropoffAddress}</p>
      <a href="${APP_URL}/rides" style="display:inline-block;background:#16a34a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;margin-top:12px">View Ride History →</a>
    </div>`,
  });
}
