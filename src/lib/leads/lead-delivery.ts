/**
 * Demand-first North Star (feat/demand-first-admin-metric, 2026-07-13).
 *
 * A "qualified lead delivered to an operator" is the gate metric the 7/9
 * demand-first pivot put at the center of the business: NOT facility claims,
 * NOT raw inquiry volume — a real, qualified family/DP lead actually routed to a
 * specific facility. Crucially it is decoupled from claims: a lead delivered by
 * hand to an UNCLAIMED facility's public phone/email (the Wizard-of-Oz concierge
 * motion) counts exactly the same as an automated delivery to a claimed operator.
 *
 * This module is the ONE place the definition lives:
 *   - assessQualification() applies the 5-part "Qualified Delivered Lead" bar.
 *   - qualificationFrom*() map each source's data onto that bar (tune here).
 *   - recordLeadDelivery() writes the append-only evidence row (never throws,
 *     never blocks the lead — mirrors recordLeadConsent).
 *   - countQualifiedLeadsDelivered() powers the admin headline (this week / last
 *     week / MTD), deduped so one lead counts once no matter how many facilities
 *     it reached.
 *
 * The qualification mapping is intentionally conservative and centralized so it
 * can be adjusted after review with zero backfill (the booleans are snapshotted,
 * but the aggregate only reads `qualified`).
 */

import { prisma } from '@/lib/prisma';
import { captureError } from '@/lib/sentry';

export type LeadDeliverySource = 'INQUIRY' | 'TOUR_REQUEST' | 'CONCIERGE';
export type LeadDeliveryChannel = 'AUTOMATED' | 'MANUAL_CONCIERGE';

/** The 5-part bar as inputs. #5 (routed to ≥1 facility) is implicit — a
 * LeadDelivery row IS the routing event, so it's never a separate input. */
export interface QualificationInput {
  hasContact?: boolean;        // (1) reachable family/DP: name + phone/email
  hasCareNeed?: boolean;       // (2) genuine care need + timeline
  hasQualifyingFacts?: boolean;// (3) care level / area / payer source captured
  hasConsent?: boolean;        // (4) consumer consented to be connected (OL-115)
}

export interface Qualification extends Required<QualificationInput> {
  qualified: boolean;
}

/** Apply the bar. A lead is qualified only when all four inputs hold (the fifth,
 * "routed", is guaranteed by the fact that we're recording a delivery). */
export function assessQualification(input: QualificationInput): Qualification {
  const hasContact = input.hasContact === true;
  const hasCareNeed = input.hasCareNeed === true;
  const hasQualifyingFacts = input.hasQualifyingFacts === true;
  const hasConsent = input.hasConsent === true;
  return {
    hasContact,
    hasCareNeed,
    hasQualifyingFacts,
    hasConsent,
    qualified: hasContact && hasCareNeed && hasQualifyingFacts && hasConsent,
  };
}

/**
 * Stable identity so one lead counts ONCE across every facility it reached.
 *  - CONCIERGE: one DP patient search = one lead (ps:<placementSearchId>).
 *  - otherwise: the family account, else a normalized email, else phone.
 * Anonymous no-contact leads fall back to a per-source bucket, but those fail
 * hasContact and so never reach the qualified headline anyway.
 */
export function leadKeyFor(params: {
  source: LeadDeliverySource;
  familyId?: string | null;
  placementSearchId?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
}): string {
  if (params.source === 'CONCIERGE' && params.placementSearchId) {
    return `ps:${params.placementSearchId}`;
  }
  if (params.familyId) return `fam:${params.familyId}`;
  const email = params.contactEmail?.trim().toLowerCase();
  if (email) return `email:${email}`;
  const phone = (params.contactPhone ?? '').replace(/\D/g, '');
  if (phone) return `phone:${phone}`;
  return `anon:${params.source}:${params.contactEmail ?? params.contactPhone ?? 'unknown'}`;
}

// ── Source → bar mappings (the tunable knobs) ──────────────────────────────

export interface InquiryLike {
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  careNeeds?: string[] | null;
  urgency?: string | null;
  message?: string | null;
  additionalInfo?: string | null;
  payerSource?: string | null;
}

/**
 * Consumer inquiry / tour request. Location is implicit (they inquired about a
 * specific home). #3 keys on the OL-114 payer tag — the one structured
 * qualifying fact we capture across sources; adjust here if the bar changes.
 * Consent (#4) is a real consumer-consent lookup — see hasConsumerConsent().
 */
export function qualificationFromInquiry(i: InquiryLike, hasConsent: boolean): QualificationInput {
  return {
    hasContact: !!(i.contactName && (i.contactEmail || i.contactPhone)),
    hasCareNeed: !!(
      (i.careNeeds && i.careNeeds.length > 0) || i.urgency || i.message || i.additionalInfo
    ),
    hasQualifyingFacts: !!i.payerSource,
    hasConsent,
  };
}

export interface ConciergeLike {
  payerSource?: string | null;
  dpEmail?: string | null;
  dpName?: string | null;
  timeline?: string | null;
  careNeeds?: string | null;
}

