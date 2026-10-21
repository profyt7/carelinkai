/**
 * GET /api/admin/availability/call-list?week=2026-W43[&format=csv] — admin only (OL-163b).
 *
 * Homes the AI availability agent should call this cycle: every ACTIVE,
 * non-demo Cleveland listing + every home on the WRAAA waiver list, with an
 * ODH phone (E.164), minus do_not_call, wrong_number, declined (< 30 days),
 * wants_human (< 30 days) and anything already attempted this week. One
 * attempt per home per week. CSV (homeId, name, phone, city) for the
 * ElevenLabs batch-call job, or JSON with the exclusion counts.
 * Reads only; nothing here calls anyone.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import { requireRole } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { captureError } from '@/lib/sentry';
import {
  CALL_WINDOW,
  EXCLUDE_REASONS,
  WAIVER_LIST_STATUSES,
  callListCsv,
  callListDecision,
  callWeek,
  type CallListRow,
  type ExcludeReason,
} from '@/lib/availability/call-rules';

const LOOKBACK_DAYS = 45;

export async function GET(request: NextRequest) {
  try {
    await requireRole([UserRole.ADMIN]);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const now = new Date();
  const week = callWeek(request.nextUrl.searchParams.get('week'), now);
  if (!week) return NextResponse.json({ error: 'week must be an ISO week like 2026-W43 or a date' }, { status: 400 });

  try {
    const since = new Date(Math.min(week.start.getTime(), now.getTime()) - LOOKBACK_DAYS * 86_400_000);
    const homes = await prisma.assistedLivingHome.findMany({
      where: {
        isDemo: false,
        OR: [{ status: 'ACTIVE' }, { medicaidWaiverStatus: { in: [...WAIVER_LIST_STATUSES] } }],
      },
      select: {
        id: true,
        name: true,
        phone: true,
        doNotCall: true,
        medicaidWaiverStatus: true,
        address: { select: { city: true } },
        availabilityObservations: {
          where: { calledAt: { gte: since } },
          orderBy: { calledAt: 'desc' },
          select: { outcome: true, calledAt: true, doNotCall: true },
        },
      },
      orderBy: [{ address: { city: 'asc' } }, { name: 'asc' }],
    });

    const rows: CallListRow[] = [];
    const excluded = Object.fromEntries(EXCLUDE_REASONS.map((r) => [r, 0])) as Record<ExcludeReason, number>;
    for (const h of homes) {
      const d = callListDecision(
        { id: h.id, name: h.name, phone: h.phone, city: h.address?.city ?? null, doNotCall: h.doNotCall, medicaidWaiverStatus: h.medicaidWaiverStatus, observations: h.availabilityObservations },
        week,
        now,
      );
      if (d.include) rows.push(d.row);
      else excluded[d.reason] += 1;
    }

    if (request.nextUrl.searchParams.get('format') === 'csv') {
      return new NextResponse(callListCsv(rows), {
        status: 200,
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': `attachment; filename="availability-call-list-${week.label}.csv"`,
          'cache-control': 'no-store',
        },
      });
    }
    return NextResponse.json(
      {
        week: { label: week.label, start: week.start.toISOString(), end: week.end.toISOString() },
        callWindow: CALL_WINDOW,
        candidates: homes.length,
        count: rows.length,
        excluded,
        rows,
        generatedAt: now.toISOString(),
      },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (e) {
    captureError(e instanceof Error ? e : new Error(String(e)), { tags: { route: 'admin/availability/call-list' } });
    return NextResponse.json({ error: 'Failed to build the call list' }, { status: 500 });
  }
}
