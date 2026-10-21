/**
 * OL-167a — inbound calls to the published CareLinkAI number (ElevenLabs
 * front-desk agent, post-call webhook).
 *
 *   PLANNER / FAMILY / OTHER → one InboundLead (callback record, status NEW).
 *   FACILITY                 → one AvailabilityObservation (source
 *                              AI_CALL_INBOUND, qaStatus PENDING) matched to the
 *                              home by the number the call came from; when no
 *                              home matches, an InboundLead FACILITY with reason
 *                              "unmatched facility update" so nothing is lost.
 *
 * Idempotent on conversation_id (both tables are checked). Never stores
 * patient detail: `reason` goes through src/lib/phi-guard.ts and is replaced
 * with a marker (+ phiFlag) when it looks like PHI. Business contact details
 * only (name, organization, callback number).
 *
 * Pure except `recordInboundLead`. Same HMAC verifier and secret name as the
 * call-result webhook (ELEVENLABS_WEBHOOK_SECRET).
 */

import type { InboundCallerType, InboundLeadUrgency, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { recordEvent } from '@/lib/events/record-event';
import { toE164 } from '@/lib/availability/availability';
import { elevenLabsConversationUrls, WAIVER_TO_ENUM } from '@/lib/availability/call-result';
import { guardFreeText } from '@/lib/phi-guard';

export const CALLER_TYPES = ['planner', 'family', 'facility', 'other'] as const;
export type CallerTypeInput = (typeof CALLER_TYPES)[number];
export const URGENCIES = ['today', 'this_week', 'planning'] as const;
export type UrgencyInput = (typeof URGENCIES)[number];

export const UNMATCHED_FACILITY_REASON = 'unmatched facility update';
export const REASON_MAX = 280;

/** Business hours for the "after hours" flag: Mon–Fri 8:00–18:00 America/New_York. */
export const BUSINESS_HOURS = { tz: 'America/New_York', startHour: 8, endHour: 18 } as const;

export type ParsedInboundLead = {
  conversationId: string;
  agentId: string | null;
  callerType: CallerTypeInput;
  name: string | null;
  organization: string | null;
  /** E.164 callback number (falls back to the number the call came from). */
  callbackPhone: string | null;
  /** E.164 number the call came from (facility matching). */
  fromNumber: string | null;
  urgency: UrgencyInput | null;
  /** PHI-guarded, ≤ 280 chars. */
  reason: string | null;
  phiFlag: boolean;
  transcriptUrl: string;
  recordingUrl: string;
  receivedAt: Date;
  afterHours: boolean;
  /** FACILITY lane only — the same three facts as OL-163a. */
  facility: { bedsAvailable: number | null; startingPrice: number | null; medicaidWaiver: 'accepting_new' | 'current_only' | 'no' | 'unknown' | null };
};

export type ParseInboundResult = { ok: true; value: ParsedInboundLead } | { ok: false; error: string };

const asRecord = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : typeof v === 'number' ? String(v) : null);
const lower = (v: unknown): string | null => str(v)?.toLowerCase().replace(/[\s-]+/g, '_') ?? null;

/** ElevenLabs data-collection results are `{ key: { value, … } }`; a flat `{ key: value }` is accepted too. */
function collected(raw: unknown): Record<string, unknown> {
  const rec = asRecord(raw);
  if (!rec) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rec)) {
    const inner = asRecord(v);
    out[k] = inner && 'value' in inner ? inner['value'] : v;
  }
  return out;
}

const KEY_ALIASES: Record<string, string[]> = {
  callerType: ['caller_type', 'callerType', 'caller'],
  name: ['caller_name', 'callerName', 'name'],
  organization: ['organization', 'organisation', 'org', 'facility_name', 'hospital'],
  callbackPhone: ['callback_phone', 'callbackPhone', 'callback_number', 'phone'],
  urgency: ['urgency'],
  reason: ['reason', 'summary', 'notes'],
  transcriptUrl: ['transcriptUrl', 'transcript_url'],
  recordingUrl: ['recordingUrl', 'recording_url'],
  receivedAt: ['receivedAt', 'received_at', 'calledAt', 'called_at'],
  bedsAvailable: ['beds_available', 'bedsAvailable', 'open_beds', 'bedsAL', 'beds_al'],
  startingPrice: ['starting_price', 'startingPrice', 'price_from_monthly', 'priceFromMonthly'],
  medicaidWaiver: ['medicaid_waiver', 'medicaidWaiver', 'waiver_status', 'waiverStatus'],
  fromNumber: ['from_number', 'fromNumber', 'caller_number', 'external_number', 'caller_id'],
};

