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
  const city = (url.searchParams.get('city') || '').trim();
  const state = (url.searchParams.get('state') || '').trim();
  const page = toInt(url.searchParams.get('page'), 1);
  const pageSize = Math.min(toInt(url.searchParams.get('pageSize'), 20), 100);
  const hasUnverified = (url.searchParams.get('hasUnverifiedCredentials') || '').toLowerCase() === 'true';
  // Placeholder: visibility not yet implemented in schema; accept but ignore
  const _visibility = url.searchParams.get('isVisibleInMarketplace');

  const where: Prisma.CaregiverWhereInput = {
    AND: [
      q
        ? {
            user: {
              OR: [
                { firstName: { contains: q, mode: 'insensitive' } },
                { lastName: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
              ],
            },
          }
        : {},
      city ? { user: { addresses: { some: { city: { equals: city, mode: 'insensitive' } } } } } : {},
      state ? { user: { addresses: { some: { state: { equals: state, mode: 'insensitive' } } } } } : {},
      hasUnverified ? { credentials: { some: { isVerified: false } } } : {},
    ],
  };

  const [total, caregivers] = await Promise.all([
    prisma.caregiver.count({ where }),
    prisma.caregiver.findMany({
      where,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            addresses: {
              select: { city: true, state: true },
              take: 1,
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        credentials: { select: { id: true, isVerified: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const items = caregivers.map((c) => {
    const name = `${c.user?.firstName ?? ''} ${c.user?.lastName ?? ''}`.trim();
    const email = c.user?.email ?? '';
    const loc = c.user?.addresses?.[0] || null;
    const credentialCount = c.credentials.length;
    const verifiedCredentialCount = c.credentials.filter((x) => x.isVerified).length;
    return {
      id: c.id,
      userId: c.userId,
      name,
      email,
      city: loc?.city ?? null,
      state: loc?.state ?? null,
      createdAt: c.createdAt,
      isVisibleInMarketplace: null as null, // not implemented yet
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
