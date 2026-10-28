export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAnyRole } from '@/lib/rbac';
import { Prisma } from '@prisma/client';

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
  const serviceType = (url.searchParams.get('serviceType') || '').trim();
  const verified = url.searchParams.get('verified');
  const active = url.searchParams.get('active');
  const page = toInt(url.searchParams.get('page'), 1);
  const pageSize = Math.min(toInt(url.searchParams.get('pageSize'), 20), 100);
  const hasUnverified = (url.searchParams.get('hasUnverifiedCredentials') || '').toLowerCase() === 'true';

  const where: Prisma.ProviderWhereInput = {
    AND: [
      q
        ? {
            OR: [
              { businessName: { contains: q, mode: 'insensitive' } },
              { contactName: { contains: q, mode: 'insensitive' } },
              { contactEmail: { contains: q, mode: 'insensitive' } },
              { user: { firstName: { contains: q, mode: 'insensitive' } } },
              { user: { lastName: { contains: q, mode: 'insensitive' } } },
              { user: { email: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : {},
      serviceType ? { serviceTypes: { has: serviceType } } : {},
      verified !== null ? { isVerified: verified === 'true' } : {},
      active !== null ? { isActive: active === 'true' } : {},
      hasUnverified ? { credentials: { some: { status: { not: 'VERIFIED' } } } } : {},
    ],
  };

  const [total, providers] = await Promise.all([
    prisma.provider.count({ where }),
    prisma.provider.findMany({
      where,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        credentials: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const items = providers.map((p) => {
    const name = `${p.user?.firstName ?? ''} ${p.user?.lastName ?? ''}`.trim();
    const email = p.user?.email ?? '';
    const credentialCount = p.credentials.length;
    const verifiedCredentialCount = p.credentials.filter((x) => x.status === 'VERIFIED').length;
    return {
      id: p.id,
      userId: p.userId,
      businessName: p.businessName,
      contactName: p.contactName,
      contactEmail: p.contactEmail,
      name,
      email,
      serviceTypes: p.serviceTypes,
      isVerified: p.isVerified,
      isActive: p.isActive,
      createdAt: p.createdAt,
      credentialCount,
      verifiedCredentialCount,
      hasUnverifiedCredentials: credentialCount > verifiedCredentialCount,
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