function pick(sources: Array<Record<string, unknown>>, key: string): unknown {
  for (const alias of KEY_ALIASES[key] ?? [key]) {
    for (const s of sources) {
      const v = s[alias];
      if (v !== undefined && v !== null && v !== '') return v;
    }
  }
  return undefined;
}

function int(v: unknown): number | null {
  if (v === null || v === undefined || v === '' || typeof v === 'boolean') return null;
  const n = typeof v === 'number' ? v : Number.parseFloat(String(v).replace(/[^0-9.-]/g, ''));
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(999_999, Math.trunc(n)));
}

export function normalizeCallerType(v: unknown): CallerTypeInput {
  const s = lower(v);
  if (!s) return 'other';
  if (['planner', 'discharge_planner', 'dp', 'social_worker', 'case_manager', 'hospital', 'nurse'].includes(s)) return 'planner';
  if (['family', 'family_member', 'daughter', 'son', 'spouse', 'caregiver', 'relative', 'self'].includes(s)) return 'family';
  if (['facility', 'community', 'operator', 'home', 'admissions', 'provider'].includes(s)) return 'facility';
  return 'other';
}

export function normalizeUrgency(v: unknown): UrgencyInput | null {
  const s = lower(v);
  if (!s) return null;
  if (['today', 'now', 'urgent', 'asap', 'immediately', 'tonight'].includes(s)) return 'today';
  if (['this_week', 'week', 'soon', 'few_days', 'this_week_'].includes(s)) return 'this_week';
  if (['planning', 'later', 'researching', 'no_rush', 'next_month', 'future'].includes(s)) return 'planning';
  return null;
}

function normalizeWaiver(v: unknown): ParsedInboundLead['facility']['medicaidWaiver'] {
  const s = lower(v);
  if (!s) return null;
  if (['accepting_new', 'accepting', 'yes', 'new', 'new_residents'].includes(s)) return 'accepting_new';
  if (['current_only', 'current_residents_only', 'current', 'existing_only'].includes(s)) return 'current_only';
  if (['no', 'not_at_all', 'none', 'not_accepting'].includes(s)) return 'no';
  if (['unknown', 'unsure', 'not_sure', 'n/a'].includes(s)) return 'unknown';
  return null;
}

/** Outside Mon–Fri 8:00–18:00 Eastern → after hours. */
export function isAfterHours(at: Date, hours = BUSINESS_HOURS): boolean {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: hours.tz, weekday: 'short', hour: 'numeric', hour12: false }).formatToParts(at);
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';
  const hour = Number.parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10) % 24;
  if (weekday === 'Sat' || weekday === 'Sun') return true;
  return hour < hours.startHour || hour >= hours.endHour;
}

/**
 * Accepts the ElevenLabs `post_call_transcription` envelope and a flat
 * test / manual shape. The caller's number comes from
 * `metadata.phone_call.external_number` (inbound calls) or `from_number`.
 */