/**
 * DP concierge (Wizard-of-Oz) lead. The discharge planner is the reachable
 * contact. Consent regime differs from consumer leads: a DP submitting a patient
 * into the concierge flow is the professional-authorization path (OL-115
 * excludes DP intake from consumer consent capture), so hasConsent=true here.
 * ⚠️ Judgment call — flagged for Chris on review; flip in one place if wrong.
 */
export function qualificationFromConcierge(c: ConciergeLike): QualificationInput {
  return {
    hasContact: !!(c.dpEmail || c.dpName),
    hasCareNeed: !!(c.timeline || c.careNeeds),
    hasQualifyingFacts: !!c.payerSource,
    hasConsent: true,
  };
}

/** True if a consumer gave (and we logged, OL-115) consent to be connected. */
export async function hasConsumerConsent(
  inquiryId: string | null | undefined,
  contactEmail: string | null | undefined,
): Promise<boolean> {
  try {
    if (inquiryId) {
      const byInquiry = await prisma.leadConsent.findFirst({
        where: { inquiryId, consentGiven: true },
        select: { id: true },
      });
      if (byInquiry) return true;
    }
    const email = contactEmail?.trim();
    if (email) {
      const byEmail = await prisma.leadConsent.findFirst({
        where: { consentGiven: true, contactEmail: { equals: email, mode: 'insensitive' } },
        select: { id: true },
      });
      if (byEmail) return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ── Write ──────────────────────────────────────────────────────────────────

export interface RecordLeadDeliveryArgs {
  facilityId: string;
  operatorId?: string | null; // null for unclaimed public-contact deliveries
  source: LeadDeliverySource;
  sourceId: string;
  channel: LeadDeliveryChannel;
  claimed: boolean;
  qualification: QualificationInput;
  leadKey: string;
}

/**
 * Record one lead→facility delivery. Idempotent on (source, sourceId, facility)
 * — a re-send never double-counts. Never throws and never blocks the caller:
 * on any error it captures to Sentry and returns null (the lead still goes
 * through — this is a metric, not a gate).
 */
export async function recordLeadDelivery(args: RecordLeadDeliveryArgs): Promise<string | null> {
  try {
    const q = assessQualification(args.qualification);
    const row = await prisma.leadDelivery.upsert({
      where: {
        source_sourceId_facilityId: {
          source: args.source as any,
          sourceId: args.sourceId,
          facilityId: args.facilityId,
        },
      },
      create: {
        facilityId: args.facilityId,
        operatorId: args.operatorId ?? null,
        source: args.source as any,
        sourceId: args.sourceId,
        channel: args.channel as any,
        claimed: args.claimed,
        qualified: q.qualified,
        hasContact: q.hasContact,
        hasCareNeed: q.hasCareNeed,
        hasQualifyingFacts: q.hasQualifyingFacts,
        hasConsent: q.hasConsent,
        leadKey: args.leadKey,
      },
      // Append-only: the first delivery is the record of record. Nothing to
      // update on a repeat (the unique key already made it a no-op insert).
      update: {},
      select: { id: true },
    });
    return row.id;
  } catch (error) {
    captureError(error instanceof Error ? error : new Error(String(error)), {
      tags: { feature: 'lead-delivery' },
      extra: { source: args.source, channel: args.channel },
    });
    return null;
  }
}

// ── Read (the headline) ──────────────────────────────────────────────────────

export interface DeliveryWindows {
  weekStart: Date;
  prevWeekStart: Date;
  monthStart: Date;
}

/** Rolling 7-day windows + month-to-date. Pure, so it's unit-testable. */
export function leadDeliveryWindows(now: Date): DeliveryWindows {
  const DAY = 24 * 60 * 60 * 1000;
  return {
    weekStart: new Date(now.getTime() - 7 * DAY),
    prevWeekStart: new Date(now.getTime() - 14 * DAY),
    monthStart: new Date(now.getFullYear(), now.getMonth(), 1),
  };
}

export interface LeadsDeliveredCounts {
  thisWeek: number;
  lastWeek: number;
  mtd: number;
}

/**
 * Distinct QUALIFIED leads delivered — the demand-first headline. Deduped by
 * leadKey (one lead counts once per window, however many facilities it reached).
 * Respects the same demo filter as the rest of /admin (facility.isDemo).
 */
export async function countQualifiedLeadsDelivered(opts: {
  showDemo: boolean;
  now?: Date;
}): Promise<LeadsDeliveredCounts> {
  const now = opts.now ?? new Date();
  const { weekStart, prevWeekStart, monthStart } = leadDeliveryWindows(now);
  const demoFilter = opts.showDemo ? {} : { facility: { isDemo: false } };

  const distinctLeads = async (gte: Date, lt?: Date): Promise<number> => {
    const rows = await prisma.leadDelivery.findMany({
      where: { qualified: true, ...demoFilter, deliveredAt: lt ? { gte, lt } : { gte } },
      select: { leadKey: true },
      distinct: ['leadKey'],
    });
    return rows.length;
  };

  const [thisWeek, lastWeek, mtd] = await Promise.all([
    distinctLeads(weekStart),
    distinctLeads(prevWeekStart, weekStart),
    distinctLeads(monthStart),
  ]);
  return { thisWeek, lastWeek, mtd };
}
