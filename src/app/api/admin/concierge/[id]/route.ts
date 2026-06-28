/**
 * GET   /api/admin/concierge/[id]   — full concierge request (patient intake +
 *                                      AI candidate matches + current shortlist).
 * PATCH /api/admin/concierge/[id]   — curate / advance:
 *   { action: 'matching' }                              → mark "Matching" (in progress)
 *   { action: 'respond', curatedHomes, conciergeNote }  → save curated shortlist
 *                                                          + mark "Shortlist ready"
 *
 * curatedHomes in: [{ homeId, note?, confirmedAvailability? }] — the server
 * enriches each with the home's current name + address before storing, so the
 * DP-facing shortlist is self-contained.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';
import { UserRole } from '@prisma/client';

function authErr(error: any): NextResponse | null {
  if (error?.name === 'UnauthenticatedError') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (error?.name === 'UnauthorizedError') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return null;
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole([UserRole.ADMIN]);
    const row = await prisma.placementSearch.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        queryText: true,
        parsedCriteria: true,
        searchResults: true,
        patientInfo: true,
        isConcierge: true,
        conciergeStatus: true,
        curatedHomes: true,
        conciergeNote: true,
        conciergeSubmittedAt: true,
        conciergeRespondedAt: true,
        createdAt: true,
        user: {
          select: {
            firstName: true, lastName: true, email: true, phone: true,
            dischargePlannerProfile: { select: { organization: true, title: true } },
          },
        },
      },
    });
    if (!row || !row.isConcierge) {
      return NextResponse.json({ error: 'Concierge request not found' }, { status: 404 });
    }
    return NextResponse.json({ request: row });
  } catch (error: any) {
    const a = authErr(error);
    if (a) return a;
    console.error('[admin/concierge/:id] get error:', error);
    return NextResponse.json({ error: 'Failed to load request' }, { status: 500 });
  }
}

const curatedSchema = z.object({
  homeId: z.string().min(1),
  note: z.string().optional(),
  confirmedAvailability: z.string().optional(),
});
const patchSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('matching') }),
  z.object({
    action: z.literal('respond'),
    curatedHomes: z.array(curatedSchema).min(1, 'Add at least one home to the shortlist'),
    conciergeNote: z.string().optional(),
  }),
]);

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole([UserRole.ADMIN]);
    const body = await request.json().catch(() => ({}));
    const parsed = patchSchema.parse(body);

    const existing = await prisma.placementSearch.findUnique({
      where: { id: params.id },
      select: { id: true, isConcierge: true },
    });
    if (!existing || !existing.isConcierge) {
      return NextResponse.json({ error: 'Concierge request not found' }, { status: 404 });
    }

    if (parsed.action === 'matching') {
      await prisma.placementSearch.update({
        where: { id: params.id },
        data: { conciergeStatus: 'MATCHING' },
      });
      return NextResponse.json({ ok: true, status: 'MATCHING' });
    }

    // action === 'respond' — enrich curated homes with current name/address.
    const homeIds = parsed.curatedHomes.map((h) => h.homeId);
    const homes = await prisma.assistedLivingHome.findMany({
      where: { id: { in: homeIds } },
      select: { id: true, name: true, address: { select: { street: true, city: true, state: true, zipCode: true } } },
    });
    const byId = new Map(homes.map((h) => [h.id, h]));

    const curated = parsed.curatedHomes
      .filter((h) => byId.has(h.homeId))
      .map((h) => {
        const home = byId.get(h.homeId)!;
        const a = home.address;
        const address = a ? `${a.street}, ${a.city}, ${a.state} ${a.zipCode}` : '';
        return {
          homeId: h.homeId,
          name: home.name,
          address,
          note: h.note?.trim() || '',
          confirmedAvailability: h.confirmedAvailability?.trim() || '',
        };
      });

    if (curated.length === 0) {
      return NextResponse.json({ error: 'None of the selected homes exist anymore.' }, { status: 400 });
    }

    await prisma.placementSearch.update({
      where: { id: params.id },
      data: {
        curatedHomes: curated,
        conciergeNote: parsed.conciergeNote?.trim() || null,
        conciergeStatus: 'SHORTLIST_READY',
        conciergeRespondedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, status: 'SHORTLIST_READY', curatedCount: curated.length });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
    }
    const a = authErr(error);
    if (a) return a;
    console.error('[admin/concierge/:id] patch error:', error);
    return NextResponse.json({ error: 'Could not update the request.' }, { status: 500 });
  }
}
