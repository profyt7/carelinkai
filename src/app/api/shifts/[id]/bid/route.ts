export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST — caregiver places a bid on an open shift
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const caregiver = await prisma.caregiver.findUnique({ where: { userId: session.user.id } });
  if (!caregiver) return NextResponse.json({ error: 'Caregiver only' }, { status: 403 });

  const shift = await prisma.caregiverShift.findUnique({
    where: { id: params.id },
    select: { id: true, status: true, caregiverId: true },
  });
  if (!shift) return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
  if (shift.status !== 'OPEN') return NextResponse.json({ error: 'Shift is not open for bids' }, { status: 409 });
  if (shift.caregiverId) return NextResponse.json({ error: 'Shift already assigned' }, { status: 409 });

  const body = await req.json().catch(() => ({}));

  const bid = await prisma.shiftBid.upsert({
    where: { shiftId_caregiverId: { shiftId: params.id, caregiverId: caregiver.id } },
    create: { shiftId: params.id, caregiverId: caregiver.id, message: body.message ?? null },
    update: { status: 'PENDING', message: body.message ?? null },
  });

  return NextResponse.json({ bid }, { status: 201 });
}

// DELETE — caregiver withdraws their bid
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const caregiver = await prisma.caregiver.findUnique({ where: { userId: session.user.id } });
  if (!caregiver) return NextResponse.json({ error: 'Caregiver only' }, { status: 403 });

  await prisma.shiftBid.updateMany({
    where: { shiftId: params.id, caregiverId: caregiver.id, status: 'PENDING' },
    data: { status: 'WITHDRAWN' },
  });

  return NextResponse.json({ ok: true });
}
