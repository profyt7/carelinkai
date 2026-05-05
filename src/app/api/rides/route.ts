export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createRideSchema = z.object({
  providerId: z.string().min(1),
  leadId: z.string().optional(),
  residentName: z.string().max(200).optional(),
  residentId: z.string().optional(),
  // Trip details
  pickupAddress: z.string().min(3).max(500),
  dropoffAddress: z.string().min(3).max(500),
  scheduledAt: z.string().datetime(),
  tripPurpose: z.string().max(100).optional(),
  passengerCount: z.number().int().min(1).max(8).optional().default(1),
  specialRequests: z.string().max(500).optional(),
  // Passenger needs
  mobilityLevel: z.enum(["AMBULATORY", "ASSISTED", "WHEELCHAIR", "STRETCHER", "BARIATRIC"]).optional().default("AMBULATORY"),
  doorToDoorLevel: z.enum(["CURB_TO_CURB", "DOOR_TO_DOOR", "DOOR_THROUGH_DOOR", "BED_TO_BED"]).optional().default("DOOR_TO_DOOR"),
  needsOxygen: z.boolean().optional().default(false),
  hasCompanion: z.boolean().optional().default(false),
  cognitionNote: z.boolean().optional().default(false),
  hasServiceAnimal: z.boolean().optional().default(false),
  // Ride options
  waitTimeMinutes: z.number().int().min(0).max(480).optional(),
  // Return trip
  needsReturn: z.boolean().optional().default(false),
  returnScheduledAt: z.string().datetime().optional(),
  // Recurring
  isRecurring: z.boolean().optional().default(false),
  recurringFrequency: z.enum(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"]).optional(),
  recurringEndDate: z.string().datetime().optional(),
  // Pre-calculated fare (from /api/rides/estimate)
  estimatedMiles: z.number().optional(),
  estimatedFare: z.number().optional(),
  instantBook: z.boolean().optional().default(false),
  isSharedRide: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as string;
  if (!["FAMILY", "OPERATOR", "STAFF", "ADMIN"].includes(role))
    return NextResponse.json({ error: "Not authorized to request rides" }, { status: 403 });

  const body = await req.json();
  const parsed = createRideSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;
  const scheduled = new Date(d.scheduledAt);
  if (scheduled <= new Date())
    return NextResponse.json({ error: "Scheduled time must be in the future" }, { status: 400 });

  const provider = await prisma.provider.findUnique({
    where: { id: d.providerId },
    select: {
      id: true, businessName: true, contactEmail: true, contactName: true,
      rateBaseFare: true, ratePerMile: true, rateWaitPerHour: true, instantBook: true,
    },
  });
  if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });

  let familyId: string | null = null;
  let operatorId: string | null = null;
  let bookedByRole = "FAMILY";

  if (role === "FAMILY") {
    const family = await prisma.family.findUnique({ where: { userId: session.user.id }, select: { id: true } });
    if (!family) return NextResponse.json({ error: "Family profile not found" }, { status: 404 });
    familyId = family.id;
  } else {
    const operator = await prisma.operator.findUnique({ where: { userId: session.user.id }, select: { id: true } });
    if (!operator) return NextResponse.json({ error: "Operator profile not found" }, { status: 404 });
    operatorId = operator.id;
    bookedByRole = "OPERATOR";
    if (!d.residentName?.trim())
      return NextResponse.json({ error: "Resident name is required for operator bookings" }, { status: 400 });
  }

  // Determine platform fee / amounts
  const platformFeePercent = 12;
  let waitFare: number | null = null;
  if (d.waitTimeMinutes && provider.rateWaitPerHour) {
    waitFare = Math.round(Number(provider.rateWaitPerHour) * (d.waitTimeMinutes / 60) * 100) / 100;
  }

  // Create the primary ride
  const ride = await prisma.ride.create({
    data: {
      familyId,
      operatorId,
      bookedByRole,
      providerId: d.providerId,
      leadId: d.leadId ?? null,
      residentName: d.residentName?.trim() ?? null,
      residentId: d.residentId ?? null,
      pickupAddress: d.pickupAddress,
      dropoffAddress: d.dropoffAddress,
      scheduledAt: scheduled,
      tripPurpose: d.tripPurpose ?? null,
      passengerCount: d.passengerCount ?? 1,
      specialRequests: d.specialRequests ?? null,
      mobilityLevel: d.mobilityLevel ?? "AMBULATORY",
      doorToDoorLevel: d.doorToDoorLevel ?? "DOOR_TO_DOOR",
      needsOxygen: d.needsOxygen ?? false,
      hasCompanion: d.hasCompanion ?? false,
      cognitionNote: d.cognitionNote ?? false,
      hasServiceAnimal: d.hasServiceAnimal ?? false,
      waitTimeMinutes: d.waitTimeMinutes ?? null,
      waitFare: waitFare ?? null,
      needsReturn: d.needsReturn ?? false,
      returnScheduledAt: d.returnScheduledAt ? new Date(d.returnScheduledAt) : null,
      isRecurring: d.isRecurring ?? false,
      recurringFrequency: d.recurringFrequency ?? null,
      recurringEndDate: d.recurringEndDate ? new Date(d.recurringEndDate) : null,
      isSharedRide: d.isSharedRide ?? false,
      estimatedMiles: d.estimatedMiles ?? null,
      estimatedFare: d.estimatedFare ?? null,
      baseFare: d.estimatedFare ?? null,
      platformFeePercent,
      platformFee: d.estimatedFare
        ? Math.round(d.estimatedFare * (platformFeePercent / 100) * 100) / 100
        : null,
      totalAmount: d.estimatedFare
        ? Math.round(d.estimatedFare * (1 + platformFeePercent / 100) * 100) / 100
        : null,
    },
  });

  // Create return ride if requested
  if (d.needsReturn && d.returnScheduledAt) {
    const returnRide = await prisma.ride.create({
      data: {
        familyId,
        operatorId,
        bookedByRole,
        providerId: d.providerId,
        residentName: d.residentName?.trim() ?? null,
        residentId: d.residentId ?? null,
        pickupAddress: d.dropoffAddress, // reversed
        dropoffAddress: d.pickupAddress,
        scheduledAt: new Date(d.returnScheduledAt),
        tripPurpose: d.tripPurpose ?? null,
        passengerCount: d.passengerCount ?? 1,
        specialRequests: d.specialRequests ?? null,
        mobilityLevel: d.mobilityLevel ?? "AMBULATORY",
        doorToDoorLevel: d.doorToDoorLevel ?? "DOOR_TO_DOOR",
        needsOxygen: d.needsOxygen ?? false,
        hasCompanion: d.hasCompanion ?? false,
        cognitionNote: d.cognitionNote ?? false,
        hasServiceAnimal: d.hasServiceAnimal ?? false,
        parentRideId: ride.id,
        estimatedMiles: d.estimatedMiles ?? null,
        estimatedFare: d.estimatedFare ?? null,
        baseFare: d.estimatedFare ?? null,
        platformFeePercent,
        platformFee: d.estimatedFare
          ? Math.round(d.estimatedFare * (platformFeePercent / 100) * 100) / 100
          : null,
        totalAmount: d.estimatedFare
          ? Math.round(d.estimatedFare * (1 + platformFeePercent / 100) * 100) / 100
          : null,
      },
    });
    // Link primary ride to return ride
    await prisma.ride.update({
      where: { id: ride.id },
      data: { returnRideId: returnRide.id },
    });
  }

  // Instant booking: create Stripe Checkout Session immediately
  if (d.instantBook && provider.instantBook && d.estimatedFare && d.estimatedFare > 0) {
    try {
      const stripe = new (await import("stripe")).default(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2023-10-16",
      });
      const APP_URL = (() => {
        const proto = req.headers.get("x-forwarded-proto") || "https";
        const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "getcarelinkai.com";
        return `${proto}://${host}`;
      })();
      const totalCents = Math.round(d.estimatedFare * (1 + platformFeePercent / 100) * 100);

      const checkoutSession = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `Ride with ${provider.businessName}`,
                description: `${d.pickupAddress} → ${d.dropoffAddress} · ${new Date(d.scheduledAt).toLocaleDateString()}`,
              },
              unit_amount: totalCents,
            },
            quantity: 1,
          },
        ],
        metadata: { type: "RIDE_PAYMENT", rideId: ride.id },
        success_url: `${APP_URL}/rides?payment=success`,
        cancel_url: `${APP_URL}/rides?payment=canceled`,
      });

      // Store checkout session ID on the ride
      await prisma.ride.update({
        where: { id: ride.id },
        data: { stripeCheckoutSessionId: checkoutSession.id },
      });

      notifyProviderNewRide(provider, session.user, ride, bookedByRole, d.residentName, true).catch(() => {});
      return NextResponse.json({ ride, checkoutUrl: checkoutSession.url }, { status: 201 });
    } catch (err) {
      console.error("Stripe checkout creation failed:", err);
      // Fall through to standard request flow
    }
  }

  notifyProviderNewRide(provider, session.user, ride, bookedByRole, d.residentName, false).catch(() => {});
  return NextResponse.json({ ride }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = 20;
  const role = session.user.role as string;

  if (role === "FAMILY") {
    const family = await prisma.family.findUnique({ where: { userId: session.user.id }, select: { id: true } });
    if (!family) return NextResponse.json({ rides: [], total: 0 });
    const where = { familyId: family.id, ...(status ? { status: status as any } : {}) };
    const [rides, total] = await Promise.all([
      prisma.ride.findMany({
        where, orderBy: { scheduledAt: "asc" },
        skip: (page - 1) * pageSize, take: pageSize,
        include: { provider: { select: { id: true, businessName: true, contactEmail: true, contactPhone: true } } },
      }),
      prisma.ride.count({ where }),
    ]);
    return NextResponse.json({ rides, total, page, pageSize });
  }

  if (role === "OPERATOR" || role === "STAFF") {
    const operator = await prisma.operator.findUnique({ where: { userId: session.user.id }, select: { id: true } });
    if (!operator) return NextResponse.json({ rides: [], total: 0 });
    const where = { operatorId: operator.id, ...(status ? { status: status as any } : {}) };
    const [rides, total] = await Promise.all([
      prisma.ride.findMany({
        where, orderBy: { scheduledAt: "asc" },
        skip: (page - 1) * pageSize, take: pageSize,
        include: { provider: { select: { id: true, businessName: true, contactEmail: true, contactPhone: true } } },
      }),
      prisma.ride.count({ where }),
    ]);
    return NextResponse.json({ rides, total, page, pageSize });
  }

  if (role === "PROVIDER") {
    const provider = await prisma.provider.findUnique({
      where: { userId: session.user.id },
      select: { id: true, vehicleCapacity: true },
    });
    if (!provider) return NextResponse.json({ rides: [], total: 0 });
    const where = { providerId: provider.id, ...(status ? { status: status as any } : {}) };
    const [rides, total] = await Promise.all([
      prisma.ride.findMany({
        where, orderBy: { scheduledAt: "asc" },
        skip: (page - 1) * pageSize, take: pageSize,
        include: {
          family: { select: { id: true, user: { select: { firstName: true, lastName: true, email: true, phone: true } } } },
        },
      }),
      prisma.ride.count({ where }),
    ]);
    return NextResponse.json({ rides, total, page, pageSize, vehicleCapacity: provider.vehicleCapacity });
  }

  return NextResponse.json({ error: "Not supported for this role" }, { status: 403 });
}

