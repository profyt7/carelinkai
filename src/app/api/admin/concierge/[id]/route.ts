/**
 * GET   /api/admin/concierge/[id]   — full concierge request (patient intake +
 *                                      AI candidate matches + current shortlist).
 * PATCH /api/admin/concierge/[id]   — curate / advance:
 *   { action: 'matching' }                              → mark "Matching" (in progress)
 *   { action: 'respond', curatedHomes, conciergeNote }  → save curated shortlist
 *                                                          + mark "Shortlist ready"
 *                                                          + one FacilityResponse per home
 *                                                            (tokenized accept/decline link
 *                                                            emailed to the facility — W4-2)
 *   { action: 'admitted', homeId }                      → admin confirms the move-in
 *                                                          (ACCEPTED → ADMITTED)
 *   { action: 'suggest' }                               → run matching on demand when no
 *                                                          matches are stored (family requests)
 *                                                          and store them like a DP search
 *
 * curatedHomes in: [{ homeId, note?, confirmedAvailability?, availabilityLabel? }] — in the admin's order.
 * The server enriches each with the home's current name + address before storing, so the shortlist is
 * self-contained. Any public home can be added (not only stored matches). availabilityLabel is what the
 * family sees: 'verified' (our team verified it) or 'unconfirmed' (ask the home); when omitted it defaults
 * to unconfirmed unless the home's current availability is verified.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { recordEvent } from '@/lib/events/record-event';
import { requireRole } from '@/lib/auth-utils';
import { UserRole } from '@prisma/client';
import { createInAppNotification } from '@/lib/services/notifications';
import { sendConciergeShortlistReadyEmail } from '@/lib/email';
import { createFacilityResponsesForShortlist, markAdmitted, FACILITY_RESPONSE_SELECT } from '@/lib/concierge/facility-response-engine';
import { captureError } from '@/lib/sentry';
import { CONCIERGE_PAGE_SOURCE } from '@/lib/concierge/intake';
import { configuredPaymentLink } from '@/lib/concierge/pay-when-ready';
import { defaultAvailabilityLabel, openingsVerifiedOn, suggestHomesForRequest } from '@/lib/concierge/manual-shortlist';

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
        payerSource: true,
        intakeZip: true,
        careLevel: true,
        source: true,
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
        // W4-2: per-home accept / decline state + reasons (admin sees the contact email too).
        facilityResponses: { select: FACILITY_RESPONSE_SELECT, orderBy: { createdAt: 'asc' } },
        // W5-3: paid concierge order(s) — status, cents, timestamps only.
        // Pay when ready (10/31): payment-link + release state for the order actions.
        conciergeOrders: { select: { id: true, status: true, amountCents: true, paidAt: true, refundedAt: true, createdAt: true, paymentLinkUrl: true, paymentLinkSentAt: true, shortlistReleasedAt: true, paymentReminderSentAt: true, expiredAt: true }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!row || !row.isConcierge) {
      return NextResponse.json({ error: 'Concierge request not found' }, { status: 404 });
    }
    // OL-248: with CONCIERGE_PAYMENT_LINK_URL set, "send payment link" needs no paste (boolean only — never the URL).
    return NextResponse.json({ request: row, paymentLinkConfigured: !!configuredPaymentLink() });
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
  availabilityLabel: z.enum(['verified', 'unconfirmed']).optional(),
});
const patchSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('matching') }),
  z.object({ action: z.literal('admitted'), homeId: z.string().min(1) }),
  z.object({ action: z.literal('suggest') }),
  z.object({
    action: z.literal('respond'),
    curatedHomes: z.array(curatedSchema).min(1, 'Add at least one home to the shortlist'),
    conciergeNote: z.string().optional(),
  }),
]);

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireRole([UserRole.ADMIN]);
    const body = await request.json().catch(() => ({}));
    const parsed = patchSchema.parse(body);

    const existing = await prisma.placementSearch.findUnique({
      where: { id: params.id },
      select: { id: true, isConcierge: true, userId: true, conciergeStatus: true, source: true, user: { select: { email: true } } },
    });
    if (!existing || !existing.isConcierge) {
      return NextResponse.json({ error: 'Concierge request not found' }, { status: 404 });
    }

    if (parsed.action === 'matching') {
      await prisma.$transaction(async (tx) => {
        await tx.placementSearch.update({ where: { id: params.id }, data: { conciergeStatus: 'MATCHING' } });
        await recordEvent(tx, {
          entityType: 'PLACEMENT_SEARCH', entityId: params.id, eventType: 'status.changed', field: 'conciergeStatus',
          oldValue: { status: existing.conciergeStatus }, newValue: { status: 'MATCHING' },
          source: 'ADMIN', actor: { userId: admin.id, role: admin.role },
        });
      });
      return NextResponse.json({ ok: true, status: 'MATCHING' });
    }

    if (parsed.action === 'admitted') {
      const r = await markAdmitted({ searchId: params.id, homeId: parsed.homeId, actor: { userId: admin.id, role: admin.role } });
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: 409 });
      return NextResponse.json({ ok: true, status: 'ADMITTED', homeId: parsed.homeId });
    }

    if (parsed.action === 'suggest') {
      const r = await suggestHomesForRequest(params.id, { userId: admin.id, role: admin.role });
      if (!r.ok) return NextResponse.json({ error: r.reason === 'has_matches' ? 'Matches are already stored for this request.' : 'Concierge request not found' }, { status: r.reason === 'has_matches' ? 409 : 404 });
      return NextResponse.json({ ok: true, count: r.count, near: r.near });
    }

    // action === 'respond' — enrich curated homes with current name/address.
    const homeIds = parsed.curatedHomes.map((h) => h.homeId);
    const homes = await prisma.assistedLivingHome.findMany({
      where: { id: { in: homeIds } },
      select: { id: true, name: true, availabilityCount: true, availabilityVerifiedAt: true, availabilitySource: true, address: { select: { street: true, city: true, state: true, zipCode: true } } },
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
          ...(() => {
            const availabilityLabel = h.availabilityLabel ?? defaultAvailabilityLabel(home);
            return { availabilityLabel, availabilityVerifiedOn: availabilityLabel === 'verified' ? openingsVerifiedOn(home) : null };
          })(),
        };
      });

    if (curated.length === 0) {
      return NextResponse.json({ error: 'None of the selected homes exist anymore.' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.placementSearch.update({
        where: { id: params.id },
        data: {
          curatedHomes: curated,
          conciergeNote: parsed.conciergeNote?.trim() || null,
          conciergeStatus: 'SHORTLIST_READY',
          conciergeRespondedAt: new Date(),
        },
      });
      await recordEvent(tx, {
        entityType: 'PLACEMENT_SEARCH', entityId: params.id, eventType: 'status.changed', field: 'conciergeStatus',
        oldValue: { status: existing.conciergeStatus }, newValue: { status: 'SHORTLIST_READY', count: curated.length },
        source: 'ADMIN', actor: { userId: admin.id, role: admin.role },
      });
    });

    // Tell the DP their shortlist is ready: in-app bell badge + PHI-free email.
    // Fire-and-forget — never block or fail the admin's send on a notify hiccup.
    // A family request (/concierge) is owned by a system user: the family gets the payment link and, once
    // paid, the shortlist through the order actions instead (pay when ready, 10/31).
    const familyRequest = existing.source === CONCIERGE_PAGE_SOURCE;
    const optionWord = curated.length === 1 ? 'option' : 'options';
    if (!familyRequest) void createInAppNotification({
      userId: existing.userId,
      type: 'ALERT',
      title: 'Your shortlist is ready',
      message: `Your CareLinkAI care team curated ${curated.length} ${optionWord} for your placement request.`,
      link: '/discharge-planner/concierge',
      data: { kind: 'concierge_shortlist_ready', searchId: params.id, count: curated.length },
    });
    if (!familyRequest && existing.user?.email) {
      void sendConciergeShortlistReadyEmail({ toEmail: existing.user.email, count: curated.length });
    }

    // W4-2: one FacilityResponse per shortlisted home + the tokenized accept /
    // decline link to the facility's admissions contact (PHI-minimal email).
    // Never blocks the DP send: a failure here is captured, the shortlist still goes.
    let facilityResponses: Awaited<ReturnType<typeof createFacilityResponsesForShortlist>> = [];
    try {
      facilityResponses = await createFacilityResponsesForShortlist({ searchId: params.id, homeIds: curated.map((h) => h.homeId) });
    } catch (e) {
      captureError(e instanceof Error ? e : new Error(String(e)), { tags: { feature: 'facility-response' }, extra: { searchId: params.id } });
    }

    return NextResponse.json({ ok: true, status: 'SHORTLIST_READY', curatedCount: curated.length, facilityResponses });
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
