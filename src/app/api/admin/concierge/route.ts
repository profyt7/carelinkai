/**
 * GET /api/admin/concierge
 * Admin concierge queue: discharge-planner placement requests routed to CareLinkAI.
 * Optional ?status=SUBMITTED|MATCHING|SHORTLIST_READY|WAITLIST|PENDING_PAYMENT filter.
 * Without a filter, PENDING_PAYMENT rows (checkout started, not paid) are hidden —
 * the paid webhook promotes them to SUBMITTED. Each row carries its latest
 * ConciergeOrder (status / amount / paidAt) for the Paid chip (sprint W5-3).
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';
import { UserRole } from '@prisma/client';

const VALID = ['SUBMITTED', 'MATCHING', 'SHORTLIST_READY', 'WAITLIST', 'PENDING_PAYMENT'];

export async function GET(request: NextRequest) {
  try {
    await requireRole([UserRole.ADMIN]);
    const status = new URL(request.url).searchParams.get('status');

    const where: any = { isConcierge: true };
    if (status && VALID.includes(status)) where.conciergeStatus = status;
    else where.NOT = { conciergeStatus: 'PENDING_PAYMENT' };

    const rows = await prisma.placementSearch.findMany({
      where,
      select: {
        id: true,
        queryText: true,
        payerSource: true,
        source: true,
        conciergeStatus: true,
        conciergeSubmittedAt: true,
        conciergeRespondedAt: true,
        curatedHomes: true,
        createdAt: true,
        conciergeOrders: { select: { id: true, status: true, amountCents: true, paidAt: true }, orderBy: { createdAt: 'desc' }, take: 1 },
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
