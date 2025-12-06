export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAnyRole } from '@/lib/rbac';

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  const { session, error } = await requireAnyRole(['ADMIN' as any, 'STAFF' as any]);
  if (error) return error;
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = params.id;
  if (!id) return NextResponse.json({ error: 'Missing provider id' }, { status: 400 });

  const p = await (prisma as any).provider.findUnique({
    where: { id },
    include: { user: { select: { id: true, email: true } } },
  });
  if (!p) return NextResponse.json({ error: 'Provider not found' }, { status: 404 });

  return NextResponse.json({
    id: p.id,
    userId: p.userId,
    email: p.user?.email ?? null,
    name: p.name ?? '',
    bio: p.bio ?? '',
    logoUrl: p.logoUrl ?? null,
    serviceTypes: p.serviceTypes ?? [],
    coverageCity: p.coverageCity ?? null,
    coverageState: p.coverageState ?? null,
    coverageRadius: p.coverageRadius ?? null,
    isVisibleInMarketplace: Boolean(p.isVisibleInMarketplace),
    isVerified: Boolean(p.isVerified),
    verifiedBy: p.verifiedBy ?? null,
    verifiedAt: p.verifiedAt ?? null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAnyRole(['ADMIN' as any, 'STAFF' as any]);
  if (error) return error;
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = params.id;
  if (!id) return NextResponse.json({ error: 'Missing provider id' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const data: any = {};
  if (typeof body.isVisibleInMarketplace === 'boolean') data.isVisibleInMarketplace = body.isVisibleInMarketplace;
  if (typeof body.isVerified === 'boolean') {
    data.isVerified = body.isVerified;
    data.verifiedBy = body.isVerified ? session.user.id : null;
    data.verifiedAt = body.isVerified ? new Date() : null;
  }
  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'No updatable fields' }, { status: 400 });

  const updated = await (prisma as any).provider.update({ where: { id }, data });
  return NextResponse.json({ ok: true, id: updated.id, isVisibleInMarketplace: updated.isVisibleInMarketplace, isVerified: updated.isVerified, verifiedBy: updated.verifiedBy, verifiedAt: updated.verifiedAt });
}
