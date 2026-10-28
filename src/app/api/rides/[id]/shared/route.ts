export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({ isSharedRide: z.boolean() });

// PATCH /api/rides/[id]/shared — provider toggles shared ride flag
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PROVIDER")
    return NextResponse.json({ error: "Only providers can update shared status" }, { status: 403 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const ride = await prisma.ride.findUnique({
    where: { id: params.id },
    include: { provider: { select: { userId: true } } },
  });
  if (!ride) return NextResponse.json({ error: "Ride not found" }, { status: 404 });
  if (ride.provider.userId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updated = await prisma.ride.update({
    where: { id: params.id },
    data: { isSharedRide: parsed.data.isSharedRide },
  });

  return NextResponse.json({ ride: updated });
}
