import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function isIsoDate(s: any) {
  if (typeof s !== 'string') return false;
  const d = new Date(s);
  return !isNaN(d.getTime());
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'CAREGIVER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const onlyFuture = req.nextUrl.searchParams.get('future') !== 'false';

  const slots = await prisma.availabilitySlot.findMany({
    where: {
      userId: session.user.id,
      ...(onlyFuture ? { endTime: { gte: now } } : {}),
    },
    orderBy: { startTime: 'asc' },
  });
  return NextResponse.json({ data: slots });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'CAREGIVER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null as any);
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  // Support single slot { startTime, endTime } or batch { slots: [...] }
  const slotsInput: Array<{ startTime: string; endTime: string; isAvailable?: boolean; availableFor?: string[]; homeId?: string | null }> = Array.isArray(body?.slots)
    ? body.slots
    : (body?.startTime && body?.endTime ? [{ startTime: body.startTime, endTime: body.endTime, isAvailable: body.isAvailable, availableFor: body.availableFor, homeId: body.homeId }] : []);

  if (slotsInput.length === 0) {
    return NextResponse.json({ error: 'Provide startTime/endTime or slots[]' }, { status: 400 });
  }

  // Basic validation
  const parsed = [] as Array<{ start: Date; end: Date; isAvailable: boolean; availableFor: string[]; homeId?: string | null }>;
  for (const s of slotsInput) {
    if (!isIsoDate(s.startTime) || !isIsoDate(s.endTime)) {
      return NextResponse.json({ error: 'Invalid ISO date for startTime/endTime' }, { status: 400 });
    }
    const start = new Date(s.startTime);
    const end = new Date(s.endTime);
    if (!(start < end)) {
      return NextResponse.json({ error: 'startTime must be before endTime' }, { status: 400 });
    }
    // Normalize seconds/ms
    start.setSeconds(0, 0);
    end.setSeconds(0, 0);
    parsed.push({ start, end, isAvailable: s.isAvailable !== false, availableFor: Array.isArray(s.availableFor) ? s.availableFor : [], homeId: s.homeId ?? null });
  }

  // Overlap validation against existing for each slot
  for (const p of parsed) {
    const conflicts = await prisma.availabilitySlot.findMany({
      where: {
        userId: session.user.id,
        startTime: { lt: p.end },
        endTime: { gt: p.start },
      },
      select: { id: true, startTime: true, endTime: true },
      take: 1,
    });
    if (conflicts.length > 0) {
      return NextResponse.json({ error: 'Overlapping availability slot exists' }, { status: 409 });
    }
  }

  const created = await prisma.$transaction(
    parsed.map((p) =>
      prisma.availabilitySlot.create({
        data: {
          userId: session.user.id,
          startTime: p.start,
          endTime: p.end,
          isAvailable: p.isAvailable,
          availableFor: p.availableFor,
          homeId: p.homeId ?? null,
        },
      })
    )
  );

  return NextResponse.json({ data: created }, { status: 201 });
}