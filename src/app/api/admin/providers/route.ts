export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAnyRole } from '@/lib/rbac';

function toInt(v: string | null, def: number): number {
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : def;
}

export async function GET(req: NextRequest) {
  const { session, error } = await requireAnyRole(['ADMIN' as any, 'STAFF' as any]);
  if (error) return error;
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();
  const city = (url.searchParams.get('city') || '').trim();
  const state = (url.searchParams.get('state') || '').trim();
  const page = toInt(url.searchParams.get('page'), 1);
  const pageSize = Math.min(toInt(url.searchParams.get('pageSize'), 20), 100);
  const isVisible = url.searchParams.get('isVisibleInMarketplace');
  const isVerified = url.searchParams.get('isVerified');

  const where: any = {
    AND: [
      q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { bio: { contains: q, mode: 'insensitive' } },
              { user: { email: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : {},
      city ? { coverageCity: { equals: city, mode: 'insensitive' } } : {},
      state ? { coverageState: { equals: state, mode: 'insensitive' } } : {},
      isVisible == null || isVisible === '' ? {} : { isVisibleInMarketplace: isVisible.toLowerCase() === 'true' },
      isVerified == null || isVerified === '' ? {} : { isVerified: isVerified.toLowerCase() === 'true' },
    ],
  };

  const [total, list] = await Promise.all([
    (prisma as any).provider.count({ where }),
    (prisma as any).provider.findMany({
      where,
      include: {
        user: { select: { email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const items = (list as any[]).map((p: any) => ({
    id: p.id,
    userId: p.userId,
    name: p.name ?? '',
    email: p.user?.email ?? null,
    city: p.coverageCity ?? null,
    state: p.coverageState ?? null,
    isVisibleInMarketplace: Boolean(p.isVisibleInMarketplace),
    isVerified: Boolean(p.isVerified),
    createdAt: p.createdAt,
  }));

  return NextResponse.json({
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
    items,
  });
}
