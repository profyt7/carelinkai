export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2023-10-16" });

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ride = await prisma.ride.findUnique({
    where: { id: params.id },
    include: {
      family: { select: { id: true, user: { select: { firstName: true, lastName: true, email: true, phone: true } } } },
      provider: { select: { id: true, businessName: true, contactEmail: true, contactPhone: true, userId: true } },
    },
  });
  if (!ride) return NextResponse.json({ error: "Ride not found" }, { status: 404 });

  const role = session.user.role as string;
  if (role === "FAMILY") {
    const family = await prisma.family.findUnique({ where: { userId: session.user.id }, select: { id: true } });
    if (!family || family.id !== ride.familyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } else if (role === "OPERATOR" || role === "STAFF") {
    const operator = await prisma.operator.findUnique({ where: { userId: session.user.id }, select: { id: true } });
    if (!operator || operator.id !== ride.operatorId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } else if (role === "PROVIDER") {
    if (ride.provider.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } else if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ ride });
}

// PATCH = cancel with optional Stripe refund for PAID rides
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { cancelReason } = body as { cancelReason?: string };

  const ride = await prisma.ride.findUnique({
    where: { id: params.id },
    include: {
      provider: { select: { userId: true, contactEmail: true, businessName: true, contactName: true } },
      family: { select: { user: { select: { email: true, firstName: true } } } },
    },
  });
  if (!ride) return NextResponse.json({ error: "Ride not found" }, { status: 404 });
  if (["COMPLETED", "CANCELED"].includes(ride.status))
    return NextResponse.json({ error: "Cannot cancel a completed or already-canceled ride" }, { status: 400 });

  const role = session.user.role as string;
  let canceledBy: string;

  if (role === "FAMILY") {
    const family = await prisma.family.findUnique({ where: { userId: session.user.id }, select: { id: true } });
    if (!family || family.id !== ride.familyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    canceledBy = "FAMILY";
  } else if (role === "OPERATOR" || role === "STAFF") {
    const operator = await prisma.operator.findUnique({ where: { userId: session.user.id }, select: { id: true } });
    if (!operator || operator.id !== ride.operatorId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    canceledBy = "OPERATOR";
  } else if (role === "PROVIDER") {
    if (ride.provider.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    canceledBy = "PROVIDER";
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Issue Stripe refund if ride was already paid
  if (ride.status === "PAID" && ride.stripePaymentIntentId) {
    try {
      await stripe.refunds.create({ payment_intent: ride.stripePaymentIntentId });
    } catch (err: any) {
      console.error("[Rides] Stripe refund failed:", err?.message);
      // Continue with cancellation even if refund fails — admin can handle manually
    }
  }

  const updated = await prisma.ride.update({
    where: { id: params.id },
    data: { status: "CANCELED", canceledBy, cancelReason: cancelReason ?? null },
  });

  // Notify the other party
  notifyCancellation(ride, canceledBy).catch(() => {});

  return NextResponse.json({ ride: updated });
}

async function notifyCancellation(
  ride: any,
  canceledBy: string
) {
  if (!process.env.RESEND_API_KEY) return;
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const APP_URL = process.env.NEXTAUTH_URL || "https://getcarelinkai.com";

  const scheduledStr = new Date(ride.scheduledAt).toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });

  // If provider canceled, notify the booker (family email on ride)
  if (canceledBy === "PROVIDER" && ride.family?.user?.email) {
    await resend.emails.send({
      from: `CareLinkAI <${process.env.EMAIL_FROM || "noreply@getcarelinkai.com"}>`,
      to: [ride.family.user.email],
      subject: "Your Ride Has Been Canceled",
      html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <h2>Ride Canceled</h2>
        <p>Hi ${ride.family.user.firstName},</p>
        <p>Unfortunately, the transport provider has canceled your ride scheduled for <strong>${scheduledStr}</strong>.</p>
        ${ride.status === "PAID" ? "<p>A full refund has been issued and should appear within 5–10 business days.</p>" : ""}
        <p>Please <a href="${APP_URL}/marketplace?serviceType=transportation">search for another provider</a> or contact us for assistance.</p>
      </div>`,
    });
  }
}
