/**
 * One-tap availability ping — DB engine (sprint W4-1). Everything that touches
 * Prisma for the ping flow lives here; the rules are in ./ping.ts (pure).
 *
 * Hard rules enforced in `findEligibleContacts` — nothing sends unless ALL hold:
 *   - PING_ENABLED is truthy (checked by `runAvailabilityPing`; unset = off);
 *   - the contact is opted in (optedIn = true);
 *   - the home is ACTIVE and not a demo fixture;
 *   - the home is CLAIMED (operator is not the directory sentinel) OR the
 *     opt-in was captured by a human on a call (optedInSource = 'admin_call');
 *   - no outstanding (unanswered, unexpired) ping for the home;
 *   - the home was not verified in the last PING_SKIP_IF_VERIFIED_DAYS days.
 *
 * Transport: EMAIL via Resend. SMS is a stub behind SMS_PING_ENABLED — no
 * provider is wired; an SMS-preferred contact is skipped (and counted) either
 * way until the TCPA review lands.
 */

import crypto from 'crypto';
import type { AvailabilityPingChannel, AvailabilityPingOutcome, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { recordEvent } from '@/lib/events/record-event';
import { captureError } from '@/lib/sentry';
import { sendAvailabilityPingEmail } from '@/lib/email';
import { availabilityView, isAvailabilityFresh, toE164, updateAvailability } from '@/lib/availability/availability';
import {
  PING_EXPIRY_DAYS,
  PING_SKIP_IF_VERIFIED_DAYS,
  PING_SOURCE,
  parsePingReply,
  pingEnabled,
  pingLine,
  smsPingEnabled,
  type PingReply,
} from '@/lib/availability/ping';

const DAY_MS = 86_400_000;
export const DIRECTORY_UNCLAIMED_EMAIL = 'directory-unclaimed@carelinkai.system';

export function appUrl(env: NodeJS.ProcessEnv = process.env): string {
  return (env['NEXT_PUBLIC_APP_URL'] || env['NEXTAUTH_URL'] || 'https://getcarelinkai.com').replace(/\/$/, '');
}
export function postalAddress(env: NodeJS.ProcessEnv = process.env): string | null {
  const v = (env['COMPANY_POSTAL_ADDRESS'] || '').trim();
  return v && !/«|set .*before/i.test(v) ? v : null;
}
export function isClaimedOperatorEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase() !== DIRECTORY_UNCLAIMED_EMAIL;
}

// ---------------------------------------------------------------------------
// Contact upsert (operator portal + admin "captured on a call")
// ---------------------------------------------------------------------------

export type ContactInput = {
  homeId: string;
  name: string;
  email?: string | null;
  mobile?: string | null;
  preferredChannel?: AvailabilityPingChannel;
  optedIn: boolean;
  /** 'operator_portal' | 'admin_call' | 'reply' */
  source: string;
};

/** Contact-source string → History source + the optedInSource label stored in the event. */
function contactEventSource(source: string | null | undefined): { source: 'OPERATOR' | 'ADMIN' | 'PING'; label: 'OPERATOR' | 'ADMIN' | 'PING' } {
  if (source === 'admin_call') return { source: 'ADMIN', label: 'ADMIN' };
  if (source === 'reply') return { source: 'PING', label: 'PING' };
  return { source: 'OPERATOR', label: 'OPERATOR' };
}

/**
 * Upsert the contact and record the consent change in History (sprint W5-5) in
 * ONE transaction: contact.opted_in / contact.opted_out / contact.updated with
 * optedInSource (OPERATOR | ADMIN | PING) + timestamp. No name / email / mobile
 * in the event — ids, flags and timestamps only.
 */
