/**
 * /concierge → the EXISTING DP concierge queue (sprint W4 0a, W5-3).
 *
 * A family's concierge request creates a PlacementSearch exactly like a
 * discharge planner's in-app submit (6/28 flow): isConcierge, conciergeStatus,
 * patientInfo kept in-app, payerSource tagged — so Chris curates it in
 * /admin/concierge with no second queue. Rows are tagged source='concierge_page'
 * and owned by a system user (the family may have no account; their contact
 * details live in patientInfo).
 *
 * Lane rule (AKS firewall, src/lib/payer/payer-source.ts): the paid concierge is
 * paid by the FAMILY, so private funds, LTC insurance and "not sure" may create a
 * request; Medicaid / Medicare / VA (FREE_LANE) are refused — the screener never
 * shows them the CTA and this module refuses defensively. Nothing here touches
 * the placement-fee path.
 *
 * Queue status (W5-3): SUBMITTED (request / paid), WAITLIST (cap reached),
 * PENDING_PAYMENT (Stripe Checkout started; promoted to SUBMITTED by the webhook).
 */

import { prisma } from '@/lib/prisma';
import { isTestContact } from '@/lib/concierge/test-orders';
import { recordEvent } from '@/lib/events/record-event';
import { deriveIntakeFacts } from '@/lib/concierge/intake-facts';
import { captureError } from '@/lib/sentry';
import { sendConciergeRequestNotification } from '@/lib/email';
import { deriveFeeLane, PAYER_SOURCE_LABELS, type PayerSource } from '@/lib/payer/payer-source';

export const CONCIERGE_PAGE_SOURCE = 'concierge_page';
export const CONCIERGE_PAGE_USER_EMAIL = 'concierge-page@carelinkai.system';

export type ConciergeQueueStatus = 'SUBMITTED' | 'WAITLIST' | 'PENDING_PAYMENT';

export type ConciergePageIntake = {
  payerSource: PayerSource;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  location?: string;
  careNeeds: string;
  timeline?: string;
  notes?: string;
};

/** The system user that owns page-originated requests (created on first use). */
export async function ensureConciergePageUser(): Promise<{ id: string }> {
  const existing = await prisma.user.findUnique({ where: { email: CONCIERGE_PAGE_USER_EMAIL }, select: { id: true } });
  if (existing) return existing;
  return prisma.user.create({
    data: {
      email: CONCIERGE_PAGE_USER_EMAIL,
      firstName: 'Concierge',
      lastName: 'Page',
      role: 'FAMILY',
      status: 'ACTIVE',
      emailVerified: new Date(),
    },
    select: { id: true },
  });
}

export function conciergeQueryText(i: ConciergePageIntake): string {
  const parts = [
    `Family concierge request (private pay) — ${i.careNeeds.trim()}`,
    i.location?.trim() ? `near ${i.location.trim()}` : null,
    i.timeline?.trim() ? `timeline: ${i.timeline.trim()}` : null,
  ].filter(Boolean);
  return parts.join(' · ').slice(0, 500);
}

export class FreeLaneRefused extends Error {
  constructor() {
    super('Concierge requests are private-pay only; this payer source routes to free help.');
    this.name = 'FreeLaneRefused';
  }
}

/** True for the lanes that may request / buy the concierge (everything but FREE_LANE). */
export function mayRequestConcierge(payerSource: PayerSource | null | undefined): boolean {
  return deriveFeeLane(payerSource) !== 'FREE_LANE';
}

/**
 * Create the queue row. Throws FreeLaneRefused for a FREE_LANE payer source.
 * `queueStatus` defaults to SUBMITTED; PENDING_PAYMENT rows do not alert the
 * admin (the paid webhook does), WAITLIST rows do.
 */
export async function createConciergePageRequest(
  i: ConciergePageIntake,
  opts: { queueStatus?: ConciergeQueueStatus } = {},
): Promise<{ id: string }> {
  if (!mayRequestConcierge(i.payerSource)) throw new FreeLaneRefused();
  const queueStatus: ConciergeQueueStatus = opts.queueStatus ?? 'SUBMITTED';
  const owner = await ensureConciergePageUser();
  const facts = deriveIntakeFacts({ payerSource: i.payerSource, location: i.location, queryText: conciergeQueryText(i), patientInfo: { medicalNeeds: i.careNeeds } });
  const row = await prisma.$transaction(async (tx) => {
  const created = await tx.placementSearch.create({
    data: {
      userId: owner.id,
      queryText: conciergeQueryText(i),
      parsedCriteria: { source: CONCIERGE_PAGE_SOURCE, payerSource: i.payerSource, location: i.location?.trim() || null },
      searchResults: { matches: [] },
      status: 'SEARCHING',
      isConcierge: true,
      conciergeStatus: queueStatus,
      conciergeSubmittedAt: new Date(),
      payerSource: i.payerSource,
      payerLane: facts.payerLane,
      intakeZip: facts.intakeZip,
      careLevel: facts.careLevel,
      source: CONCIERGE_PAGE_SOURCE,
      isTest: isTestContact({ email: i.contactEmail, name: i.contactName }),
      patientInfo: {
        contactName: i.contactName.trim(),
        contactEmail: i.contactEmail.trim().toLowerCase(),
        contactPhone: i.contactPhone?.trim() || undefined,
        location: i.location?.trim() || undefined,
        medicalNeeds: i.careNeeds.trim(),
        timeline: i.timeline?.trim() || undefined,
        paymentType: PAYER_SOURCE_LABELS[i.payerSource],
        additionalNotes: i.notes?.trim() || undefined,
        source: CONCIERGE_PAGE_SOURCE,
      },
    },
    select: { id: true },
  });
  // History (sprint W5-1): the family's request entered the queue.
  await recordEvent(tx, {
    entityType: 'PLACEMENT_SEARCH',
    entityId: created.id,
    eventType: 'status.changed',
    field: 'conciergeStatus',
    oldValue: null,
    newValue: { status: queueStatus, payerLane: facts.payerLane, zip: facts.intakeZip, careLevel: facts.careLevel, source: CONCIERGE_PAGE_SOURCE },
    source: 'FAMILY',
  });
  return created;
  });

  // Same PHI-free admin alert the DP submit fires (request id + link only). A
  // checkout-in-progress row waits for the paid webhook's own alert.
  if (queueStatus !== 'PENDING_PAYMENT') {
    const who = queueStatus === 'WAITLIST' ? 'A family (concierge page — WAITLIST, capacity reached)' : 'A family (concierge page)';
    void sendConciergeRequestNotification({ requestId: row.id, dpName: who }).catch((e) =>
      captureError(e instanceof Error ? e : new Error(String(e)), { tags: { feature: 'concierge-page' } })
    );
  }
  return row;
}
