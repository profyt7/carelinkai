/**
 * OL-163c — QA queue for AI availability-call observations.
 *
 * An observation is PENDING until an admin (Elizabeth) reviews it against the
 * transcript / recording. Only Approve / Correct write to the home:
 *   - availabilityCount = bedsAL + bedsMC, availabilityVerifiedAt = calledAt,
 *     availabilitySource = AI_CALL (answered calls only — a declined /
 *     no-answer call verifies nothing);
 *   - waiver answer → medicaidWaiverStatus, pending answer →
 *     medicaidPendingAccepted, source AI_CALL, verifiedAt = calledAt — never
 *     over a protected source (VA_CALL / OPERATOR / ADMIN);
 *   - the call's price stays on the observation (no PriceSource for calls yet).
 * Reject writes nothing to the home. Mark do-not-call sets the home flag
 * (honored by the agent list, the ping and the VA export — OL-163e).
 * Every action is one transaction with its history rows.
 */

import type { AvailabilityObservation, CallWaiverStatus, MedicaidPendingAnswer, MedicaidWaiverStatus, ObservationQaStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { recordEvent, type EventActor } from '@/lib/events/record-event';
import { isProtectedSource } from '@/lib/medicaid/waiver';
import { normalizeCount } from '@/lib/availability/availability';
import { isPricingFresh, normalizePriceInt } from '@/lib/pricing/pricing';

export const QA_ACTIONS = ['approve', 'correct', 'reject', 'do_not_call'] as const;
export type QaAction = (typeof QA_ACTIONS)[number];

/** Fields an admin may override on "Correct". */
export type QaCorrections = {
  outcome?: AvailabilityObservation['outcome'];
  bedsAL?: number | null;
  bedsMC?: number | null;
  priceFromMonthly?: number | null;
  priceUndisclosed?: boolean | null;
  waiverStatus?: CallWaiverStatus | null;
  medicaidPending?: MedicaidPendingAnswer | null;
  contactRole?: string | null;
  doNotCall?: boolean;
};

export const CALL_WAIVER_TO_HOME: Record<CallWaiverStatus, MedicaidWaiverStatus | null> = {
  ACCEPTING_NEW: 'ACCEPTING_NEW',
  CURRENT_ONLY: 'CURRENT_RESIDENTS_ONLY',
  NO: 'NOT_ACCEPTING_REFERRALS',
  UNKNOWN: null,
};
export const PENDING_TO_HOME: Record<MedicaidPendingAnswer, boolean | null> = {
  YES: true,
  NO: false,
  CASE_BY_CASE: null,
  UNKNOWN: null,
};

export const AI_CALL_SOURCE = 'AI_CALL';

/** Verified beds = AL + MC when at least one was given; null when the call gave no number. */
export function verifiedCount(o: { bedsAL: number | null; bedsMC: number | null }): number | null {
  if (o.bedsAL == null && o.bedsMC == null) return null;
  return normalizeCount((o.bedsAL ?? 0) + (o.bedsMC ?? 0));
}

const LIST_SELECT = {
  id: true,
  homeId: true,
  conversationId: true,
  agentId: true,
  calledAt: true,
  durationSecs: true,
  outcome: true,
  bedsAL: true,
  bedsMC: true,
  priceFromMonthly: true,
  priceUndisclosed: true,
  waiverStatus: true,
  medicaidPending: true,
  doNotCall: true,
  contactRole: true,
  notes: true,
  transcriptUrl: true,
  recordingUrl: true,
  transcript: true,
  confidence: true,
  qaStatus: true,
  qaByUserId: true,
  qaAt: true,
  qaNote: true,
  corrections: true,
  appliedAt: true,
  home: {
    select: {
      name: true,
      phone: true,
      doNotCall: true,
      availabilityCount: true,
      availabilityVerifiedAt: true,
      availabilitySource: true,
      medicaidWaiverStatus: true,
      medicaidWaiverSource: true,
      medicaidPendingAccepted: true,
      startingPriceMonthly: true,
      priceSource: true,
      priceUpdatedAt: true,
      address: { select: { city: true } },
    },
  },
} satisfies Prisma.AvailabilityObservationSelect;

export type QaRow = Prisma.AvailabilityObservationGetPayload<{ select: typeof LIST_SELECT }>;

export async function listObservations(opts: { status?: ObservationQaStatus | 'all'; limit?: number } = {}): Promise<QaRow[]> {
  const status = opts.status ?? 'PENDING';
  return prisma.availabilityObservation.findMany({
    where: status === 'all' ? {} : { qaStatus: status },
    orderBy: [{ calledAt: 'asc' }],
    take: Math.min(Math.max(opts.limit ?? 100, 1), 500),
    select: LIST_SELECT,
  });
}

export type QaResult =
  | { ok: true; observation: QaRow; applied: { availability: boolean; waiver: boolean; pending: boolean; price: boolean; doNotCall: boolean }; skipped: string[] }
  | { ok: false; error: 'not_found' | 'already_reviewed' };

/**
 * Review one observation. Approve / Correct apply the (possibly corrected)
 * values to the home; Reject records the decision only; do_not_call flags the
 * home and closes the observation as rejected.
 */
export async function applyQaAction(args: {
  id: string;
  action: QaAction;
  corrections?: QaCorrections;
  note?: string | null;
  actor: EventActor & { userId: string };
  now?: Date;
}): Promise<QaResult> {
  const now = args.now ?? new Date();
  const existing = await prisma.availabilityObservation.findUnique({ where: { id: args.id }, select: LIST_SELECT });
  if (!existing) return { ok: false, error: 'not_found' };
  if (existing.qaStatus !== 'PENDING') return { ok: false, error: 'already_reviewed' };

  const corrections = args.action === 'correct' ? args.corrections ?? {} : {};
  const effective = {
    outcome: corrections.outcome ?? existing.outcome,
    bedsAL: corrections.bedsAL !== undefined ? corrections.bedsAL : existing.bedsAL,
    bedsMC: corrections.bedsMC !== undefined ? corrections.bedsMC : existing.bedsMC,
    priceFromMonthly: corrections.priceFromMonthly !== undefined ? corrections.priceFromMonthly : existing.priceFromMonthly,
    priceUndisclosed: corrections.priceUndisclosed !== undefined ? corrections.priceUndisclosed : existing.priceUndisclosed,
    waiverStatus: corrections.waiverStatus !== undefined ? corrections.waiverStatus : existing.waiverStatus,
    medicaidPending: corrections.medicaidPending !== undefined ? corrections.medicaidPending : existing.medicaidPending,
    contactRole: corrections.contactRole !== undefined ? corrections.contactRole : existing.contactRole,
    doNotCall: corrections.doNotCall !== undefined ? corrections.doNotCall : existing.doNotCall,
  };
  const markDoNotCall = args.action === 'do_not_call' || (args.action !== 'reject' && effective.doNotCall);
  const qaStatus: ObservationQaStatus = args.action === 'approve' ? 'APPROVED' : args.action === 'correct' ? 'CORRECTED' : 'REJECTED';
  const applyToHome = (args.action === 'approve' || args.action === 'correct') && !markDoNotCall;
  const applied = { availability: false, waiver: false, pending: false, price: false, doNotCall: false };
  const skipped: string[] = [];
  const actor = { userId: args.actor.userId, role: args.actor.role ?? 'ADMIN' };

  const observation = await prisma.$transaction(async (tx) => {
    const homeData: Prisma.AssistedLivingHomeUpdateInput = {};
    const home = existing.home;

    if (applyToHome && effective.outcome === 'ANSWERED') {
      const count = verifiedCount(effective);
      homeData.availabilityCount = count;
      homeData.availabilityVerifiedAt = existing.calledAt;
      homeData.availabilitySource = 'AI_CALL';
      applied.availability = true;
      await recordEvent(tx, {
        entityType: 'AVAILABILITY',
        entityId: existing.homeId,
        eventType: 'availability.updated',
        field: 'availabilityCount',
        oldValue: { count: home.availabilityCount, source: home.availabilitySource, verifiedAt: home.availabilityVerifiedAt },
        newValue: { count, source: 'AI_CALL', verifiedAt: existing.calledAt, observationId: existing.id },
        source: 'AI_CALL',
        actor,
        occurredAt: now,
      });

      const waiverTo = effective.waiverStatus ? CALL_WAIVER_TO_HOME[effective.waiverStatus] : null;
      if (waiverTo && waiverTo !== home.medicaidWaiverStatus) {
        if (isProtectedSource(home.medicaidWaiverSource)) skipped.push('waiver_protected_source');
        else {
          homeData.medicaidWaiverStatus = waiverTo;
          homeData.medicaidWaiverSource = AI_CALL_SOURCE;
          homeData.medicaidWaiverVerifiedAt = existing.calledAt;
          applied.waiver = true;
          await recordEvent(tx, {
            entityType: 'HOME',
            entityId: existing.homeId,
            eventType: 'acceptance.updated',
            field: 'medicaidWaiverStatus',
            oldValue: { medicaidWaiverStatus: home.medicaidWaiverStatus, source: home.medicaidWaiverSource },
            newValue: { medicaidWaiverStatus: waiverTo, source: AI_CALL_SOURCE, verifiedAt: existing.calledAt, observationId: existing.id },
            source: 'AI_CALL',
            actor,
            occurredAt: now,
          });
        }
      }
      const pendingTo = effective.medicaidPending ? PENDING_TO_HOME[effective.medicaidPending] : null;
      if (pendingTo !== null && pendingTo !== home.medicaidPendingAccepted) {
        homeData.medicaidPendingAccepted = pendingTo;
        homeData.medicaidPendingAcceptedSource = AI_CALL_SOURCE;
        homeData.medicaidPendingAcceptedVerifiedAt = existing.calledAt;
        applied.pending = true;
        await recordEvent(tx, {
          entityType: 'HOME',
          entityId: existing.homeId,
          eventType: 'acceptance.updated',
          field: 'medicaidPendingAccepted',
          oldValue: { medicaidPendingAccepted: home.medicaidPendingAccepted },
          newValue: { medicaidPendingAccepted: pendingTo, source: AI_CALL_SOURCE, verifiedAt: existing.calledAt, observationId: existing.id },
          source: 'AI_CALL',
          actor,
          occurredAt: now,
        });
      }

      // OL-166c: a disclosed "from $X/mo" becomes the home's starting price,
      // source AI_CALL, dated at the call (priceUpdatedAt = calledAt). Only a
      // QA-approved / corrected ANSWERED call gets here — pending and rejected
      // observations never write. A fresh operator-provided price is never
      // overwritten by a phone answer.
      const price = effective.priceUndisclosed ? null : normalizePriceInt(effective.priceFromMonthly);
      if (price) {
        if (home.priceSource === 'OPERATOR' && isPricingFresh(home.priceUpdatedAt, now.getTime())) {
          skipped.push('price_operator_fresh');
        } else {
          homeData.startingPriceMonthly = price;
          homeData.priceSource = 'AI_CALL';
          homeData.priceUpdatedAt = existing.calledAt;
          applied.price = true;
          await recordEvent(tx, {
            entityType: 'HOME',
            entityId: existing.homeId,
            eventType: 'pricing.updated',
            field: 'startingPriceMonthly',
            oldValue: { startingPriceMonthly: home.startingPriceMonthly, source: home.priceSource, updatedAt: home.priceUpdatedAt },
            newValue: { startingPriceMonthly: price, source: 'AI_CALL', updatedAt: existing.calledAt, observationId: existing.id },
            source: 'AI_CALL',
            actor,
            occurredAt: now,
          });
        }
      }
    } else if (applyToHome) {
      skipped.push(`outcome_${effective.outcome.toLowerCase()}_not_verifiable`);
    }

    if (markDoNotCall && !home.doNotCall) {
      homeData.doNotCall = true;
      homeData.doNotCallAt = now;
      homeData.doNotCallSource = 'ADMIN';
      applied.doNotCall = true;
      await recordEvent(tx, {
        entityType: 'HOME',
        entityId: existing.homeId,
        eventType: 'home.do_not_call',
        field: 'doNotCall',
        oldValue: { doNotCall: false },
        newValue: { doNotCall: true, source: 'ADMIN', observationId: existing.id },
        source: 'ADMIN',
        actor,
        occurredAt: now,
      });
    }

    if (Object.keys(homeData).length > 0) {
      await tx.assistedLivingHome.update({ where: { id: existing.homeId }, data: homeData });
    }

    const row = await tx.availabilityObservation.update({
      where: { id: existing.id },
      data: {
        ...(args.action === 'correct' ? { ...effective, corrections: corrections as Prisma.InputJsonValue } : {}),
        ...(markDoNotCall ? { doNotCall: true } : {}),
        qaStatus,
        qaByUserId: args.actor.userId,
        qaAt: now,
        qaNote: args.note?.trim() ? args.note.trim().slice(0, 500) : null,
        appliedAt: applied.availability || applied.waiver || applied.pending || applied.price ? now : null,
      },
      select: LIST_SELECT,
    });
    await recordEvent(tx, {
      entityType: 'AVAILABILITY',
      entityId: existing.homeId,
      eventType: 'call.qa',
      field: 'qaStatus',
      oldValue: { qaStatus: 'pending', observationId: existing.id },
      newValue: { qaStatus: qaStatus.toLowerCase(), observationId: existing.id, outcome: effective.outcome.toLowerCase(), doNotCall: markDoNotCall, appliedAt: row.appliedAt },
      source: 'ADMIN',
      actor,
      occurredAt: now,
    });
    return row;
  });

  return { ok: true, observation, applied, skipped };
}