export async function upsertAvailabilityContact(i: ContactInput, now: Date = new Date()) {
  const email = i.email ? i.email.trim().toLowerCase() : null;
  const mobile = i.mobile ? toE164(i.mobile) : null;
  const existing = await prisma.availabilityContact.findUnique({ where: { homeId: i.homeId } });
  const flippedOn = i.optedIn && !(existing?.optedIn ?? false);
  const flippedOff = !i.optedIn && (existing?.optedIn ?? false);
  const preferredChannel = i.preferredChannel ?? existing?.preferredChannel ?? 'EMAIL';
  const data = {
    name: i.name.trim(),
    email,
    mobile,
    preferredChannel,
    optedIn: i.optedIn,
    ...(flippedOn ? { optedInAt: now, optedInSource: i.source, optedOutAt: null } : {}),
    ...(flippedOff ? { optedOutAt: now } : {}),
  } satisfies Prisma.AvailabilityContactUncheckedUpdateInput;
  const evt = contactEventSource(i.source);
  return prisma.$transaction(async (tx) => {
    const contact = await tx.availabilityContact.upsert({
      where: { homeId: i.homeId },
      update: data,
      create: { homeId: i.homeId, ...data, ...(i.optedIn ? { optedInAt: now, optedInSource: i.source } : {}) },
    });
    await recordEvent(tx, {
      entityType: 'AVAILABILITY_PING',
      entityId: i.homeId,
      eventType: flippedOn ? 'contact.opted_in' : flippedOff ? 'contact.opted_out' : 'contact.updated',
      field: 'optedIn',
      oldValue: existing
        ? { optedIn: existing.optedIn, optedInSource: existing.optedInSource ? contactEventSource(existing.optedInSource).label : null, preferredChannel: existing.preferredChannel }
        : null,
      newValue: {
        optedIn: i.optedIn,
        optedInSource: i.optedIn ? evt.label : null,
        ...(flippedOn ? { optedInAt: now } : {}),
        ...(flippedOff ? { optedOutAt: now } : {}),
        preferredChannel,
      },
      source: evt.source,
      occurredAt: now,
    });
    return contact;
  });
}

// ---------------------------------------------------------------------------
// Weekly run
// ---------------------------------------------------------------------------

export type EligibleContact = {
  contactId: string;
  homeId: string;
  facilityName: string;
  contactName: string;
  email: string | null;
  mobile: string | null;
  preferredChannel: AvailabilityPingChannel;
};

export type SkipReason = 'unclaimed' | 'outstanding_ping' | 'recently_verified' | 'no_email';

/** Who gets pinged this run, and who was skipped and why (for the run report). */
export async function findEligibleContacts(now: Date = new Date()): Promise<{ eligible: EligibleContact[]; skipped: Record<SkipReason, number> }> {
  const contacts = await prisma.availabilityContact.findMany({
    where: { optedIn: true, home: { status: 'ACTIVE', isDemo: false } },
    select: {
      id: true,
      homeId: true,
      name: true,
      email: true,
      mobile: true,
      preferredChannel: true,
      optedInSource: true,
      home: {
        select: {
          name: true,
          availabilityVerifiedAt: true,
          operator: { select: { user: { select: { email: true } } } },
        },
      },
      pings: { where: { outcome: null, expiresAt: { gt: now } }, select: { id: true }, take: 1 },
    },
    take: 1000,
  });
  const skipped: Record<SkipReason, number> = { unclaimed: 0, outstanding_ping: 0, recently_verified: 0, no_email: 0 };
  const eligible: EligibleContact[] = [];
  const recentCutoff = now.getTime() - PING_SKIP_IF_VERIFIED_DAYS * DAY_MS;
  for (const c of contacts) {
    const claimed = isClaimedOperatorEmail(c.home.operator?.user?.email ?? null);
    if (!claimed && c.optedInSource !== 'admin_call') { skipped.unclaimed++; continue; }
    if (c.pings.length > 0) { skipped.outstanding_ping++; continue; }
    const v = c.home.availabilityVerifiedAt ? new Date(c.home.availabilityVerifiedAt).getTime() : 0;
    if (v > recentCutoff) { skipped.recently_verified++; continue; }
    if (c.preferredChannel === 'EMAIL' && !c.email) { skipped.no_email++; continue; }
    eligible.push({
      contactId: c.id,
      homeId: c.homeId,
      facilityName: c.home.name,
      contactName: c.name,
      email: c.email,
      mobile: c.mobile,
      preferredChannel: c.preferredChannel,
    });
  }
  return { eligible, skipped };
}

/** Unanswered pings past their expiry → EXPIRED (the Verified badge lapses on its own; the home joins the call list). */
export async function expireStalePings(now: Date = new Date()): Promise<number> {
  const r = await prisma.availabilityPing.updateMany({
    where: { outcome: null, expiresAt: { lt: now } },
    data: { outcome: 'EXPIRED' },
  });
  return r.count;
}

export function newPingToken(): string {
  return crypto.randomBytes(24).toString('base64url');
}

/**
 * SMS transport STUB. Returns the delivery marker; sends nothing. When
 * SMS_PING_ENABLED is unset the contact is skipped before we get here; when
 * it IS set this still only logs — Twilio/other is deliberately not wired.
 */