async function notifyProviderNewRide(
  provider: { businessName: string; contactEmail: string; contactName: string },
  user: { firstName?: string | null; lastName?: string | null; email?: string | null },
  ride: { id: string; scheduledAt: Date; pickupAddress: string; dropoffAddress: string },
  bookedByRole: string,
  residentName?: string | null,
  isPaid?: boolean,
) {
  if (!process.env.RESEND_API_KEY) return;
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const APP_URL = process.env.NEXTAUTH_URL || "https://getcarelinkai.com";
  const bookerName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "A client";
  const passengerInfo =
    bookedByRole === "OPERATOR" && residentName
      ? `Resident: <strong>${residentName}</strong><br>Booked by: ${bookerName} (facility)`
      : `Family: <strong>${bookerName}</strong>`;
  const scheduledStr = ride.scheduledAt.toLocaleString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", timeZoneName: "short",
  });

  await resend.emails.send({
    from: `CareLinkAI <${process.env.EMAIL_FROM || "noreply@getcarelinkai.com"}>`,
    to: [provider.contactEmail],
    subject: isPaid
      ? `✅ Confirmed & Paid Ride — ${bookedByRole === "OPERATOR" ? residentName ?? bookerName : bookerName}`
      : `New Ride Request — ${bookedByRole === "OPERATOR" ? residentName ?? bookerName : bookerName}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
        <div style="background:${isPaid ? "#16a34a" : "#4f46e5"};padding:24px;border-radius:8px 8px 0 0">
          <h1 style="color:#fff;margin:0;font-size:20px">${isPaid ? "✅ Confirmed & Paid Ride" : "New Ride Request"}</h1>
        </div>
        <div style="padding:24px;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 8px 8px">
          <p>Hi ${provider.contactName},</p>
          <p>${isPaid ? "A ride has been <strong>confirmed and paid</strong>. Just show up!" : "You have a new ride request through CareLinkAI."}</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px 0;color:#6b7280;width:140px">Passenger</td><td style="padding:8px 0">${passengerInfo}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280">Scheduled</td><td style="padding:8px 0;font-weight:600">${scheduledStr}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280">Pickup</td><td style="padding:8px 0">${ride.pickupAddress}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280">Dropoff</td><td style="padding:8px 0">${ride.dropoffAddress}</td></tr>
          </table>
          <a href="${APP_URL}/rides" style="display:inline-block;background:${isPaid ? "#16a34a" : "#4f46e5"};color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin-top:8px">
            ${isPaid ? "View Ride Details →" : "View & Confirm Ride →"}
          </a>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px">CareLinkAI · Cleveland, OH</p>
        </div>
      </div>`,
  });
}
