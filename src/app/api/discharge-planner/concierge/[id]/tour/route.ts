/**
 * POST /api/discharge-planner/concierge/[id]/tour
 * Body: { homeId }
 *
 * Request a tour for one home on a concierge shortlist. The concierge promise:
 * this never black-holes.
 *  - CLAIMED home   → notify the operator directly + cc the care team (Chris).
 *  - UNCLAIMED home → notify the care team (Chris) to coordinate on the family's
 *                     behalf + fire the claim-conversion signal (claim drip →
 *                     operator nudge + Anita's call list).
 * Tour status is tracked on the shortlist (curatedHomes JSON) so the DP sees it.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';
import { UserRole } from '@prisma/client';
import { sendConciergeTourNotification, sendNewLeadOperatorEmail } from '@/lib/email';
import { startClaimDripOnLead } from '@/lib/claim-engine/claim-drip';
import { markConciergeTourRequested, homeIsUnclaimed, CuratedHome } from '@/lib/concierge/tour-coordination';
import { recordLeadDelivery, qualificationFromConcierge, leadKeyFor } from '@/lib/leads/lead-delivery';
import { captureError } from '@/lib/sentry';

const bodySchema = z.object({ homeId: z.string().min(1) });

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole([UserRole.DISCHARGE_PLANNER, UserRole.ADMIN]);
    const { homeId } = bodySchema.parse(await request.json().catch(() => ({})));

    const search = await prisma.placementSearch.findUnique({
      where: { id: params.id },
      select: {
        id: true, userId: true, isConcierge: true, conciergeStatus: true, curatedHomes: true,
        payerSource: true, patientInfo: true,
        user: { select: { firstName: true, lastName: true, email: true, dischargePlannerProfile: { select: { organization: true } } } },
      },
    });
    if (!search || !search.isConcierge) {
      return NextResponse.json({ error: 'Concierge request not found' }, { status: 404 });
    }
    if (search.userId !== user.id && user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (search.conciergeStatus !== 'SHORTLIST_READY') {
      return NextResponse.json({ error: 'No shortlist is ready for this request yet.' }, { status: 400 });
    }
    const curated = (Array.isArray(search.curatedHomes) ? search.curatedHomes : []) as unknown as CuratedHome[];
    if (!curated.some((h) => h?.homeId === homeId)) {
      return NextResponse.json({ error: 'That home is not on this shortlist.' }, { status: 400 });
    }

    const home = await prisma.assistedLivingHome.findUnique({
      where: { id: homeId },
      select: { id: true, name: true, operator: { select: { id: true, user: { select: { email: true, firstName: true } } } } },
    });
    if (!home) {
      return NextResponse.json({ error: 'Home not found' }, { status: 404 });
    }

    // Persist the DP-visible status first (idempotent). If it was already
    // requested, return success without re-sending notifications.
    const mark = await markConciergeTourRequested(params.id, homeId, new Date().toISOString());
    if (mark === 'not_found') {
      return NextResponse.json({ error: 'That home is not on this shortlist.' }, { status: 400 });
    }
    if (mark === 'already') {
      return NextResponse.json({ ok: true, tourStatus: 'REQUESTED', alreadyRequested: true });
    }

    const operatorEmail = home.operator?.user?.email ?? null;
    const claimed = !homeIsUnclaimed(operatorEmail);
    const dpName = [search.user?.firstName, search.user?.lastName].filter(Boolean).join(' ') || undefined;
    const dpOrganization = search.user?.dischargePlannerProfile?.organization || undefined;

    // Always loop in the care team (Chris) so the tour gets coordinated.
    void sendConciergeTourNotification({ requestId: params.id, facilityName: home.name, claimed, dpName, dpOrganization });

    if (claimed && operatorEmail) {
      // Operator gets the lead directly (generic copy, no PHI).
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://getcarelinkai.com').replace(/\/$/, '');
      void sendNewLeadOperatorEmail({
        facilityName: home.name,
        toEmail: operatorEmail,
        operatorFirstName: home.operator?.user?.firstName ?? undefined,
        leadType: 'tour',
        ctaUrl: `${appUrl}/operator/tours`,
      });
      // Demand-first North Star: a concierge tour on a CLAIMED home is a lead
      // delivered automatically. Unclaimed goes through the manual concierge
      // deliver action below (the claim-drip branch is not a delivery).
      const pin = (search.patientInfo ?? {}) as Record<string, unknown>;
      void recordLeadDelivery({
        facilityId: homeId,
        operatorId: home.operator?.id ?? null,
        source: 'CONCIERGE',
        sourceId: search.id,
        channel: 'AUTOMATED',
        claimed: true,
        qualification: qualificationFromConcierge({
          payerSource: search.payerSource,
          dpEmail: search.user?.email,
          dpName,
          timeline: typeof pin.timeline === 'string' ? pin.timeline : null,
          careNeeds: typeof pin.medicalNeeds === 'string' ? pin.medicalNeeds : null,
        }),
        leadKey: leadKeyFor({ source: 'CONCIERGE', placementSearchId: search.id }),
      }).catch(() => {});
    } else if (!claimed) {
      // Unclaimed: fire the claim-conversion signal (operator nudge + call-list).
      void startClaimDripOnLead({ homeId, trigger: 'tour' });
    }

    return NextResponse.json({ ok: true, tourStatus: 'REQUESTED', claimed });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
    }
    if (error?.name === 'UnauthenticatedError') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (error?.name === 'UnauthorizedError') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('[concierge/tour] error:', error);
    captureError(error instanceof Error ? error : new Error(String(error)), { tags: { feature: 'concierge-tour' } });
    return NextResponse.json({ error: 'Could not request the tour. Please try again.' }, { status: 500 });
  }
}
