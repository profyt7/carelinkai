export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/rides/[id]
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

  // Auth: only the family owner or the assigned provider can view
  const role = session.user.role;
  if (role === "FAMILY") {
    const family = await prisma.family.findUnique({ where: { userId: session.user.id }, select: { id: true } });
    if (!family || family.id !== ride.familyId)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } else if (role === "PROVIDER") {
    if (ride.provider.userId !== session.user.id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } else if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ ride });
}

// PATCH /api/rides/[id] — cancel by family or provider
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { cancelReason } = body as { cancelReason?: string };

  const ride = await prisma.ride.findUnique({
    where: { id: params.id },
    include: { provider: { select: { userId: true, contactEmail: true, businessName: true, contactName: true } } },
  });
  if (!ride) return NextResponse.json({ error: "Ride not found" }, { status: 404 });

  if (["COMPLETED", "CANCELED"].includes(ride.status))
    return NextResponse.json({ error: "Cannot cancel a ride that is already completed or canceled" }, { status: 400 });

  const role = session.user.role;
  let canceledBy: string;

  if (role === "FAMILY") {
    const family = await prisma.family.findUnique({ where: { userId: session.user.id }, select: { id: true } });
    if (!family || family.id !== ride.familyId)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    canceledBy = "FAMILY";
  } else if (role === "PROVIDER") {
    if (ride.provider.userId !== session.user.id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    canceledBy = "PROVIDER";
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.ride.update({
    where: { id: params.id },
    data: { status: "CANCELED", canceledBy, cancelReason: cancelReason ?? null },
  });

  return NextResponse.json({ ride: updated });
}
