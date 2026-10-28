export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const shiftSchema = z.object({
  hireId: z.string().min(1),
  scheduledStart: z.string().datetime(),
  scheduledEnd: z.string().datetime(),
  notes: z.string().max(500).optional(),
});

/**
 * GET /api/family/household
 * Returns all active hires for this FAMILY user, each with their HouseholdShifts.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const hires = await prisma.marketplaceHire.findMany({
    where: {
      listing: { postedByUserId: userId },
    },
    include: {
      caregiver: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImageUrl: true,
            },
          },
        },
      },
      listing: { select: { id: true, title: true } },
      householdShifts: {
        orderBy: { scheduledStart: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ hires });
}

/**
 * POST /api/family/household
 * Creates a new HouseholdShift. The hireId must belong to a listing posted by this user.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await req.json().catch(() => ({}));
  const parsed = shiftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.format() }, { status: 400 });
  }

  const { hireId, scheduledStart, scheduledEnd, notes } = parsed.data;

  if (new Date(scheduledEnd) <= new Date(scheduledStart)) {
    return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
  }

  // Verify this hire belongs to a listing this family posted
  const hire = await prisma.marketplaceHire.findFirst({
    where: { id: hireId, listing: { postedByUserId: userId } },
  });
  if (!hire) {
    return NextResponse.json({ error: "Hire not found or not yours" }, { status: 404 });
  }

  const shift = await prisma.householdShift.create({
    data: {
      familyUserId: userId,
      hireId,
      scheduledStart: new Date(scheduledStart),
      scheduledEnd: new Date(scheduledEnd),
      notes: notes ?? null,
      status: "SCHEDULED",
    },
  });

  return NextResponse.json({ shift }, { status: 201 });
}