export function sendPingSmsStub(to: string, facilityName: string): 'skipped_sms_stub' {
  console.warn(`[availability-ping] SMS transport not wired — would text ${to.slice(0, 5)}…: "${pingLine(facilityName)}"`);
  return 'skipped_sms_stub';
}

export type PingRunResult = {
  disabled: boolean;
  expired: number;
  eligible: number;
  skipped: Record<SkipReason, number>;
  sent: number;
  skippedNoResend: number;
  skippedSms: number;
  failed: number;
  noPostalAddress?: boolean;
  pings: Array<{ pingId: string; homeId: string; channel: AvailabilityPingChannel; delivery: string }>;
};

/**
 * One weekly run. Creates a ping row per eligible contact and attempts
 * delivery. Flag off → nothing is read or written except expiring stale pings
 * is ALSO skipped (a disabled run is a no-op).
 */
export async function runAvailabilityPing(opts: { now?: Date; env?: NodeJS.ProcessEnv } = {}): Promise<PingRunResult> {
  const now = opts.now ?? new Date();
  const env = opts.env ?? process.env;
  const base: PingRunResult = {
    disabled: false, expired: 0, eligible: 0,
    skipped: { unclaimed: 0, outstanding_ping: 0, recently_verified: 0, no_email: 0 },
    sent: 0, skippedNoResend: 0, skippedSms: 0, failed: 0, pings: [],
  };
  if (!pingEnabled(env)) return { ...base, disabled: true };

  base.expired = await expireStalePings(now);
  const { eligible, skipped } = await findEligibleContacts(now);
  base.eligible = eligible.length;
  base.skipped = skipped;
  const postal = postalAddress(env);
  if (!postal) base.noPostalAddress = true;
  const url = appUrl(env);
  const smsOn = smsPingEnabled(env);

  for (const c of eligible) {
    if (c.preferredChannel === 'SMS' && !smsOn) { base.skippedSms++; continue; }
    const token = newPingToken();
    const ping = await prisma.availabilityPing.create({
      data: {
        homeId: c.homeId,
        contactId: c.contactId,
        channel: c.preferredChannel,
        token,
        sentAt: now,
        expiresAt: new Date(now.getTime() + PING_EXPIRY_DAYS * DAY_MS),
      },
      select: { id: true },
    });
    let delivery: string;
    if (c.preferredChannel === 'SMS') {
      delivery = sendPingSmsStub(c.mobile ?? '', c.facilityName);
      base.skippedSms++;
    } else if (!postal) {
      // CAN-SPAM: never send without a postal address. The ping row stays so
      // the admin view shows the run happened; the link still works if hand-sent.
      delivery = 'failed';
      base.failed++;
    } else {
      delivery = await sendAvailabilityPingEmail({
        toEmail: c.email as string,
        contactName: c.contactName,
        facilityName: c.facilityName,
        token,
        appUrl: url,
        postalAddress: postal,
      });
      if (delivery === 'sent') base.sent++;
      else if (delivery === 'skipped_no_resend') base.skippedNoResend++;
      else base.failed++;
    }
    await prisma.availabilityPing.update({ where: { id: ping.id }, data: { delivery } });
    base.pings.push({ pingId: ping.id, homeId: c.homeId, channel: c.preferredChannel, delivery });
  }
  return base;
}

// ---------------------------------------------------------------------------
// Replies
// ---------------------------------------------------------------------------

export type ApplyReplyResult =
  | { ok: true; kind: 'count'; count: number; facilityName: string; verifiedAt: string }
  | { ok: true; kind: 'stop'; facilityName: string }
  | { ok: true; kind: 'admin_review'; facilityName: string }
  | { ok: false; error: 'invalid' | 'expired' | 'already_answered'; facilityName?: string; outcome?: AvailabilityPingOutcome | null; parsedCount?: number | null };

