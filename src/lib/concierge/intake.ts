/**
 * /concierge → the EXISTING DP concierge queue (sprint W4 0a).
 *
 * A private-pay family's "Request concierge help" creates a PlacementSearch
 * exactly like a discharge planner's in-app submit (6/28 flow): isConcierge,
 * conciergeStatus SUBMITTED, patientInfo kept in-app, payerSource tagged — so
 * Chris curates it in /admin/concierge with no second queue. Rows are tagged
 * source='concierge_page' and owned by a system user (the family has no
 * account at this point; their contact details live in patientInfo).
 *
 * Lane rule (AKS firewall, src/lib/payer/payer-source.ts): only FEE_ELIGIBLE
 * answers (private funds, LTC insurance) may create a page request — the
 * screener never shows the CTA to anyone else, and this module refuses the
 * rest defensively. Nothing here touches the placement fee path.
 */

import { prisma } from '@/lib/prisma';
import { captureError } from '@/lib/sentry';
import { sendConciergeRequestNotification } from '@/lib/email';
import { deriveFeeLane, PAYER_SOURCE_LABELS, type PayerSource } from '@/lib/payer/payer-source';

export const CONCIERGE_PAGE_SOURCE = 'concierge_page';
export const CONCIERGE_PAGE_USER_EMAIL = 'concierge-page@carelinkai.system';

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

/**
 * Create the queue row. Throws FreeLaneRefused for any non-FEE_ELIGIBLE lane.
 */
export async function createConciergePageRequest(i: ConciergePageIntake): Promise<{ id: string }> {
  if (deriveFeeLane(i.payerSource) !== 'FEE_ELIGIBLE') throw new FreeLaneRefused();
  const owner = await ensureConciergePageUser();
  const row = await prisma.placementSearch.create({
    data: {
      userId: owner.id,
      queryText: conciergeQueryText(i),
      parsedCriteria: { source: CONCIERGE_PAGE_SOURCE, payerSource: i.payerSource, location: i.location?.trim() || null },
      searchResults: { matches: [] },
      status: 'SEARCHING',
      isConcierge: true,
      conciergeStatus: 'SUBMITTED',
      conciergeSubmittedAt: new Date(),
      payerSource: i.payerSource,
      source: CONCIERGE_PAGE_SOURCE,
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

  // Same PHI-free admin alert the DP submit fires (request id + link only).
  void sendConciergeRequestNotification({ requestId: row.id, dpName: 'A family (concierge page)' }).catch((e) =>
    captureError(e instanceof Error ? e : new Error(String(e)), { tags: { feature: 'concierge-page' } })
  );
  return row;
}
