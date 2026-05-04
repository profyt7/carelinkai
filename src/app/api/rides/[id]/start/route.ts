export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/rides/[id]/start — provider marks ride as IN_PROGRESS
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PROVIDER")
    return NextResponse.json({ error: "Only providers can start rides" }, { status: 403 });

  const ride = await prisma.ride.findUnique({
    where: { id: params.id },
    include: { provider: { select: { userId: true } } },
  });
  if (!ride) return NextResponse.json({ error: "Ride not found" }, { status: 404 });
  if (ride.provider.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (ride.status !== "PAID")
    return NextResponse.json({ error: "Only PAID rides can be started" }, { status: 400 });

  const updated = await prisma.ride.update({
    where: { id: params.id },
    data: { status: "IN_PROGRESS" },
  });

  return NextResponse.json({ ride: updated });
}
