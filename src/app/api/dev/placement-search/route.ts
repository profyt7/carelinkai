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
 *
 * DELETE { email }: remove a seeded operator's homes (and their facility
 *   responses, via cascade) so later specs in the same job never lose their
 *   own home off page 1 of /search.
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
        // W4-2: facility accept/decline rows incl. the link token (dev only) +
        // the home's observed acceptance criteria roll-up.
        facilityResponses: {
          select: {
            id: true, homeId: true, status: true, token: true, contactEmail: true, delivery: true, summary: true,
            sentAt: true, openedAt: true, respondedAt: true, acceptedAt: true, declinedAt: true, admittedAt: true,
            declineReason: true, declineText: true,
            home: { select: { observedAcceptanceCriteria: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
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
      facilityResponses: s.facilityResponses,
    });
  } catch (e) {
    console.error('dev placement-search GET error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (process.env['ALLOW_DEV_ENDPOINTS'] !== '1') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === 'string' ? body.email : '';
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    const op = user ? await prisma.operator.findUnique({ where: { userId: user.id }, select: { id: true } }) : null;
    if (!op) return NextResponse.json({ ok: true, deleted: 0 });
    const homes = await prisma.assistedLivingHome.findMany({ where: { operatorId: op.id }, select: { id: true } });
    const ids = homes.map((h) => h.id);
    if (ids.length) {
      await prisma.facilityInspection.deleteMany({ where: { facilityId: { in: ids } } });
      await prisma.homePhoto.deleteMany({ where: { homeId: { in: ids } } });
      await prisma.address.deleteMany({ where: { homeId: { in: ids } } });
      await prisma.assistedLivingHome.deleteMany({ where: { id: { in: ids } } });
    }
    return NextResponse.json({ ok: true, deleted: ids.length });
  } catch (e) {
    console.error('dev placement-search DELETE error', e);
    return NextResponse.json({ ok: false, error: 'cleanup failed' }, { status: 200 });
  }
}
