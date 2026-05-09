export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2023-10-16" });

// POST /api/rides/[id]/pay — family initiates Stripe Checkout for a confirmed ride
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "FAMILY")
    return NextResponse.json({ error: "Only family accounts can pay for rides" }, { status: 403 });

  const family = await prisma.family.findUnique({ where: { userId: session.user.id }, select: { id: true } });
  if (!family) return NextResponse.json({ error: "Family profile not found" }, { status: 404 });

  const ride = await prisma.ride.findUnique({
    where: { id: params.id },
    include: { provider: { select: { businessName: true } } },
  });
  if (!ride) return NextResponse.json({ error: "Ride not found" }, { status: 404 });
  if (ride.familyId !== family.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (ride.status !== "CONFIRMED")
    return NextResponse.json({ error: "Only confirmed rides can be paid" }, { status: 400 });
  if (!ride.totalAmount)
    return NextResponse.json({ error: "Ride total amount not set" }, { status: 400 });

  const APP_URL = (() => {
    const proto = req.headers.get("x-forwarded-proto") || "https";
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "getcarelinkai.com";
    return `${proto}://${host}`;
  })();
  const totalCents = Math.round(Number(ride.totalAmount) * 100);

  const scheduledStr = ride.scheduledAt.toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: totalCents,
          product_data: {
            name: `Ride — ${scheduledStr}`,
            description: `${ride.pickupAddress} → ${ride.dropoffAddress} via ${ride.provider.businessName}`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      rideId: ride.id,
      familyId: family.id,
      type: "RIDE_PAYMENT",
    },
    success_url: `${APP_URL}/rides?payment=success`,
    cancel_url: `${APP_URL}/rides?payment=canceled`,
  });

  // Persist checkout session ID so webhook can find the ride
  await prisma.ride.update({
    where: { id: ride.id },
    data: { stripeCheckoutSessionId: checkoutSession.id },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
