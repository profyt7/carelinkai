import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyRole } from "@/lib/rbac";
import { z } from "zod";

// HH:MM 24h format
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const timeRangeSchema = z.object({
  start: z.string().regex(timeRegex, "start must be HH:MM"),
  end: z.string().regex(timeRegex, "end must be HH:MM"),
}).refine((r) => r.start < r.end, { message: "start must be before end" });

const weeklySchema = z.object({
  mon: z.array(timeRangeSchema).max(6).default([]),
  tue: z.array(timeRangeSchema).max(6).default([]),
  wed: z.array(timeRangeSchema).max(6).default([]),
  thu: z.array(timeRangeSchema).max(6).default([]),
  fri: z.array(timeRangeSchema).max(6).default([]),
  sat: z.array(timeRangeSchema).max(6).default([]),
  sun: z.array(timeRangeSchema).max(6).default([]),
});

const availabilitySchema = z.object({
  timezone: z.string().min(2).max(50).optional(),
  weekly: weeklySchema,
});

export async function GET() {
  try {
    const { session, error } = await requireAnyRole(["CAREGIVER"] as any);
    if (error) return error;

    const cg = await prisma.caregiver.findUnique({
      where: { userId: session!.user!.id! },
      select: { availability: true }
    });
    if (!cg) return NextResponse.json({ error: "User is not a caregiver" }, { status: 403 });

    const availability = (cg.availability as any) ?? { weekly: { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] } };
    return NextResponse.json({ success: true, availability });
  } catch (e) {
    console.error("GET caregiver availability error", e);
    return NextResponse.json({ error: "Failed to load availability" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { session, error } = await requireAnyRole(["CAREGIVER"] as any);
    if (error) return error;

    const body = await request.json();
    const parsed = availabilitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid availability payload", details: parsed.error.format() }, { status: 400 });
    }

    // Persist JSON onto caregiver.availability
    const updated = await prisma.caregiver.update({
      where: { userId: session!.user!.id! },
      data: { availability: parsed.data },
      select: { availability: true }
    });

    return NextResponse.json({ success: true, availability: updated.availability });
  } catch (e) {
    console.error("PATCH caregiver availability error", e);
    return NextResponse.json({ error: "Failed to update availability" }, { status: 500 });
  }
}
