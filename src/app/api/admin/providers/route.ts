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
  const { session, error } = await requireAnyRole(['ADMIN' as any]);
  if (error) return error;
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();
  const city = (url.searchParams.get('city') || '').trim();
  const state = (url.searchParams.get('state') || '').trim();
  const page = toInt(url.searchParams.get('page'), 1);
  const pageSize = Math.min(toInt(url.searchParams.get('pageSize'), 20), 100);
  const isVisibleParam = url.searchParams.get('isVisibleInMarketplace');
  const isVerifiedParam = url.searchParams.get('isVerified');

  const where: any = {
    AND: [
      q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { bio: { contains: q, mode: 'insensitive' } },
              { coverageCity: { contains: q, mode: 'insensitive' } },
              { coverageState: { contains: q, mode: 'insensitive' } },
              { user: { email: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : {},
      city ? { coverageCity: { contains: city, mode: 'insensitive' } } : {},
      state ? { coverageState: { contains: state, mode: 'insensitive' } } : {},
      isVisibleParam === 'true' ? { isVisibleInMarketplace: true } : {},
      isVisibleParam === 'false' ? { isVisibleInMarketplace: false } : {},
      isVerifiedParam === 'true' ? { isVerified: true } : {},
      isVerifiedParam === 'false' ? { isVerified: false } : {},
    ],
  };

  const [total, providers] = await Promise.all([
    prisma.provider.count({ where }),
    prisma.provider.findMany({
      where,
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const items = providers.map((p) => {
    const name = p.name || `${p.user?.firstName ?? ''} ${p.user?.lastName ?? ''}`.trim() || 'Provider';
    return {
      id: p.id,
      userId: p.userId,
      name,
      email: p.user?.email ?? null,
      city: p.coverageCity ?? null,
      state: p.coverageState ?? null,
      isVisibleInMarketplace: p.isVisibleInMarketplace ?? false,
      isVerified: p.isVerified ?? false,
      verifiedBy: p.verifiedBy ?? null,
      verifiedAt: p.verifiedAt ?? null,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  });

  return NextResponse.json({
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
    items,
  });
}

export function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405, headers: { Allow: 'GET' } });
}