/**
 * Discharge-planner CONCIERGE placement requests.
 *
 * POST /api/discharge-planner/concierge
 *   Body: { searchId, patientInfo }
 *   Routes a placement request to CareLinkAI (admin) instead of auto-emailing
 *   operators. Persists the patient intake IN-APP on the PlacementSearch and
 *   notifies the care team (PHI-free email). This is the pilot default — the
 *   old direct-to-operator email path black-holes on unclaimed (sentinel) homes.
 *
 * GET /api/discharge-planner/concierge
 *   The current DP's concierge requests with status + curated shortlist.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-utils';
import { UserRole } from '@prisma/client';
import { sendConciergeRequestNotification } from '@/lib/email';
import { captureError } from '@/lib/sentry';
import { isPayerSource } from '@/lib/payer/payer-source';
import { recordEvent } from '@/lib/events/record-event';
import { deriveIntakeFacts } from '@/lib/concierge/intake-facts';
import { toDpFacilityResponse } from '@/lib/concierge/facility-response-engine';

// Minimum-necessary intake. Kept in-app; never emailed out.
const patientInfoSchema = z.object({
  patientName: z.string().optional(),
  patientAge: z.string().optional(),
  medicalNeeds: z.string().min(1, 'Describe the care needs'),
  timeline: z.string().optional(),
  paymentType: z.string().optional(),
  additionalNotes: z.string().optional(),
  preferredHomeId: z.string().optional(),
  preferredHomeName: z.string().optional(),
});

const submitSchema = z.object({
  searchId: z.string().min(1),
  patientInfo: patientInfoSchema,
  // Payer-source screener (OL-114) — optional tag, z.unknown so a blank/legacy
  // client can never 400; validated via isPayerSource before persisting.
  payerSource: z.unknown().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole([UserRole.DISCHARGE_PLANNER, UserRole.ADMIN]);
    const body = await request.json().catch(() => ({}));
    const { searchId, patientInfo, payerSource } = submitSchema.parse(body);

    // The search must exist and belong to this DP (admins may act on any).
    const search = await prisma.placementSearch.findUnique({
      where: { id: searchId },
      select: { id: true, userId: true },
    });
    if (!search) {
      return NextResponse.json({ error: 'Search not found' }, { status: 404 });
    }
    if (search.userId !== user.id && user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const prev = await prisma.placementSearch.findUnique({
      where: { id: searchId },
      select: { conciergeStatus: true, queryText: true, parsedCriteria: true },
    });
    const facts = deriveIntakeFacts({ payerSource, patientInfo, parsedCriteria: prev?.parsedCriteria, queryText: prev?.queryText });
    await prisma.$transaction(async (tx) => {
      await tx.placementSearch.update({
        where: { id: searchId },
        data: {
          isConcierge: true,
          conciergeStatus: 'SUBMITTED',
          patientInfo,
          // Payer-source tag (OL-114) — invalid/blank normalizes to null. TAGS ONLY.
          payerSource: isPayerSource(payerSource) ? payerSource : null,
          payerLane: facts.payerLane,
          intakeZip: facts.intakeZip,
          careLevel: facts.careLevel,
          conciergeSubmittedAt: new Date(),
        },
      });
      // History (sprint W5-1): status + the PHI-free intake facts only.
      await recordEvent(tx, {
        entityType: 'PLACEMENT_SEARCH',
        entityId: searchId,
        eventType: 'status.changed',
        field: 'conciergeStatus',
        oldValue: { status: prev?.conciergeStatus ?? null },
        newValue: { status: 'SUBMITTED', payerLane: facts.payerLane, zip: facts.intakeZip, careLevel: facts.careLevel },
        source: user.role === UserRole.ADMIN ? 'ADMIN' : 'DP',
        actor: { userId: user.id, role: user.role },
      });
    });

    // PHI-free admin alert (DP identity + link only). Fire-and-forget.
    const dp = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        firstName: true,
        lastName: true,
        dischargePlannerProfile: { select: { organization: true } },
      },
    });
    void sendConciergeRequestNotification({
      requestId: searchId,
      dpName: [dp?.firstName, dp?.lastName].filter(Boolean).join(' ') || undefined,
      dpOrganization: dp?.dischargePlannerProfile?.organization || undefined,
    });

    return NextResponse.json({ ok: true, status: 'SUBMITTED' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
    }
    if (error?.message?.includes('Unauthorized') || error?.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (error?.name === 'UnauthenticatedError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[concierge] submit error:', error);
    captureError(error instanceof Error ? error : new Error(String(error)), { tags: { feature: 'concierge' } });
    return NextResponse.json({ error: 'Could not submit your request. Please try again.' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const user = await requireRole([UserRole.DISCHARGE_PLANNER, UserRole.ADMIN]);
    const rows = await prisma.placementSearch.findMany({
      where: { userId: user.id, isConcierge: true },
      select: {
        id: true,
        queryText: true,
        conciergeStatus: true,
        curatedHomes: true,
        conciergeNote: true,
        conciergeSubmittedAt: true,
        conciergeRespondedAt: true,
        patientInfo: true,
        createdAt: true,
        // W4-2: each shortlisted home's accept / decline state (no facility contact email).
        facilityResponses: {
          select: {
            id: true, homeId: true, status: true, sentAt: true, openedAt: true, respondedAt: true,
            acceptedAt: true, declinedAt: true, admittedAt: true, declineReason: true, declineText: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { conciergeSubmittedAt: 'desc' },
      take: 100,
    });
    const requests = rows.map((r) => ({ ...r, facilityResponses: r.facilityResponses.map(toDpFacilityResponse) }));
    return NextResponse.json({ requests, total: requests.length });
  } catch (error: any) {
    if (error?.name === 'UnauthenticatedError') {
      return NextResponse.json({ error: 'Unauthorized', requests: [] }, { status: 401 });
    }
    console.error('[concierge] list error:', error);
    return NextResponse.json({ error: 'Failed to load concierge requests', requests: [] }, { status: 500 });
  }
}
