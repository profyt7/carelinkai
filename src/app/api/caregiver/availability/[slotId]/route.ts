import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function isIsoDate(s: any) {
  if (typeof s !== 'string') return false;
  const d = new Date(s);
  return !isNaN(d.getTime());
}

export async function PUT(req: NextRequest, { params }: { params: { slotId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'CAREGIVER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const slotId = params.slotId;

  const existing = await prisma.availabilitySlot.findUnique({ where: { id: slotId } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json().catch(() => null as any);
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  const updates: any = {};
  if (body.startTime) {
    if (!isIsoDate(body.startTime)) return NextResponse.json({ error: 'Invalid startTime' }, { status: 400 });
    const dt = new Date(body.startTime); dt.setSeconds(0, 0);
    updates.startTime = dt;
  }
  if (body.endTime) {
    if (!isIsoDate(body.endTime)) return NextResponse.json({ error: 'Invalid endTime' }, { status: 400 });
    const dt = new Date(body.endTime); dt.setSeconds(0, 0);
    updates.endTime = dt;
  }
  if (typeof body.isAvailable === 'boolean') updates.isAvailable = body.isAvailable;
  if (Array.isArray(body.availableFor)) updates.availableFor = body.availableFor;
  if (typeof body.homeId !== 'undefined') updates.homeId = body.homeId ?? null;

  if (updates.startTime && updates.endTime && !(updates.startTime < updates.endTime)) {
    return NextResponse.json({ error: 'startTime must be before endTime' }, { status: 400 });
  }

  const newStart = updates.startTime ?? existing.startTime;
  const newEnd = updates.endTime ?? existing.endTime;
  const conflict = await prisma.availabilitySlot.findFirst({
    where: {
      userId: session.user.id,
      id: { not: slotId },
      startTime: { lt: newEnd },
      endTime: { gt: newStart },
    },
    select: { id: true },
  });
  if (conflict) return NextResponse.json({ error: 'Overlapping availability slot exists' }, { status: 409 });

  const updated = await prisma.availabilitySlot.update({ where: { id: slotId }, data: updates });
  return NextResponse.json({ data: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: { slotId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'CAREGIVER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const slotId = params.slotId;
  const existing = await prisma.availabilitySlot.findUnique({ where: { id: slotId }, select: { id: true, userId: true } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  await prisma.availabilitySlot.delete({ where: { id: slotId } });
  return NextResponse.json({ success: true });
}
