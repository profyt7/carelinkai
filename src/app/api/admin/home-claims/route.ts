import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/** GET /api/admin/home-claims — self-serve claim queue: pending first, then the last 30 decisions. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const select = {
    id: true, status: true, source: true, createdAt: true, reviewedAt: true,
    home: { select: { id: true, name: true, address: { select: { city: true, state: true } } } },
    operator: { select: { companyName: true, user: { select: { email: true, firstName: true, lastName: true, emailVerified: true } } } },
  } as const;
  const [pending, decided] = await Promise.all([
    prisma.homeClaim.findMany({ where: { status: 'PENDING_REVIEW' }, select, orderBy: { createdAt: 'asc' }, take: 100 }),
    prisma.homeClaim.findMany({ where: { status: { not: 'PENDING_REVIEW' } }, select, orderBy: { reviewedAt: 'desc' }, take: 30 }),
  ]);
  return NextResponse.json({ pending, decided });
}
