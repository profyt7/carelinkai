export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

const FUNNEL_STATUSES = [
  'NEW', 'CONTACTED', 'TOUR_SCHEDULED', 'TOUR_COMPLETED',
  'PLACEMENT_OFFERED', 'PLACEMENT_ACCEPTED', 'CLOSED_LOST',
];

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rangeParam = searchParams.get('range') || '30d';
  const operatorIdParam = searchParams.get('operatorId') || null;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  const isAdmin = user?.role === UserRole.ADMIN;
  const op = user?.role === UserRole.OPERATOR
    ? await prisma.operator.findUnique({ where: { userId: user.id } })
    : null;
  const effectiveOperatorId = (isAdmin ? operatorIdParam : null) || op?.id || null;

  const now = new Date();
  const since = new Date(now);
  if (rangeParam === '7d') since.setDate(now.getDate() - 7);
  else if (rangeParam === '90d') since.setDate(now.getDate() - 90);
  else since.setDate(now.getDate() - 30);

  const inquiriesByStatus = await prisma.inquiry
    .groupBy({
      by: ['status'],
      where: {
        ...(effectiveOperatorId ? { home: { operatorId: effectiveOperatorId } } : {}),
        createdAt: { gte: since },
      },
      _count: { _all: true },
    })
    .catch(() => [] as any[]);

  const rows = [['Status', 'Count'], ...FUNNEL_STATUSES.map((s) => {
    const count = inquiriesByStatus.find((r: any) => r.status === s)?._count?._all ?? 0;
    return [s, String(count)];
  })];

  const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');

  return new NextResponse(csv, {
    headers: {
      'content-type': 'text/csv',
      'content-disposition': `attachment; filename="inquiries-${rangeParam}.csv"`,
    },
  });
}
