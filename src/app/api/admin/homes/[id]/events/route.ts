/**
 * Admin read-only history for one home (sprint W5-1, Δ14 / G2).
 *
 *   GET /api/admin/homes/:id/events?limit=100
 *
 * Returns the EntityEvent rows whose entityId is this home (availability,
 * listing claim, operator-profile edits, ping consent) plus the facility
 * responses that reference it, newest first. Read-only: there is no write
 * path for EntityEvent anywhere in the app.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';

const HOME_SCOPED = ['HOME', 'AVAILABILITY', 'LISTING_CLAIM', 'OPERATOR_PROFILE', 'AVAILABILITY_PING'] as const;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole([UserRole.ADMIN]);
    const limit = Math.min(500, Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') ?? '100', 10) || 100));
    const responseIds = (
      await prisma.facilityResponse.findMany({ where: { homeId: params.id }, select: { id: true } })
    ).map((r) => r.id);
    const events = await prisma.entityEvent.findMany({
      where: {
        OR: [
          { entityType: { in: [...HOME_SCOPED] }, entityId: params.id },
          ...(responseIds.length ? [{ entityType: 'FACILITY_RESPONSE' as const, entityId: { in: responseIds } }] : []),
        ],
      },
      orderBy: { occurredAt: 'desc' },
      take: limit,
    });
    return NextResponse.json({ events, total: events.length }, { headers: { 'cache-control': 'no-store' } });
  } catch (e) {
    const name = (e as { name?: string })?.name;
    if (name === 'UnauthenticatedError') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}
