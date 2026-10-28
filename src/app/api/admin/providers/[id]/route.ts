export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAnyRole } from '@/lib/rbac';
import { z } from 'zod';

type Params = { params: { id: string } };

const updateProviderSchema = z.object({
  isActive: z.boolean().optional(),
  isVerified: z.boolean().optional(),
});

export async function GET(_req: NextRequest, { params }: Params) {
  const { session, error } = await requireAnyRole(['ADMIN' as any]);
  if (error) return error;
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = params.id;
  if (!id) return NextResponse.json({ error: 'Missing provider id' }, { status: 400 });

  const provider = await prisma.provider.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      credentials: {
        select: {
          id: true,
          type: true,
          documentUrl: true,
          status: true,
          verifiedAt: true,
          verifiedBy: true,
          expiresAt: true,
          notes: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!provider) {
    return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
  }

  const name = `${provider.user?.firstName ?? ''} ${provider.user?.lastName ?? ''}`.trim();
  const credentialCount = provider.credentials.length;
  const verifiedCredentialCount = provider.credentials.filter((c) => c.status === 'VERIFIED').length;

  return NextResponse.json({
    id: provider.id,
    userId: provider.userId,
    name,
    email: provider.user?.email ?? null,
    businessName: provider.businessName,
    contactName: provider.contactName,
    contactEmail: provider.contactEmail,
    contactPhone: provider.contactPhone,
    bio: provider.bio,
    website: provider.website,
    insuranceInfo: provider.insuranceInfo,
    licenseNumber: provider.licenseNumber,
    yearsInBusiness: provider.yearsInBusiness,
    serviceTypes: provider.serviceTypes,
    coverageArea: provider.coverageArea,
    isVerified: provider.isVerified,
    isActive: provider.isActive,
    createdAt: provider.createdAt,
    credentials: provider.credentials,
    credentialSummary: { credentialCount, verifiedCredentialCount },
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAnyRole(['ADMIN' as any]);
  if (error) return error;
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = params.id;
  if (!id) return NextResponse.json({ error: 'Missing provider id' }, { status: 400 });

  const body = await req.json();
  const validationResult = updateProviderSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: validationResult.error.format() },
      { status: 400 }
    );
  }

  const { isActive, isVerified } = validationResult.data;

  const provider = await prisma.provider.findUnique({ where: { id } });
  if (!provider) {
    return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
  }

  const updates: any = {};
  if (isActive !== undefined) updates.isActive = isActive;
  if (isVerified !== undefined) updates.isVerified = isVerified;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }

  const updatedProvider = await prisma.provider.update({
    where: { id },
    data: updates,
  });

  return NextResponse.json({
    success: true,
    provider: updatedProvider,
  });
}
