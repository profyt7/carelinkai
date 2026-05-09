export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED"]),
  notes: z.string().max(500).optional(),
});

async function getOwnedShift(shiftId: string, userId: string) {
  return prisma.householdShift.findFirst({
    where: {
      id: shiftId,
      familyUserId: userId,
    },
  });
}

/**
 * PATCH /api/family/household/shifts/[id]
 * Update the status (or notes) of a shift owned by this family user.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const shift = await getOwnedShift(params.id, session.user.id);
  if (!shift) {
    return NextResponse.json({ error: "Shift not found or not yours" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.format() }, { status: 400 });
  }

  const updated = await prisma.householdShift.update({
    where: { id: params.id },
    data: {
      status: parsed.data.status,
      ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
    },
  });

  return NextResponse.json({ shift: updated });
}

/**
 * DELETE /api/family/household/shifts/[id]
 * Permanently remove a shift owned by this family user.
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const shift = await getOwnedShift(params.id, session.user.id);
  if (!shift) {
    return NextResponse.json({ error: "Shift not found or not yours" }, { status: 404 });
  }

  await prisma.householdShift.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
