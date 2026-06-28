export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * DEV-ONLY PlacementSearch helper (ALLOW_DEV_ENDPOINTS=1).
 *
 * POST: seed a COMPLETED PlacementSearch for a DP with caller-supplied AI
 *   "matches" — stands in for /api/discharge-planner/search, which needs
 *   ANTHROPIC_API_KEY (absent in CI). Body: { email, queryText, matches:[...] }.
 *   Returns { searchId }.
 *
 * GET ?id=...: read raw concierge-relevant state for assertions, incl. a
 *   placementRequestCount so a test can prove the concierge path created NO
 *   per-home PlacementRequest rows (i.e. nothing was routed to an operator).
 */
export async function POST(req: NextRequest) {
  if (process.env['ALLOW_DEV_ENDPOINTS'] !== '1') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }
  try {
    const body = await req.json().catch(() => ({} as any));
    const email: string | undefined = body.email?.toLowerCase?.();
    const queryText: string = body.queryText || 'Memory care near 44114, Medicaid, urgent';
    const matches: any[] = Array.isArray(body.matches) ? body.matches : [];
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) return NextResponse.json({ error: 'user not found' }, { status: 404 });

    const search = await prisma.placementSearch.create({
      data: {
        userId: user.id,
        queryText,
        parsedCriteria: {},
        searchResults: { matches },
        status: 'COMPLETED',
      },
      select: { id: true },
    });
    return NextResponse.json({ success: true, searchId: search.id });
  } catch (e) {
    console.error('dev placement-search POST error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  if (process.env['ALLOW_DEV_ENDPOINTS'] !== '1') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }
  try {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const s = await prisma.placementSearch.findUnique({
      where: { id },
      select: {
        id: true, isConcierge: true, conciergeStatus: true, patientInfo: true,
        curatedHomes: true, conciergeNote: true,
        _count: { select: { placementRequests: true } },
        user: { select: { email: true } },
      },
    });
    if (!s) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json({
      id: s.id,
      isConcierge: s.isConcierge,
      conciergeStatus: s.conciergeStatus,
      patientInfo: s.patientInfo,
      curatedHomes: s.curatedHomes,
      conciergeNote: s.conciergeNote,
      placementRequestCount: s._count.placementRequests,
      userEmail: s.user?.email ?? null,
    });
  } catch (e) {
    console.error('dev placement-search GET error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
