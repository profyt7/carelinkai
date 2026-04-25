export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getPointsSummary } from '@/lib/services/caregiver-points';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const caregiver = await prisma.caregiver.findUnique({ where: { userId: session.user.id } });
  if (!caregiver) return NextResponse.json({ error: 'Caregiver only' }, { status: 403 });

  const summary = await getPointsSummary(caregiver.id);
  return NextResponse.json({ summary });
}