/** Apply one reply to the ping identified by `token`. Idempotent per ping. */
export async function applyPingReply(args: { token: string; raw: string; via: 'link' | 'email_reply' | 'admin'; now?: Date }): Promise<ApplyReplyResult> {
  const now = args.now ?? new Date();
  const ping = await prisma.availabilityPing.findUnique({
    where: { token: args.token },
    select: { id: true, homeId: true, contactId: true, expiresAt: true, outcome: true, parsedCount: true, home: { select: { name: true } } },
  });
  if (!ping) return { ok: false, error: 'invalid' };
  const facilityName = ping.home.name;
  if (ping.outcome) return { ok: false, error: 'already_answered', facilityName, outcome: ping.outcome, parsedCount: ping.parsedCount };
  if (ping.expiresAt.getTime() < now.getTime()) {
    await prisma.availabilityPing.update({ where: { id: ping.id }, data: { outcome: 'EXPIRED' } });
    return { ok: false, error: 'expired', facilityName };
  }
  const parsed: PingReply = parsePingReply(args.raw);
  const replyBase = { repliedAt: now, replyRaw: args.raw.slice(0, 500), replyVia: args.via };
  if (parsed.kind === 'count') {
    const view = await updateAvailability({ homeId: ping.homeId, count: parsed.count, source: PING_SOURCE });
    await prisma.availabilityPing.update({ where: { id: ping.id }, data: { ...replyBase, parsedCount: parsed.count, outcome: 'UPDATED' } });
    return { ok: true, kind: 'count', count: parsed.count, facilityName, verifiedAt: view?.verifiedAt ?? now.toISOString() };
  }
  if (parsed.kind === 'stop') {
    await prisma.$transaction(async (tx) => {
      await tx.availabilityContact.update({ where: { id: ping.contactId }, data: { optedIn: false, optedOutAt: now } });
      await tx.availabilityPing.update({ where: { id: ping.id }, data: { ...replyBase, outcome: 'STOP' } });
      await recordEvent(tx, {
        entityType: 'AVAILABILITY_PING', entityId: ping.homeId, eventType: 'contact.opted_out', field: 'optedIn',
        oldValue: { optedIn: true, contactId: ping.contactId, pingId: ping.id }, newValue: { optedIn: false, contactId: ping.contactId, pingId: ping.id, outcome: 'STOP' },
        source: 'PING', occurredAt: now,
      });
    });
    return { ok: true, kind: 'stop', facilityName };
  }
  await prisma.availabilityPing.update({ where: { id: ping.id }, data: { ...replyBase, outcome: 'ADMIN_REVIEW' } });
  return { ok: true, kind: 'admin_review', facilityName };
}

/** An inbound email reply: match the sender to their latest outstanding ping. */
export async function applyInboundEmailReply(args: { fromEmail: string; text: string; now?: Date }): Promise<ApplyReplyResult | { ok: false; error: 'no_outstanding_ping' }> {
  const email = args.fromEmail.trim().toLowerCase();
  const ping = await prisma.availabilityPing.findFirst({
    where: { outcome: null, channel: 'EMAIL', contact: { email } },
    orderBy: { sentAt: 'desc' },
    select: { token: true },
  });
  if (!ping) return { ok: false, error: 'no_outstanding_ping' };
  return applyPingReply({ token: ping.token, raw: args.text, via: 'email_reply', now: args.now });
}

/** Admin resolves an ADMIN_REVIEW (or any open) ping with a count they confirmed by hand. */
export async function resolvePingByAdmin(args: { pingId: string; count: number; now?: Date }) {
  const now = args.now ?? new Date();
  const ping = await prisma.availabilityPing.findUnique({ where: { id: args.pingId }, select: { id: true, homeId: true } });
  if (!ping) return null;
  const view = await updateAvailability({ homeId: ping.homeId, count: args.count, source: PING_SOURCE });
  await prisma.availabilityPing.update({
    where: { id: ping.id },
    data: { outcome: 'UPDATED', parsedCount: args.count, repliedAt: now, replyVia: 'admin' },
  });
  return view;
}

// ---------------------------------------------------------------------------
// Admin view + call list
// ---------------------------------------------------------------------------

export type AdminPingRow = {
  homeId: string;
  facility: string;
  city: string | null;
  claimed: boolean;
  contact: {
    id: string;
    name: string;
    email: string | null;
    mobile: string | null;
    preferredChannel: AvailabilityPingChannel;
    optedIn: boolean;
    optedInAt: string | null;
    optedInSource: string | null;
    optedOutAt: string | null;
  };
  availability: { fresh: boolean; count: number | null; verifiedAt: string | null; source: string | null; label: string };
  lastPing: {
    id: string;
    channel: AvailabilityPingChannel;
    sentAt: string;
    expiresAt: string;
    delivery: string | null;
    repliedAt: string | null;
    replyRaw: string | null;
    replyVia: string | null;
    parsedCount: number | null;
    outcome: AvailabilityPingOutcome | null;
    /** 'sent' | 'replied' | 'expired' | 'stop' | 'admin_review' — the admin-view state. */
    state: 'sent' | 'replied' | 'expired' | 'stop' | 'admin_review';
  } | null;
  /** Expired ping and still not fresh → VA / AI-voice call list. */
  onCallList: boolean;
  /**
   * Static eligibility for the weekly ping (W5-5): opted in, email on file, and
   * claimed (or opt-in captured on an admin call). The run adds the dynamic
   * checks (outstanding ping, recently verified) — see findEligibleContacts.
   */
  eligible: boolean;
};

