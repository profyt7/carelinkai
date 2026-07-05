/**
 * GET /api/admin/concierge
 * Admin concierge queue: discharge-planner placement requests routed to CareLinkAI.
 * Optional ?status=SUBMITTED|MATCHING|SHORTLIST_READY filter.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';
import { UserRole } from '@prisma/client';

const VALID = ['SUBMITTED', 'MATCHING', 'SHORTLIST_READY'];

export async function GET(request: NextRequest) {
  try {
    await requireRole([UserRole.ADMIN]);
    const status = new URL(request.url).searchParams.get('status');

    const where: any = { isConcierge: true };
    if (status && VALID.includes(status)) where.conciergeStatus = status;

    const rows = await prisma.placementSearch.findMany({
      where,
      select: {
        id: true,
        queryText: true,
        payerSource: true,
        conciergeStatus: true,
        conciergeSubmittedAt: true,
        conciergeRespondedAt: true,
        curatedHomes: true,
        createdAt: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            dischargePlannerProfile: { select: { organization: true } },
          },
        },
      },
      orderBy: [{ conciergeSubmittedAt: 'desc' }],
      take: 200,
    });

    // Open = needs Chris's attention (not yet sent back).
    const openCount = rows.filter((r) => r.conciergeStatus !== 'SHORTLIST_READY').length;
    return NextResponse.json({ requests: rows, total: rows.length, openCount });
  } catch (error: any) {
    if (error?.name === 'UnauthenticatedError') {
      return NextResponse.json({ error: 'Unauthorized', requests: [] }, { status: 401 });
    }
    if (error?.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Forbidden', requests: [] }, { status: 403 });
    }
    console.error('[admin/concierge] list error:', error);
    return NextResponse.json({ error: 'Failed to load queue', requests: [] }, { status: 500 });
  }
}
