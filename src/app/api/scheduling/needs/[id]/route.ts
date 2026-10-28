export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const op = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!op) return NextResponse.json({ error: 'Operator only' }, { status: 403 });

  const need = await prisma.shiftNeed.findFirst({
    where: { id: params.id, home: { operatorId: op.id } },
    include: {
      home: { select: { id: true, name: true } },
      shift: { select: { startTime: true, endTime: true, hourlyRate: true, status: true } },
      filledByCaregiver: { include: { user: { select: { firstName: true, lastName: true, phone: true } } } },
      attempts: {
        include: { caregiver: { include: { user: { select: { firstName: true, lastName: true } } } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!need) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ need });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const op = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!op) return NextResponse.json({ error: 'Operator only' }, { status: 403 });

  const need = await prisma.shiftNeed.findFirst({ where: { id: params.id, home: { operatorId: op.id } } });
  if (!need) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.shiftNeed.update({
    where: { id: params.id },
    data: {
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
      ...(body.requiredCerts !== undefined ? { requiredCerts: body.requiredCerts } : {}),
      ...(body.requiredSkills !== undefined ? { requiredSkills: body.requiredSkills } : {}),
      ...(body.minExperienceMonths !== undefined ? { minExperienceMonths: body.minExperienceMonths } : {}),
    },
  });

  return NextResponse.json({ need: updated });
}
