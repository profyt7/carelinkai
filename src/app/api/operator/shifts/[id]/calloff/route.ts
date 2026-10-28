export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { computeAndSaveReliabilityScore } from '@/lib/services/caregiver-reliability';
import { penalizeCallOff } from '@/lib/services/caregiver-points';

const VALID_TYPES = ['NO_SHOW', 'LATE_ARRIVAL', 'EARLY_DEPARTURE', 'CALLED_OFF'];

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const op = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!op) return NextResponse.json({ error: 'Operator only' }, { status: 403 });

  const shift = await prisma.caregiverShift.findFirst({
    where: { id: params.id, home: { operatorId: op.id } },
    select: { id: true, caregiverId: true },
  });
  if (!shift) return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
  if (!shift.caregiverId) return NextResponse.json({ error: 'No caregiver assigned to this shift' }, { status: 400 });

  const body = await req.json();
  const type: string = body.type ?? 'NO_SHOW';
  if (!VALID_TYPES.includes(type)) return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

  const callOff = await prisma.callOff.create({
    data: {
      caregiverId: shift.caregiverId,
      shiftId: shift.id,
      type: type as any,
      notes: body.notes ?? null,
    },
  });

  // Update shift status for no-shows
  if (type === 'NO_SHOW') {
    await prisma.caregiverShift.update({
      where: { id: shift.id },
      data: { status: 'NO_SHOW' },
    });
  }

  // Recompute reliability + penalize points — non-blocking
  Promise.resolve().then(async () => {
    await computeAndSaveReliabilityScore(shift.caregiverId!);
    await penalizeCallOff(shift.caregiverId!, type);
  }).catch(() => {});

  return NextResponse.json({ callOff }, { status: 201 });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const op = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!op) return NextResponse.json({ error: 'Operator only' }, { status: 403 });

  const callOffs = await prisma.callOff.findMany({
    where: {
      shiftId: params.id,
      shift: { home: { operatorId: op.id } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ callOffs });
}
