import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyRole } from "@/lib/rbac";
import { z } from "zod";
import { AppointmentType } from "@/lib/types/calendar";

const updateSchema = z.object({
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  isAvailable: z.boolean().optional(),
  availableFor: z.array(z.nativeEnum(AppointmentType)).optional(),
  homeId: z.string().nullable().optional(),
}).refine((data) => {
  if (data.startTime && data.endTime) {
    return new Date(data.endTime) > new Date(data.startTime);
  }
  return true;
}, { message: "endTime must be after startTime", path: ["endTime"] });

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { session, error } = await requireAnyRole(["CAREGIVER"] as any);
    if (error) return error;

    const { id } = params;
    if (!id) return NextResponse.json({ error: "Slot ID is required" }, { status: 400 });

    const slot = await prisma.availabilitySlot.findUnique({ where: { id }, select: { id: true, userId: true, startTime: true, endTime: true } });
    if (!slot) return NextResponse.json({ error: "Availability slot not found" }, { status: 404 });
    if (slot.userId !== session!.user!.id!) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.format() }, { status: 400 });

    // Prepare updates
    const updates: any = {};
    if (parsed.data.startTime !== undefined) updates.startTime = new Date(parsed.data.startTime);
    if (parsed.data.endTime !== undefined) updates.endTime = new Date(parsed.data.endTime);
    if (parsed.data.isAvailable !== undefined) updates.isAvailable = parsed.data.isAvailable;
    if (parsed.data.availableFor !== undefined) updates.availableFor = parsed.data.availableFor.map((t) => String(t));
    if (parsed.data.homeId !== undefined) updates.homeId = parsed.data.homeId ?? null;

    // Determine final range for overlap check
    const newStart = updates.startTime ?? slot.startTime;
    const newEnd = updates.endTime ?? slot.endTime;
    if (!(newEnd instanceof Date) || !(newStart instanceof Date) || newEnd <= newStart) {
      return NextResponse.json({ error: "Invalid time range" }, { status: 400 });
    }

    // Check for overlaps with other slots (exclude this slot)
    const conflict = await prisma.availabilitySlot.findFirst({
      where: {
        userId: session!.user!.id!,
        id: { not: id },
        startTime: { lt: newEnd },
        endTime: { gt: newStart },
      },
      select: { id: true, startTime: true, endTime: true },
    });
    if (conflict) {
      return NextResponse.json(
        { error: "Overlapping availability detected", details: { conflict } },
        { status: 409 }
      );
    }

    const updated = await prisma.availabilitySlot.update({ where: { id }, data: updates });
    return NextResponse.json({ success: true, slot: updated });
  } catch (err) {
    console.error("Error updating availability:", err);
    return NextResponse.json({ error: "Failed to update availability" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { session, error } = await requireAnyRole(["CAREGIVER"] as any);
    if (error) return error;

    const { id } = params;
    if (!id) return NextResponse.json({ error: "Slot ID is required" }, { status: 400 });

    const slot = await prisma.availabilitySlot.findUnique({ where: { id }, select: { id: true, userId: true } });
    if (!slot) return NextResponse.json({ error: "Availability slot not found" }, { status: 404 });
    if (slot.userId !== session!.user!.id!) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await prisma.availabilitySlot.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error deleting availability:", err);
    return NextResponse.json({ error: "Failed to delete availability" }, { status: 500 });
  }
}