export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAnyRole } from '@/lib/rbac';

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  const { session, error } = await requireAnyRole(['ADMIN' as any]);
  if (error) return error;
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = params.id;
  if (!id) return NextResponse.json({ error: 'Missing caregiver id' }, { status: 400 });

  const caregiver = await prisma.caregiver.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          addresses: { select: { city: true, state: true, zipCode: true }, take: 1, orderBy: { createdAt: 'desc' } },
        },
      },
      credentials: {
        select: {
          id: true,
          type: true,
          documentUrl: true,
          issueDate: true,
          expirationDate: true,
          isVerified: true,
          verifiedBy: true,
          verifiedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!caregiver) {
    return NextResponse.json({ error: 'Caregiver not found' }, { status: 404 });
  }

  const addr = caregiver.user?.addresses?.[0] || null;
  const name = `${caregiver.user?.firstName ?? ''} ${caregiver.user?.lastName ?? ''}`.trim();
  const credentialCount = caregiver.credentials.length;
  const verifiedCredentialCount = caregiver.credentials.filter((c) => c.isVerified).length;

  // Optional: availability summary for next 7 days
  // Count slots for the caregiver's userId
  let availabilitySummary: { upcomingSlots7d: number } | null = null;
  try {
    const now = new Date();
    const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingSlots7d = await prisma.availabilitySlot.count({
      where: {
        userId: caregiver.userId,
        startTime: { gte: now },
        endTime: { lte: in7d },
        isAvailable: true,
      },
    });
    availabilitySummary = { upcomingSlots7d };
  } catch {
    availabilitySummary = null;
  }

  return NextResponse.json({
    id: caregiver.id,
    userId: caregiver.userId,
    name,
    email: caregiver.user?.email ?? null,
    location: { city: addr?.city ?? null, state: addr?.state ?? null, zipCode: addr?.zipCode ?? null },
    createdAt: caregiver.createdAt,
    bio: caregiver.bio,
    yearsExperience: caregiver.yearsExperience,
    hourlyRate: caregiver.hourlyRate,
    specialties: caregiver.specialties,
    settings: caregiver.settings,
    careTypes: caregiver.careTypes,
    isVisibleInMarketplace: null as null, // not implemented yet
    credentials: caregiver.credentials,
    credentialSummary: { credentialCount, verifiedCredentialCount },
    availabilitySummary,
  });
}
