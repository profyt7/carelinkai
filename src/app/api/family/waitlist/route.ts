export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

const JoinSchema = z.object({
  homeId: z.string().min(1),
  notes: z.string().optional(),
});

/**
 * POST /api/family/waitlist
 * Adds the authenticated family to a home's waitlist.
 *
 * GET /api/family/waitlist
 * Returns all waitlist entries for the authenticated family.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.role !== UserRole.FAMILY) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const family = await prisma.family.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!family) return NextResponse.json({ error: 'Family profile not found' }, { status: 404 });

  const body = JoinSchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  const home = await prisma.assistedLivingHome.findUnique({
    where: { id: body.data.homeId },
    select: { id: true, name: true },
  });
  if (!home) return NextResponse.json({ error: 'Home not found' }, { status: 404 });

  // Prevent duplicate entries
  const existing = await prisma.waitlistEntry.findFirst({
    where: { homeId: body.data.homeId, familyId: family.id },
  });
  if (existing) return NextResponse.json({ error: 'Already on waitlist for this home' }, { status: 409 });

  const entry = await prisma.waitlistEntry.create({
    data: {
      homeId: body.data.homeId,
      familyId: family.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      phone: user.phone ?? undefined,
      notes: body.data.notes,
    },
  });

  return NextResponse.json({ entry, homeName: home.name }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.role !== UserRole.FAMILY) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const family = await prisma.family.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (!family) return NextResponse.json({ entries: [] });

  const entries = await prisma.waitlistEntry.findMany({
    where: { familyId: family.id },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      notes: true,
      notified: true,
      notifiedAt: true,
      createdAt: true,
      home: {
        select: {
          id: true,
          name: true,
          address: { select: { city: true, state: true } },
        },
      },
    },
  });

  return NextResponse.json({ entries });
}
