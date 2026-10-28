export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const CreateNeed = z.object({
  homeId: z.string(),
  shiftId: z.string().optional(),
  requiredCerts: z.array(z.string()).default([]),
  requiredSkills: z.array(z.string()).default([]),
  minExperienceMonths: z.number().int().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const op = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!op) return NextResponse.json({ error: 'Operator only' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? undefined;

  const needs = await prisma.shiftNeed.findMany({
    where: {
      home: { operatorId: op.id },
      ...(status ? { status: status as any } : {}),
    },
    include: {
      home: { select: { id: true, name: true } },
      shift: { select: { startTime: true, endTime: true, hourlyRate: true } },
      filledByCaregiver: { include: { user: { select: { firstName: true, lastName: true } } } },
      attempts: { select: { id: true, outcome: true, wave: true, channel: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ needs });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const op = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!op) return NextResponse.json({ error: 'Operator only' }, { status: 403 });

  const body = await req.json();
  const parsed = CreateNeed.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 });

  const { homeId, shiftId, requiredCerts, requiredSkills, minExperienceMonths, notes } = parsed.data;

  // Verify home belongs to operator
  const home = await prisma.assistedLivingHome.findFirst({ where: { id: homeId, operatorId: op.id } });
  if (!home) return NextResponse.json({ error: 'Home not found' }, { status: 404 });

  const need = await prisma.shiftNeed.create({
    data: { homeId, shiftId, requiredCerts, requiredSkills, minExperienceMonths, notes },
    include: {
      home: { select: { id: true, name: true } },
      shift: { select: { startTime: true, endTime: true } },
    },
  });

  return NextResponse.json({ need }, { status: 201 });
}