export function parseInboundLead(payload: unknown, now: Date = new Date()): ParseInboundResult {
  const root = asRecord(payload);
  if (!root) return { ok: false, error: 'body must be a JSON object' };
  const data = asRecord(root['data']) ?? root;
  const conversationId = str(data['conversation_id'] ?? data['conversationId'] ?? root['conversation_id']);
  if (!conversationId) return { ok: false, error: 'conversation_id required' };

  const analysis = asRecord(data['analysis']) ?? {};
  const results = collected(analysis['data_collection_results'] ?? data['data_collection_results'] ?? data['lead']);
  const metadata = asRecord(data['metadata']) ?? {};
  const phoneCall = asRecord(metadata['phone_call']) ?? {};
  const sources = [results, data, root];

  const startUnix = typeof metadata['start_time_unix_secs'] === 'number' ? (metadata['start_time_unix_secs'] as number) : null;
  const receivedRaw = pick(sources, 'receivedAt');
  let receivedAt: Date | null = null;
  if (startUnix) receivedAt = new Date(startUnix * 1000);
  else if (receivedRaw !== undefined) {
    const d = new Date(typeof receivedRaw === 'number' && receivedRaw < 1e12 ? receivedRaw * 1000 : (receivedRaw as string | number));
    receivedAt = Number.isNaN(d.getTime()) ? null : d;
  } else if (typeof root['event_timestamp'] === 'number') receivedAt = new Date((root['event_timestamp'] as number) * 1000);
  if (!receivedAt) receivedAt = now;

  const fromNumber = toE164(str(phoneCall['external_number'] ?? pick(sources, 'fromNumber')));
  const callbackPhone = toE164(str(pick(sources, 'callbackPhone'))) ?? fromNumber;
  const callerType = normalizeCallerType(pick(sources, 'callerType'));
  const guarded = guardFreeText(str(pick(sources, 'reason')), REASON_MAX);
  const urls = elevenLabsConversationUrls(conversationId);

  return {
    ok: true,
    value: {
      conversationId,
      agentId: str(data['agent_id'] ?? data['agentId']),
      callerType,
      name: str(pick(sources, 'name'))?.slice(0, 120) ?? null,
      organization: str(pick(sources, 'organization'))?.slice(0, 160) ?? null,
      callbackPhone,
      fromNumber,
      urgency: normalizeUrgency(pick(sources, 'urgency')),
      reason: guarded.text,
      phiFlag: guarded.flagged,
      transcriptUrl: str(pick(sources, 'transcriptUrl')) ?? urls.transcriptUrl,
      recordingUrl: str(pick(sources, 'recordingUrl')) ?? urls.recordingUrl,
      receivedAt,
      afterHours: isAfterHours(receivedAt),
      facility: {
        bedsAvailable: int(pick(sources, 'bedsAvailable')),
        startingPrice: int(pick(sources, 'startingPrice')),
        medicaidWaiver: normalizeWaiver(pick(sources, 'medicaidWaiver')),
      },
    },
  };
}

export const CALLER_TYPE_TO_ENUM: Record<CallerTypeInput, InboundCallerType> = { planner: 'PLANNER', family: 'FAMILY', facility: 'FACILITY', other: 'OTHER' };
export const URGENCY_TO_ENUM: Record<UrgencyInput, InboundLeadUrgency> = { today: 'TODAY', this_week: 'THIS_WEEK', planning: 'PLANNING' };

export type RecordInboundOutcome =
  | { status: 'created'; lane: 'lead'; leadId: string; callerType: InboundCallerType }
  | { status: 'created'; lane: 'observation'; observationId: string; homeId: string }
  | { status: 'duplicate'; lane: 'lead'; leadId: string }
  | { status: 'duplicate'; lane: 'observation'; observationId: string }
  | { status: 'invalid'; error: 'callback_phone_required' };

/** Find the home whose business line the call came from. */
export async function matchHomeByPhone(fromNumber: string | null): Promise<{ id: string } | null> {
  if (!fromNumber) return null;
  const last4 = fromNumber.slice(-4);
  const candidates = await prisma.assistedLivingHome.findMany({
    where: { phone: { contains: last4 }, isDemo: false },
    select: { id: true, phone: true },
    take: 50,
  });
  const hit = candidates.find((h) => toE164(h.phone) === fromNumber);
  return hit ? { id: hit.id } : null;
}

/**
 * Idempotent on conversation_id across both tables. The row and its history
 * entry commit together. A FACILITY call matched to a home becomes a pending
 * observation (QA queue decides); unmatched → FACILITY lead so it is not lost.
 */