function pingState(o: AvailabilityPingOutcome | null): AdminPingRow['lastPing'] extends infer T ? (T extends { state: infer S } ? S : never) : never {
  if (!o) return 'sent';
  if (o === 'UPDATED') return 'replied';
  if (o === 'EXPIRED') return 'expired';
  if (o === 'STOP') return 'stop';
  return 'admin_review';
}

/** One row per availability contact (every home that has one), newest ping first. Demo homes excluded. */
export async function adminPingRows(now: Date = new Date()): Promise<AdminPingRow[]> {
  const contacts = await prisma.availabilityContact.findMany({
    where: { home: { isDemo: false } },
    select: {
      id: true, homeId: true, name: true, email: true, mobile: true, preferredChannel: true,
      optedIn: true, optedInAt: true, optedInSource: true, optedOutAt: true,
      home: {
        select: {
          name: true,
          availabilityCount: true, availabilityVerifiedAt: true, availabilitySource: true,
          address: { select: { city: true } },
          operator: { select: { user: { select: { email: true } } } },
        },
      },
      pings: { orderBy: { sentAt: 'desc' }, take: 1 },
    },
    orderBy: { updatedAt: 'desc' },
    take: 2000,
  });
  const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
  return contacts.map((c) => {
    const p = c.pings[0] ?? null;
    const view = availabilityView(c.home, now.getTime());
    const fresh = isAvailabilityFresh(c.home.availabilityVerifiedAt, now.getTime());
    const claimed = isClaimedOperatorEmail(c.home.operator?.user?.email ?? null);
    return {
      homeId: c.homeId,
      facility: c.home.name,
      city: c.home.address?.city ?? null,
      claimed,
      eligible: c.optedIn && !!c.email && c.preferredChannel === 'EMAIL' && (claimed || c.optedInSource === 'admin_call'),
      contact: {
        id: c.id, name: c.name, email: c.email, mobile: c.mobile, preferredChannel: c.preferredChannel,
        optedIn: c.optedIn, optedInAt: iso(c.optedInAt), optedInSource: c.optedInSource, optedOutAt: iso(c.optedOutAt),
      },
      availability: { fresh: view.fresh, count: view.count, verifiedAt: view.verifiedAt, source: c.home.availabilitySource ?? null, label: view.label },
      lastPing: p
        ? {
            id: p.id, channel: p.channel, sentAt: p.sentAt.toISOString(), expiresAt: p.expiresAt.toISOString(), delivery: p.delivery,
            repliedAt: iso(p.repliedAt), replyRaw: p.replyRaw, replyVia: p.replyVia, parsedCount: p.parsedCount, outcome: p.outcome,
            state: pingState(p.outcome),
          }
        : null,
      onCallList: !!p && p.outcome === 'EXPIRED' && !fresh,
    };
  });
}

function csvCell(v: string | number | boolean | null | undefined): string {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** VA / AI-voice call list: contacts whose ping expired with no reply and whose listing is no longer fresh. */
export function callListCsv(rows: AdminPingRow[]): string {
  const header = ['facility', 'city', 'contact_name', 'mobile', 'email', 'preferred_channel', 'ping_sent_at', 'ping_expired_at', 'last_verified_at', 'last_count'];
  const lines = rows
    .filter((r) => r.onCallList)
    .map((r) => [
      r.facility, r.city, r.contact.name, r.contact.mobile, r.contact.email, r.contact.preferredChannel,
      r.lastPing?.sentAt ?? '', r.lastPing?.expiresAt ?? '', r.availability.verifiedAt ?? '', r.availability.count ?? '',
    ].map(csvCell).join(','));
  return [header.join(','), ...lines].join('\n') + '\n';
}

export function reportPingError(e: unknown, extra?: Record<string, unknown>) {
  captureError(e instanceof Error ? e : new Error(String(e)), { tags: { feature: 'availability-ping' }, extra });
}
