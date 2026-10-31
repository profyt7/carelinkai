import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/** GET /api/operator/home-claims — the signed-in operator's pending self-serve claims (dashboard banner). */
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const operator = await prisma.operator.findUnique({ where: { userId }, select: { id: true } });
  if (!operator) return NextResponse.json({ claims: [] });
  const claims = await prisma.homeClaim.findMany({
    where: { operatorId: operator.id, status: 'PENDING_REVIEW' },
    select: { id: true, createdAt: true, home: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  return NextResponse.json({ claims: claims.map((c) => ({ id: c.id, createdAt: c.createdAt, homeId: c.home.id, homeName: c.home.name })) });
}
