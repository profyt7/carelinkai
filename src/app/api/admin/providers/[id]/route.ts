export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAnyRole } from '@/lib/rbac';
import { z } from 'zod';

function notFound() {
  return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAnyRole(['ADMIN' as any]);
  if (error) return error;
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const provider = await prisma.provider.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
  });
  if (!provider) return notFound();

  return NextResponse.json({
    id: provider.id,
    userId: provider.userId,
    user: provider.user,
    name: provider.name,
    bio: provider.bio,
    logoUrl: provider.logoUrl,
    serviceTypes: provider.serviceTypes,
    coverageCity: provider.coverageCity,
    coverageState: provider.coverageState,
    coverageRadius: provider.coverageRadius,
    isVisibleInMarketplace: provider.isVisibleInMarketplace,
    isVerified: provider.isVerified,
    verifiedBy: provider.verifiedBy,
    verifiedAt: provider.verifiedAt,
    createdAt: provider.createdAt,
    updatedAt: provider.updatedAt,
  });
}

const patchSchema = z.object({
  isVisibleInMarketplace: z.boolean().optional(),
  isVerified: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAnyRole(['ADMIN' as any]);
  if (error) return error;
  const adminId = (session?.user as any)?.id as string | undefined;
  if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const provider = await prisma.provider.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!provider) return notFound();

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { isVisibleInMarketplace, isVerified } = parsed.data;
  const data: any = {};
  if (typeof isVisibleInMarketplace === 'boolean') data.isVisibleInMarketplace = isVisibleInMarketplace;
  if (typeof isVerified === 'boolean') {
    data.isVerified = isVerified;
    data.verifiedAt = isVerified ? new Date() : null;
    data.verifiedBy = isVerified ? adminId : null;
  }

  const updated = await prisma.provider.update({
    where: { id: params.id },
    data,
    select: {
      id: true,
      isVisibleInMarketplace: true,
      isVerified: true,
      verifiedBy: true,
      verifiedAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ success: true, data: updated });
}

export function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405, headers: { Allow: 'GET, PATCH' } });
}

export function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405, headers: { Allow: 'GET, PATCH' } });
}

export function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405, headers: { Allow: 'GET, PATCH' } });
}
