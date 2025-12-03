import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyRole } from "@/lib/rbac";
import { z } from "zod";
import { AppointmentType } from "@/lib/types/calendar";

const getQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

const createSchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  isAvailable: z.boolean().optional().default(true),
  availableFor: z.array(z.nativeEnum(AppointmentType)).optional().default([]),
  homeId: z.string().optional(),
  repeatWeeks: z.number().int().min(0).max(52).optional().default(0),
}).refine((data) => new Date(data.endTime) > new Date(data.startTime), {
  message: "endTime must be after startTime",
  path: ["endTime"],
});

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return Math.max(aStart.getTime(), bStart.getTime()) < Math.min(aEnd.getTime(), bEnd.getTime());
}

export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireAnyRole(["CAREGIVER"] as any);
    if (error) return error;

    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = getQuerySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query", details: parsed.error.format() }, { status: 400 });
    }

    const where: any = { userId: session!.user!.id! };
    if (parsed.data.from || parsed.data.to) {
      where.AND = [] as any[];
      if (parsed.data.from) where.AND.push({ endTime: { gte: new Date(parsed.data.from) } });
      if (parsed.data.to) where.AND.push({ startTime: { lte: new Date(parsed.data.to) } });
    }

    const slots = await prisma.availabilitySlot.findMany({
      where,
      orderBy: { startTime: "asc" },
      select: {
        id: true,
        userId: true,
        startTime: true,
        endTime: true,
        isAvailable: true,
        availableFor: true,
        homeId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, slots });
  } catch (err) {
    console.error("Error fetching availability:", err);
    return NextResponse.json({ error: "Failed to fetch availability" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireAnyRole(["CAREGIVER"] as any);
    if (error) return error;

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.format() }, { status: 400 });
    }

    const { startTime, endTime, isAvailable, availableFor, homeId, repeatWeeks } = parsed.data;
    const baseStart = new Date(startTime);
    const baseEnd = new Date(endTime);

    // Build all candidate slots (repeat weekly N times)
    const candidates: Array<{ start: Date; end: Date }> = [];
    for (let i = 0; i <= repeatWeeks; i++) {
      const s = new Date(baseStart);
      const e = new Date(baseEnd);
      if (i > 0) {
        s.setUTCDate(s.getUTCDate() + i * 7);
        e.setUTCDate(e.getUTCDate() + i * 7);
      }
      candidates.push({ start: s, end: e });
    }

    // Validate no overlaps against existing slots for this user
    // Check each candidate range for any intersecting availabilitySlot
    for (const c of candidates) {
      const conflict = await prisma.availabilitySlot.findFirst({
        where: {
          userId: session!.user!.id!,
          // overlap: existing.start < c.end && existing.end > c.start
          startTime: { lt: c.end },
          endTime: { gt: c.start },
        },
        select: { id: true, startTime: true, endTime: true },
      });
      if (conflict) {
        return NextResponse.json(
          {
            error: "Overlapping availability detected",
            details: {
              conflict: {
                id: conflict.id,
                startTime: conflict.startTime,
                endTime: conflict.endTime,
              },
            },
          },
          { status: 409 }
        );
      }
    }

    const created = await prisma.$transaction(async (tx) => {
      const results = [] as any[];
      for (const c of candidates) {
        const rec = await tx.availabilitySlot.create({
          data: {
            userId: session!.user!.id!,
            startTime: c.start,
            endTime: c.end,
            isAvailable: isAvailable ?? true,
            availableFor: (availableFor ?? []).map((t) => String(t)),
            homeId: homeId || null,
          },
        });
        results.push(rec);
      }
      return results;
    });

    return NextResponse.json({ success: true, slots: created });
  } catch (err) {
    console.error("Error creating availability:", err);
    return NextResponse.json({ error: "Failed to create availability" }, { status: 500 });
  }
}
