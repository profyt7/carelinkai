/**
 * Operator self-serve availability (sprint W5-1).
 *
 *   PUT /api/operator/homes/:id/availability  { count }
 *
 * The operator (or an admin) sets the open-bed count for a home they own. Goes
 * through THE single availability write path (`updateAvailability`, source
 * OPERATOR), which stamps `availabilityVerifiedAt` and records the
 * `availability.updated` history row in the same transaction.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';
import { updateAvailability, normalizeCount, availabilityView } from '@/lib/availability/availability';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole([UserRole.OPERATOR, UserRole.ADMIN]);
    const home = await ownedHome(params.id, user.id, user.role);
    if (!home) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ view: availabilityView(home) });
  } catch (e) {
    return authError(e);
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole([UserRole.OPERATOR, UserRole.ADMIN]);
    const home = await ownedHome(params.id, user.id, user.role);
    if (!home) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const body = (await req.json().catch(() => ({}))) as { count?: unknown };
    const count = normalizeCount(body.count);
    if (count === null) return NextResponse.json({ error: 'count must be a whole number of open beds (0 is fine)' }, { status: 400 });
    const view = await updateAvailability({ homeId: home.id, count, source: 'OPERATOR', actor: { userId: user.id, role: user.role } });
    return NextResponse.json({ ok: true, view });
  } catch (e) {
    return authError(e);
  }
}

async function ownedHome(id: string, userId: string, role: UserRole) {
  const home = await prisma.assistedLivingHome.findUnique({
    where: { id },
    select: { id: true, operatorId: true, availabilityCount: true, availabilityVerifiedAt: true, availabilitySource: true, operator: { select: { userId: true } } },
  });
  if (!home) return null;
  if (role !== UserRole.ADMIN && home.operator?.userId !== userId) return null;
  return home;
}

function authError(e: unknown) {
  const name = (e as { name?: string })?.name;
  if (name === 'UnauthenticatedError') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (name === 'UnauthorizedError' || String((e as Error)?.message ?? '').includes('Unauthorized')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ error: 'Could not update availability' }, { status: 500 });
}
