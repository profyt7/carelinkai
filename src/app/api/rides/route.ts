export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createRideSchema = z.object({
  providerId: z.string().min(1),
  leadId: z.string().optional(),
  // Operator-only fields
  residentName: z.string().max(200).optional(),
  residentId: z.string().optional(),
  // Trip details
  pickupAddress: z.string().min(3).max(500),
  dropoffAddress: z.string().min(3).max(500),
  scheduledAt: z.string().datetime(),
  tripPurpose: z.string().max(100).optional(),
  mobilityNeeds: z.string().max(500).optional(),
  passengerCount: z.number().int().min(1).max(8).optional().default(1),
  specialRequests: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as string;
  const allowedRoles = ["FAMILY", "OPERATOR", "STAFF", "ADMIN"];
  if (!allowedRoles.includes(role))
    return NextResponse.json({ error: "Not authorized to request rides" }, { status: 403 });

  const body = await req.json();
  const parsed = createRideSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  const { providerId, leadId, residentName, residentId, pickupAddress, dropoffAddress,
          scheduledAt, tripPurpose, mobilityNeeds, passengerCount, specialRequests } = parsed.data;

  const scheduled = new Date(scheduledAt);
  if (scheduled <= new Date())
    return NextResponse.json({ error: "Scheduled time must be in the future" }, { status: 400 });

  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { id: true, businessName: true, contactEmail: true, contactName: true },
  });
  if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });

  let familyId: string | null = null;
  let operatorId: string | null = null;
  let bookedByRole = "FAMILY";

  if (role === "FAMILY") {
    const family = await prisma.family.findUnique({ where: { userId: session.user.id }, select: { id: true } });
    if (!family) return NextResponse.json({ error: "Family profile not found" }, { status: 404 });
    familyId = family.id;
    bookedByRole = "FAMILY";
  } else {
    const operator = await prisma.operator.findUnique({ where: { userId: session.user.id }, select: { id: true } });
    if (!operator) return NextResponse.json({ error: "Operator profile not found" }, { status: 404 });
    operatorId = operator.id;
    bookedByRole = "OPERATOR";

    if (!residentName?.trim())
      return NextResponse.json({ error: "Resident name is required for operator bookings" }, { status: 400 });
  }

  const ride = await prisma.ride.create({
    data: {
      familyId,
      operatorId,
      bookedByRole,
      providerId,
      leadId: leadId ?? null,
      residentName: residentName?.trim() ?? null,
      residentId: residentId ?? null,
      pickupAddress,
      dropoffAddress,
      scheduledAt: scheduled,
      tripPurpose: tripPurpose ?? null,
      mobilityNeeds: mobilityNeeds ?? null,
      passengerCount: passengerCount ?? 1,
      specialRequests: specialRequests ?? null,
    },
  });

  notifyProviderNewRide(provider, session.user, ride, bookedByRole, residentName).catch(() => {});

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
    const provider = await prisma.provider.findUnique({ where: { userId: session.user.id }, select: { id: true } });
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
    return NextResponse.json({ rides, total, page, pageSize });
  }

  return NextResponse.json({ error: "Not supported for this role" }, { status: 403 });
}

async function notifyProviderNewRide(
  provider: { businessName: string; contactEmail: string; contactName: string },
  user: { firstName?: string | null; lastName?: string | null; email?: string | null },
  ride: { id: string; scheduledAt: Date; pickupAddress: string; dropoffAddress: string },
  bookedByRole: string,
  residentName?: string | null
) {
  if (!process.env.RESEND_API_KEY) return;
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const APP_URL = process.env.NEXTAUTH_URL || "https://getcarelinkai.com";
  const bookerName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "A client";
  const passengerInfo = bookedByRole === "OPERATOR" && residentName
    ? `Resident: <strong>${residentName}</strong><br>Booked by: ${bookerName} (facility)`
    : `Family: <strong>${bookerName}</strong>`;
  const scheduledStr = ride.scheduledAt.toLocaleString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", timeZoneName: "short",
  });

  await resend.emails.send({
    from: `CareLinkAI <${process.env.EMAIL_FROM || "noreply@getcarelinkai.com"}>`,
    to: [provider.contactEmail],
    subject: `New Ride Request — ${bookedByRole === "OPERATOR" ? residentName ?? bookerName : bookerName}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
        <div style="background:#4f46e5;padding:24px;border-radius:8px 8px 0 0">
          <h1 style="color:#fff;margin:0;font-size:20px">New Ride Request</h1>
        </div>
        <div style="padding:24px;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 8px 8px">
          <p>Hi ${provider.contactName},</p>
          <p>You have a new ride request through CareLinkAI.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px 0;color:#6b7280;width:140px">Passenger</td><td style="padding:8px 0">${passengerInfo}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280">Scheduled</td><td style="padding:8px 0;font-weight:600">${scheduledStr}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280">Pickup</td><td style="padding:8px 0">${ride.pickupAddress}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280">Dropoff</td><td style="padding:8px 0">${ride.dropoffAddress}</td></tr>
          </table>
          <a href="${APP_URL}/rides" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin-top:8px">
            View &amp; Confirm Ride →
          </a>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px">CareLinkAI · Cleveland, OH</p>
        </div>
      </div>`,
  });
}
