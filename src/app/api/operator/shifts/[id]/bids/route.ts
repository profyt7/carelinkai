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

  const shift = await prisma.caregiverShift.findFirst({ where: { id: params.id, home: { operatorId: op.id } } });
  if (!shift) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const bids = await prisma.shiftBid.findMany({
    where: { shiftId: params.id },
    include: {
      caregiver: {
        include: {
          user: { select: { firstName: true, lastName: true, phone: true } },
        },
        select: {
          id: true,
          userId: true,
          reliabilityScore: true,
          yearsExperience: true,
          specialties: true,
          backgroundCheckStatus: true,
          hourlyRate: true,
          user: true,
        },
      },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
  });

  return NextResponse.json({ bids });
}
