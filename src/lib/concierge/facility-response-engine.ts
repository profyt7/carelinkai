/**
 * Facility accept / decline — DB engine (sprint W4-2). Rules live in
 * ./facility-response.ts (pure); everything here touches Prisma.
 *
 *  - `createFacilityResponsesForShortlist`: on "Send shortlist to DP", one
 *    FacilityResponse per curated home (status PENDING → SENT once the
 *    tokenized link is emailed to the facility's admissions contact).
 *    PHI-minimal: the email and the row's `summary` carry care level, payer
 *    lane and timeline only.
 *  - `openFacilityResponse`: stamps openedAt (first open only).
 *  - `applyFacilityResponse`: Accept / Decline(reason) — single-use per home
 *    per request; stamps every status change; decline reasons roll up to the
 *    home's observedAcceptanceCriteria (separate column, never overwrites
 *    what the operator entered).
 *  - `markAdmitted`: admin confirms the move-in after an Accept.
 */

import crypto from 'crypto';
import type { FacilityDeclineReason, FacilityResponseStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { recordEvent, type EventActor } from '@/lib/events/record-event';
import { captureError } from '@/lib/sentry';
import { sendFacilityResponseRequestEmail } from '@/lib/email';
import { signUnsubscribeToken } from '@/lib/unsubscribe-token';
import { createInAppNotification } from '@/lib/services/notifications';
import { SUPPRESSED_TEST } from '@/lib/concierge/test-orders';
import {
  buildFacilitySummary,
  rollupObservedAccept,
  rollupObservedCriteria,
  signFacilityResponseToken,
  verifyFacilityResponseToken,
  type FacilitySummary,
} from '@/lib/concierge/facility-response';

const DIRECTORY_UNCLAIMED_EMAIL = 'directory-unclaimed@carelinkai.system';

export function appUrl(): string {
  return (process.env['NEXT_PUBLIC_APP_URL'] || process.env['NEXTAUTH_URL'] || 'https://getcarelinkai.com').replace(/\/$/, '');
}
function postalAddress(): string | null {
  const v = (process.env['COMPANY_POSTAL_ADDRESS'] || '').trim();
  return v && !/«|set .*before/i.test(v) ? v : null;
}
function secret(): string {
  return process.env['NEXTAUTH_SECRET'] || '';
}

/** The facility's admissions/availability contact: public contact email → claimed operator's login → outreach research email. */
export function pickFacilityContact(home: {
  contactEmail?: string | null;
  outreachEmail?: string | null;
  operator?: { user?: { email?: string | null } | null } | null;
}): string | null {
  const opEmail = home.operator?.user?.email ?? null;
  const claimed = !!opEmail && opEmail.toLowerCase() !== DIRECTORY_UNCLAIMED_EMAIL;
  const candidates = [home.contactEmail, claimed ? opEmail : null, home.outreachEmail];
  for (const c of candidates) {
    const v = (c || '').trim().toLowerCase();
    if (v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return v;
  }
  return null;
}

export type CreatedFacilityResponse = { responseId: string; homeId: string; status: FacilityResponseStatus; delivery: string };

/**
 * Called from the admin "respond" action. Idempotent per (search, home): an
 * existing row that already has a response is left alone; a PENDING/SENT row
 * gets a fresh link.
 */
/**
 * Email the accept / decline request to shortlisted homes.
 * fix/concierge-outbound-safety:
 *  - a TEST request never contacts a facility: each home is skipped and logged as "suppressed (test)";
 *  - a home that already has a response row (it was notified before) is NEVER emailed again;
 *  - callers pass only homes the admin confirmed ("This will email N homes … Send").
 */
export async function createFacilityResponsesForShortlist(args: {
  searchId: string;
  homeIds: string[];
  now?: Date;
}): Promise<CreatedFacilityResponse[]> {
  const now = args.now ?? new Date();
  const search = await prisma.placementSearch.findUnique({
    where: { id: args.searchId },
    select: {
      id: true, queryText: true, parsedCriteria: true, patientInfo: true, payerSource: true, isTest: true,
      user: { select: { dischargePlannerProfile: { select: { organization: true } } } },
    },
  });
  if (!search) return [];
  const summary: FacilitySummary = buildFacilitySummary({
    parsedCriteria: search.parsedCriteria, patientInfo: search.patientInfo, payerSource: search.payerSource, queryText: search.queryText,
  });
  const homes = await prisma.assistedLivingHome.findMany({
    where: { id: { in: args.homeIds } },
    select: { id: true, name: true, contactEmail: true, outreachEmail: true, operator: { select: { user: { select: { email: true } } } } },
  });
  const sec = secret();
  const postal = postalAddress();
  const url = appUrl();
  const out: CreatedFacilityResponse[] = [];

  for (const home of homes) {
    if (search.isTest) {
      // Test request: never contact the facility. Logged, nothing stored or sent.
      console.warn(`[facility-response] ${SUPPRESSED_TEST}: search ${search.id} home ${home.id}`);
      await recordEvent(prisma, {
        entityType: 'PLACEMENT_SEARCH', entityId: search.id, eventType: 'facility.contact_suppressed', field: 'facilityResponse',
        oldValue: null, newValue: { homeId: home.id, reason: SUPPRESSED_TEST },
        source: 'SYSTEM',
      });
      out.push({ responseId: '', homeId: home.id, status: 'PENDING', delivery: SUPPRESSED_TEST });
      continue;
    }
    const existing = await prisma.facilityResponse.findUnique({ where: { searchId_homeId: { searchId: search.id, homeId: home.id } } });
    if (existing) {
      // Already notified once: never email this home again (updates only add new homes).
      out.push({ responseId: existing.id, homeId: home.id, status: existing.status, delivery: 'already_notified' });
      continue;
    }
    const contactEmail = pickFacilityContact(home);
    // Create (or refresh) the row first so the token can carry its id.
    const row = await prisma.facilityResponse.create({
          data: { searchId: search.id, homeId: home.id, status: 'PENDING', token: `pending-${crypto.randomUUID()}`, summary: summary as unknown as Prisma.InputJsonValue, contactEmail },
        });
    const token = sec ? signFacilityResponseToken({ responseId: row.id, searchId: search.id, homeId: home.id }, sec, now.getTime()) : row.token;

    let delivery = 'no_contact';
    let status: FacilityResponseStatus = 'PENDING';
    if (contactEmail && sec) {
      if (!postal) {
        delivery = 'failed';
        status = 'SENT'; // the link exists and can be hand-sent; CAN-SPAM refuses the automated send
      } else {
        delivery = await sendFacilityResponseRequestEmail({
          toEmail: contactEmail,
          facilityName: home.name,
          summary,
          token,
          appUrl: url,
          postalAddress: postal,
          unsubscribeUrl: `${url}/api/outreach/unsubscribe?token=${encodeURIComponent(signUnsubscribeToken(contactEmail, sec))}`,
          dpOrganization: search.user?.dischargePlannerProfile?.organization ?? null,
        });
        status = 'SENT';
      }
    }
    const updated = await prisma.$transaction(async (tx) => {
      await recordEvent(tx, {
        entityType: 'FACILITY_RESPONSE', entityId: row.id, eventType: 'status.changed', field: 'status',
        oldValue: { status: row.status, homeId: row.homeId, searchId: row.searchId },
        newValue: { status, delivery, homeId: row.homeId, searchId: row.searchId, careLevel: summary.careLevel, payerLane: summary.feeLane },
        source: 'ADMIN',
      });
      return tx.facilityResponse.update({
      where: { id: row.id },
      data: {
        token,
        contactEmail,
        summary: summary as unknown as Prisma.InputJsonValue,
        delivery,
        status,
        ...(status === 'SENT' ? { sentAt: now } : {}),
      },
      select: { id: true, status: true },
    });
    });
    out.push({ responseId: updated.id, homeId: home.id, status: updated.status, delivery });
  }
  return out;
}

export type FacilityResponseView = {
  id: string;
  searchId: string;
  homeId: string;
  facilityName: string;
  status: FacilityResponseStatus;
  summary: FacilitySummary;
  declineReason: FacilityDeclineReason | null;
  declineText: string | null;
  openedAt: Date | null;
};

/** Resolve a link token to its row (null = invalid, expired or unknown). */
export async function resolveFacilityResponse(token: string): Promise<FacilityResponseView | null> {
  const sec = secret();
  if (!sec) return null;
  const payload = verifyFacilityResponseToken(token, sec);
  if (!payload) return null;
  const row = await prisma.facilityResponse.findUnique({
    where: { id: payload.responseId },
    select: {
      id: true, searchId: true, homeId: true, status: true, summary: true, declineReason: true, declineText: true, openedAt: true, token: true,
      home: { select: { name: true } },
    },
  });
  if (!row || row.token !== token || row.homeId !== payload.homeId || row.searchId !== payload.searchId) return null;
  return {
    id: row.id, searchId: row.searchId, homeId: row.homeId, facilityName: row.home.name, status: row.status,
    summary: row.summary as unknown as FacilitySummary, declineReason: row.declineReason, declineText: row.declineText, openedAt: row.openedAt,
  };
}

/** First open stamps openedAt and moves SENT → OPENED. Later opens are no-ops. */
export async function openFacilityResponse(token: string, now: Date = new Date()): Promise<FacilityResponseView | null> {
  const view = await resolveFacilityResponse(token);
  if (!view) return null;
  if (!view.openedAt) {
    const nextStatus = view.status === 'SENT' || view.status === 'PENDING' ? 'OPENED' : view.status;
    await prisma.$transaction(async (tx) => {
      await tx.facilityResponse.update({
        where: { id: view.id },
        data: { openedAt: now, ...(nextStatus !== view.status ? { status: 'OPENED' } : {}) },
      });
      await recordEvent(tx, {
        entityType: 'FACILITY_RESPONSE', entityId: view.id, eventType: 'link.opened', field: 'status',
        oldValue: { status: view.status, homeId: view.homeId }, newValue: { status: nextStatus, homeId: view.homeId, openedAt: now },
        source: 'OPERATOR', occurredAt: now,
      });
    });
    return { ...view, openedAt: now, status: view.status === 'SENT' || view.status === 'PENDING' ? 'OPENED' : view.status };
  }
  return view;
}

export type ApplyFacilityResult =
  | { ok: true; status: 'ACCEPTED' | 'DECLINED'; facilityName: string }
  | { ok: false; error: 'invalid' | 'already_answered'; status?: FacilityResponseStatus; facilityName?: string };

/** Accept or decline. Single-use: anything past OPENED is refused. */
export async function applyFacilityResponse(args: {
  token: string;
  action: 'accept' | 'decline';
  reason?: FacilityDeclineReason;
  text?: string;
  now?: Date;
}): Promise<ApplyFacilityResult> {
  const now = args.now ?? new Date();
  const view = await resolveFacilityResponse(args.token);
  if (!view) return { ok: false, error: 'invalid' };
  if (!['PENDING', 'SENT', 'OPENED'].includes(view.status)) {
    return { ok: false, error: 'already_answered', status: view.status, facilityName: view.facilityName };
  }
  const home = await prisma.assistedLivingHome.findUnique({ where: { id: view.homeId }, select: { observedAcceptanceCriteria: true } });
  const base = { respondedAt: now, ...(view.openedAt ? {} : { openedAt: now }) };

  if (args.action === 'accept') {
    await prisma.$transaction(async (tx) => {
      await tx.facilityResponse.update({ where: { id: view.id }, data: { ...base, status: 'ACCEPTED', acceptedAt: now } });
      await tx.assistedLivingHome.update({
        where: { id: view.homeId },
        data: { observedAcceptanceCriteria: rollupObservedAccept(home?.observedAcceptanceCriteria, now) as unknown as Prisma.InputJsonValue },
      });
      await recordEvent(tx, {
        entityType: 'FACILITY_RESPONSE', entityId: view.id, eventType: 'status.changed', field: 'status',
        oldValue: { status: view.status, homeId: view.homeId }, newValue: { status: 'ACCEPTED', homeId: view.homeId, acceptedAt: now },
        source: 'OPERATOR', occurredAt: now,
      });
    });
  } else {
    const reason: FacilityDeclineReason = args.reason ?? 'OTHER';
    await prisma.$transaction(async (tx) => {
      await tx.facilityResponse.update({
        where: { id: view.id },
        data: { ...base, status: 'DECLINED', declinedAt: now, declineReason: reason, declineText: args.text?.trim().slice(0, 500) || null },
      });
      await tx.assistedLivingHome.update({
        where: { id: view.homeId },
        data: { observedAcceptanceCriteria: rollupObservedCriteria(home?.observedAcceptanceCriteria, reason, now) as unknown as Prisma.InputJsonValue },
      });
      // The reason is a fixed enum (business fact); the free text is NOT recorded.
      await recordEvent(tx, {
        entityType: 'FACILITY_RESPONSE', entityId: view.id, eventType: 'status.changed', field: 'status',
        oldValue: { status: view.status, homeId: view.homeId }, newValue: { status: 'DECLINED', homeId: view.homeId, declineReason: reason, declinedAt: now },
        source: 'OPERATOR', occurredAt: now,
      });
    });
  }
  void notifyDp(view.searchId, view.facilityName, args.action);
  return { ok: true, status: args.action === 'accept' ? 'ACCEPTED' : 'DECLINED', facilityName: view.facilityName };
}

async function notifyDp(searchId: string, facilityName: string, action: 'accept' | 'decline') {
  try {
    const s = await prisma.placementSearch.findUnique({ where: { id: searchId }, select: { userId: true } });
    if (!s) return;
    await createInAppNotification({
      userId: s.userId,
      type: 'ALERT',
      title: action === 'accept' ? `${facilityName} accepted` : `${facilityName} declined`,
      message: action === 'accept' ? `${facilityName} can accept this placement. CareLinkAI will confirm the move-in.` : `${facilityName} declined this placement — see the reason on your shortlist.`,
      link: '/discharge-planner/concierge',
      data: { kind: 'facility_response', searchId, action },
    });
  } catch (e) {
    captureError(e instanceof Error ? e : new Error(String(e)), { tags: { feature: 'facility-response' } });
  }
}

/** Admin confirms the move-in. Only an ACCEPTED row can become ADMITTED. */
export async function markAdmitted(args: { searchId: string; homeId: string; now?: Date; actor?: EventActor | null }): Promise<{ ok: true } | { ok: false; error: string }> {
  const now = args.now ?? new Date();
  const row = await prisma.facilityResponse.findUnique({ where: { searchId_homeId: { searchId: args.searchId, homeId: args.homeId } }, select: { id: true, status: true } });
  if (!row) return { ok: false, error: 'No facility response for that home' };
  if (row.status === 'ADMITTED') return { ok: true };
  if (row.status !== 'ACCEPTED') return { ok: false, error: `Facility has not accepted yet (status ${row.status})` };
  await prisma.$transaction(async (tx) => {
    await tx.facilityResponse.update({ where: { id: row.id }, data: { status: 'ADMITTED', admittedAt: now } });
    await recordEvent(tx, {
      entityType: 'FACILITY_RESPONSE', entityId: row.id, eventType: 'status.changed', field: 'status',
      oldValue: { status: row.status, homeId: args.homeId }, newValue: { status: 'ADMITTED', homeId: args.homeId, admittedAt: now },
      source: 'ADMIN', actor: args.actor ?? null, occurredAt: now,
    });
  });
  return { ok: true };
}

export const FACILITY_RESPONSE_SELECT = {
  id: true, homeId: true, status: true, contactEmail: true, delivery: true, summary: true,
  sentAt: true, openedAt: true, respondedAt: true, acceptedAt: true, declinedAt: true, admittedAt: true,
  declineReason: true, declineText: true,
} satisfies Prisma.FacilityResponseSelect;

/** DP-safe projection (no contact email). */
export function toDpFacilityResponse(r: { id: string; homeId: string; status: FacilityResponseStatus; sentAt: Date | null; openedAt: Date | null; respondedAt: Date | null; acceptedAt: Date | null; declinedAt: Date | null; admittedAt: Date | null; declineReason: FacilityDeclineReason | null; declineText: string | null }) {
  return {
    id: r.id, homeId: r.homeId, status: r.status,
    sentAt: r.sentAt, openedAt: r.openedAt, respondedAt: r.respondedAt, acceptedAt: r.acceptedAt, declinedAt: r.declinedAt, admittedAt: r.admittedAt,
    declineReason: r.declineReason, declineText: r.declineText,
  };
}