export async function recordInboundLead(parsed: ParsedInboundLead): Promise<RecordInboundOutcome> {
  const existingLead = await prisma.inboundLead.findUnique({ where: { conversationId: parsed.conversationId }, select: { id: true } });
  if (existingLead) return { status: 'duplicate', lane: 'lead', leadId: existingLead.id };
  const existingObs = await prisma.availabilityObservation.findUnique({ where: { conversationId: parsed.conversationId }, select: { id: true } });
  if (existingObs) return { status: 'duplicate', lane: 'observation', observationId: existingObs.id };

  if (parsed.callerType === 'facility') {
    const home = await matchHomeByPhone(parsed.fromNumber);
    if (home) {
      const data: Prisma.AvailabilityObservationUncheckedCreateInput = {
        homeId: home.id,
        source: 'AI_CALL_INBOUND',
        conversationId: parsed.conversationId,
        agentId: parsed.agentId,
        calledAt: parsed.receivedAt,
        outcome: 'ANSWERED',
        bedsAL: parsed.facility.bedsAvailable,
        priceFromMonthly: parsed.facility.startingPrice,
        priceUndisclosed: parsed.facility.startingPrice === null ? null : false,
        waiverStatus: parsed.facility.medicaidWaiver ? WAIVER_TO_ENUM[parsed.facility.medicaidWaiver] : null,
        contactRole: parsed.name ? 'caller' : null,
        notes: parsed.reason,
        transcriptUrl: parsed.transcriptUrl,
        recordingUrl: parsed.recordingUrl,
        qaStatus: 'PENDING',
      };
      try {
        const created = await prisma.$transaction(async (tx) => {
          const row = await tx.availabilityObservation.create({ data, select: { id: true } });
          await recordEvent(tx, {
            entityType: 'AVAILABILITY',
            entityId: home.id,
            eventType: 'call.observed',
            field: 'availabilityObservation',
            newValue: {
              observationId: row.id,
              conversationId: parsed.conversationId,
              outcome: 'answered',
              bedsAL: parsed.facility.bedsAvailable,
              priceFromMonthly: parsed.facility.startingPrice,
              waiverStatus: parsed.facility.medicaidWaiver,
              calledAt: parsed.receivedAt,
              qaStatus: 'pending',
              source: 'AI_CALL_INBOUND',
            },
            source: 'AI_CALL',
            occurredAt: parsed.receivedAt,
          });
          return row;
        });
        return { status: 'created', lane: 'observation', observationId: created.id, homeId: home.id };
      } catch (e) {
        const dup = await prisma.availabilityObservation.findUnique({ where: { conversationId: parsed.conversationId }, select: { id: true } });
        if (dup) return { status: 'duplicate', lane: 'observation', observationId: dup.id };
        throw e;
      }
    }
  }

  if (!parsed.callbackPhone) return { status: 'invalid', error: 'callback_phone_required' };
  const unmatchedFacility = parsed.callerType === 'facility';
  const callerType = CALLER_TYPE_TO_ENUM[parsed.callerType];
  const data: Prisma.InboundLeadUncheckedCreateInput = {
    conversationId: parsed.conversationId,
    callerType,
    name: parsed.name,
    organization: parsed.organization,
    callbackPhone: parsed.callbackPhone,
    urgency: parsed.urgency ? URGENCY_TO_ENUM[parsed.urgency] : null,
    reason: unmatchedFacility ? UNMATCHED_FACILITY_REASON : parsed.reason,
    transcriptUrl: parsed.transcriptUrl,
    recordingUrl: parsed.recordingUrl,
    afterHours: parsed.afterHours,
    status: 'NEW',
    receivedAt: parsed.receivedAt,
    phiFlag: unmatchedFacility ? false : parsed.phiFlag,
  };
  try {
    const created = await prisma.$transaction(async (tx) => {
      const row = await tx.inboundLead.create({ data, select: { id: true } });
      await recordEvent(tx, {
        entityType: 'INBOUND_LEAD',
        entityId: row.id,
        eventType: 'lead.received',
        field: 'inboundLead',
        newValue: {
          leadId: row.id,
          conversationId: parsed.conversationId,
          callerType: callerType.toLowerCase(),
          urgency: parsed.urgency,
          afterHours: parsed.afterHours,
          phiFlag: data.phiFlag,
          status: 'new',
        },
        source: 'AI_CALL',
        occurredAt: parsed.receivedAt,
      });
      return row;
    });
    return { status: 'created', lane: 'lead', leadId: created.id, callerType };
  } catch (e) {
    const dup = await prisma.inboundLead.findUnique({ where: { conversationId: parsed.conversationId }, select: { id: true } });
    if (dup) return { status: 'duplicate', lane: 'lead', leadId: dup.id };
    throw e;
  }
}
