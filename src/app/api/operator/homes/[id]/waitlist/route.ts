export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

/**
 * GET /api/operator/homes/[id]/waitlist
 * Returns all waitlist entries for the given home.
 *
 * POST /api/operator/homes/[id]/waitlist
 * Manually add a family to the waitlist.
 */

const AddSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

async function verifyOperatorHome(homeId: string, userId: string) {
  const home = await prisma.assistedLivingHome.findFirst({
    where: {
      id: homeId,
      operator: { userId },
    },
    select: { id: true },
  });
  return home;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || (user.role !== UserRole.OPERATOR && user.role !== UserRole.ADMIN)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const home = await verifyOperatorHome(params.id, user.id);
  if (!home && user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: 'Home not found' }, { status: 404 });
  }

  const entries = await prisma.waitlistEntry.findMany({
    where: { homeId: params.id },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      notes: true,
      priority: true,
      notified: true,
      notifiedAt: true,
      createdAt: true,
      family: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
    },
  });

  return NextResponse.json({ entries });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || (user.role !== UserRole.OPERATOR && user.role !== UserRole.ADMIN)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const home = await verifyOperatorHome(params.id, user.id);
  if (!home && user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: 'Home not found' }, { status: 404 });
  }

  const body = AddSchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  const entry = await prisma.waitlistEntry.create({
    data: {
      homeId: params.id,
      name: body.data.name,
      email: body.data.email,
      phone: body.data.phone,
      notes: body.data.notes,
    },
  });

  return NextResponse.json({ entry }, { status: 201 });
}
