/**
 * OL-163a — AI availability-call results (ElevenLabs post-call webhook).
 *
 * One call → one AvailabilityObservation, qaStatus PENDING. Nothing here
 * touches the home's public availability: that happens only when an admin
 * approves the observation in /admin/call-qa (OL-163c). Business data only
 * (beds, price, waiver answer, who answered) — never resident / patient info.
 *
 *   verifyElevenLabsSignature — HMAC check of the `ElevenLabs-Signature` header
 *                               (`t=<unix>,v0=<hex hmac_sha256(secret, "<t>.<body>")>`)
 *   parseCallResult           — payload → normalized observation input
 *   recordCallResult          — idempotent write (conversation_id) + history row
 *
 * Pure except `recordCallResult`. Secret name only: ELEVENLABS_WEBHOOK_SECRET.
 */

import crypto from 'crypto';
import type { CallOutcome, CallWaiverStatus, MedicaidPendingAnswer, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { recordEvent } from '@/lib/events/record-event';

export const ELEVENLABS_SIGNATURE_HEADER = 'elevenlabs-signature';
/** Reject signatures whose timestamp is further than this from "now" (replay guard). */
export const SIGNATURE_TOLERANCE_SECS = 30 * 60;

export type SignatureResult =
  | { ok: true }
  | { ok: false; reason: 'no_secret' | 'missing_header' | 'malformed_header' | 'stale_timestamp' | 'mismatch' };

/**
 * ElevenLabs signs `${t}.${rawBody}` with the webhook secret (HMAC-SHA256, hex)
 * and sends `ElevenLabs-Signature: t=<t>,v0=<hex>`. Constant-time compare.
 */
export function verifyElevenLabsSignature(args: {
  secret: string | null | undefined;
  header: string | null | undefined;
  rawBody: string;
  nowSecs?: number;
}): SignatureResult {
  if (!args.secret) return { ok: false, reason: 'no_secret' };
  if (!args.header) return { ok: false, reason: 'missing_header' };
  const parts = Object.fromEntries(
    args.header
      .split(',')
      .map((p) => p.trim().split('='))
      .filter((kv) => kv.length === 2)
      .map(([k, v]) => [k, v]),
  ) as Record<string, string>;
  const t = parts['t'];
  const v0 = parts['v0'];
  if (!t || !v0 || !/^\d+$/.test(t) || !/^[0-9a-f]+$/i.test(v0)) return { ok: false, reason: 'malformed_header' };
  const now = args.nowSecs ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(t)) > SIGNATURE_TOLERANCE_SECS) return { ok: false, reason: 'stale_timestamp' };
  const expected = crypto.createHmac('sha256', args.secret).update(`${t}.${args.rawBody}`).digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(v0.toLowerCase(), 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { ok: false, reason: 'mismatch' };
  return { ok: true };
}

/** Test helper / local tooling: build the header ElevenLabs would send. */
export function signElevenLabsPayload(secret: string, rawBody: string, tSecs: number = Math.floor(Date.now() / 1000)): string {
  const v0 = crypto.createHmac('sha256', secret).update(`${tSecs}.${rawBody}`).digest('hex');
  return `t=${tSecs},v0=${v0}`;
}

/* ----------------------------------------------------------------------------
 * Parsing
 * -------------------------------------------------------------------------- */

export const CALL_OUTCOMES = ['answered', 'declined', 'no_answer', 'wants_human', 'wrong_number'] as const;
export type CallOutcomeInput = (typeof CALL_OUTCOMES)[number];
export const WAIVER_ANSWERS = ['accepting_new', 'current_only', 'no', 'unknown'] as const;
export type WaiverAnswerInput = (typeof WAIVER_ANSWERS)[number];
export const PENDING_ANSWERS = ['yes', 'no', 'case_by_case', 'unknown'] as const;
export type PendingAnswerInput = (typeof PENDING_ANSWERS)[number];

export type TranscriptTurn = { role: 'agent' | 'user'; message: string; timeSecs?: number };

export type ParsedCallResult = {
  conversationId: string;
  agentId: string | null;
  homeId: string;
  calledAt: Date;
  durationSecs: number | null;
  outcome: CallOutcomeInput;
  bedsAL: number | null;
  bedsMC: number | null;
  priceFromMonthly: number | null;
  priceUndisclosed: boolean | null;
  waiverStatus: WaiverAnswerInput | null;
  medicaidPending: PendingAnswerInput | null;
  doNotCall: boolean;
  contactRole: string | null;
  notes: string | null;
  transcriptUrl: string;
  recordingUrl: string;
  transcript: TranscriptTurn[] | null;
  confidence: number | null;
};

export type ParseResult = { ok: true; value: ParsedCallResult } | { ok: false; error: string };

const asRecord = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null);

/** ElevenLabs data-collection results are `{ key: { value, rationale, … } }`; a flat `{ key: value }` is accepted too. */
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
  homeId: ['homeId', 'home_id', 'listingId', 'listing_id'],
  outcome: ['outcome', 'call_outcome'],
  bedsAL: ['bedsAL', 'beds_al', 'openAssistedLiving', 'open_assisted_living'],
  bedsMC: ['bedsMC', 'beds_mc', 'openMemoryCare', 'open_memory_care'],
  priceFromMonthly: ['priceFromMonthly', 'price_from_monthly', 'startingPrice', 'starting_price'],
  priceUndisclosed: ['priceUndisclosed', 'price_undisclosed'],
  waiverStatus: ['waiverStatus', 'waiver_status', 'medicaidWaiver', 'medicaid_waiver'],
  medicaidPending: ['medicaidPending', 'medicaid_pending'],
  doNotCall: ['doNotCall', 'do_not_call'],
  contactRole: ['contactRole', 'contact_role'],
  notes: ['notes', 'summary'],
  confidence: ['confidence'],
  transcriptUrl: ['transcriptUrl', 'transcript_url'],
  recordingUrl: ['recordingUrl', 'recording_url'],
  calledAt: ['calledAt', 'called_at'],
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

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : typeof v === 'number' ? String(v) : null);
const lower = (v: unknown): string | null => str(v)?.toLowerCase().replace(/[\s-]+/g, '_') ?? null;

function int(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'boolean') return null;
  const n = typeof v === 'number' ? v : Number.parseFloat(String(v).replace(/[^0-9.-]/g, ''));
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(999_999, Math.trunc(n)));
}
function bool(v: unknown): boolean | null {
  if (typeof v === 'boolean') return v;
  const s = lower(v);
  if (s === null) return null;
  if (['true', 'yes', 'y', '1'].includes(s)) return true;
  if (['false', 'no', 'n', '0'].includes(s)) return false;
  return null;
}
function oneOf<T extends string>(v: unknown, allowed: readonly T[]): T | null {
  const s = lower(v);
  return s && (allowed as readonly string[]).includes(s) ? (s as T) : null;
}
function normalizeWaiver(v: unknown): WaiverAnswerInput | null {
  const s = lower(v);
  if (!s) return null;
  if (['accepting_new', 'accepting', 'yes', 'new', 'new_residents'].includes(s)) return 'accepting_new';
  if (['current_only', 'current_residents_only', 'current', 'existing_only'].includes(s)) return 'current_only';
  if (['no', 'not_at_all', 'none', 'not_accepting'].includes(s)) return 'no';
  if (['unknown', 'unsure', 'not_sure', 'n/a'].includes(s)) return 'unknown';
  return null;
}
function normalizePending(v: unknown): PendingAnswerInput | null {
  const s = lower(v);
  if (!s) return null;
  if (['yes', 'true'].includes(s)) return 'yes';
  if (['no', 'false'].includes(s)) return 'no';
  if (['case_by_case', 'depends', 'sometimes', 'case_by_case_basis'].includes(s)) return 'case_by_case';
  if (['unknown', 'unsure', 'not_sure', 'n/a'].includes(s)) return 'unknown';
  return null;
}

function transcriptTurns(raw: unknown): TranscriptTurn[] | null {
  if (!Array.isArray(raw)) return null;
  const turns: TranscriptTurn[] = [];
  for (const t of raw) {
    const r = asRecord(t);
    if (!r) continue;
    const message = str(r['message'] ?? r['text']);
    if (!message) continue;
    const role = lower(r['role']) === 'user' ? 'user' : 'agent';
    const timeSecs = typeof r['time_in_call_secs'] === 'number' ? (r['time_in_call_secs'] as number) : typeof r['timeSecs'] === 'number' ? (r['timeSecs'] as number) : undefined;
    turns.push(timeSecs === undefined ? { role, message: message.slice(0, 2000) } : { role, message: message.slice(0, 2000), timeSecs });
  }
  return turns.length ? turns.slice(0, 400) : null;
}

/** Without an explicit outcome: nobody spoke → no_answer, otherwise answered. */
export function inferOutcome(transcript: TranscriptTurn[] | null, status: string | null): CallOutcomeInput {
  if (status && ['failed', 'no_answer', 'busy', 'voicemail'].includes(status)) return 'no_answer';
  if (!transcript || !transcript.some((t) => t.role === 'user')) return 'no_answer';
  return 'answered';
}

/** Where a QA reviewer can read / listen when the payload carries no link. */
export function elevenLabsConversationUrls(conversationId: string): { transcriptUrl: string; recordingUrl: string } {
  const id = encodeURIComponent(conversationId);
  return {
    transcriptUrl: `https://elevenlabs.io/app/conversational-ai/history/${id}`,
    recordingUrl: `https://api.elevenlabs.io/v1/convai/conversations/${id}/audio`,
  };
}

/**
 * Accepts the ElevenLabs `post_call_transcription` envelope
 * (`{ type, event_timestamp, data: { conversation_id, agent_id, status, transcript,
 * metadata, analysis: { data_collection_results }, conversation_initiation_client_data:
 * { dynamic_variables } } }`) and a flat test / manual shape
 * (`{ conversation_id, homeId, calledAt, outcome, … }`).
 */
export function parseCallResult(payload: unknown, now: Date = new Date()): ParseResult {
  const root = asRecord(payload);
  if (!root) return { ok: false, error: 'body must be a JSON object' };
  const data = asRecord(root['data']) ?? root;
  const conversationId = str(data['conversation_id'] ?? data['conversationId'] ?? root['conversation_id']);
  if (!conversationId) return { ok: false, error: 'conversation_id required' };

  const analysis = asRecord(data['analysis']) ?? {};
  const results = collected(analysis['data_collection_results'] ?? data['data_collection_results'] ?? data['observation']);
  const init = asRecord(data['conversation_initiation_client_data']) ?? {};
  const dyn = asRecord(init['dynamic_variables']) ?? {};
  const metadata = asRecord(data['metadata']) ?? {};
  const sources = [results, dyn, data, root];

  const homeId = str(pick(sources, 'homeId'));
  if (!homeId) return { ok: false, error: 'homeId required (dynamic_variables.homeId or data_collection_results.homeId)' };

  const startUnix = typeof metadata['start_time_unix_secs'] === 'number' ? (metadata['start_time_unix_secs'] as number) : null;
  const calledAtRaw = pick(sources, 'calledAt');
  let calledAt: Date | null = null;
  if (startUnix) calledAt = new Date(startUnix * 1000);
  else if (calledAtRaw !== undefined) {
    const d = new Date(typeof calledAtRaw === 'number' && calledAtRaw < 1e12 ? calledAtRaw * 1000 : (calledAtRaw as string | number));
    calledAt = Number.isNaN(d.getTime()) ? null : d;
  } else if (typeof root['event_timestamp'] === 'number') calledAt = new Date((root['event_timestamp'] as number) * 1000);
  if (!calledAt) calledAt = now;

  const transcript = transcriptTurns(data['transcript']);
  const status = lower(data['status']);
  const outcome = oneOf(pick(sources, 'outcome'), CALL_OUTCOMES) ?? inferOutcome(transcript, status);
  const urls = elevenLabsConversationUrls(conversationId);
  const durationRaw = metadata['call_duration_secs'] ?? data['durationSecs'] ?? data['duration_secs'];
  const confidenceRaw = pick(sources, 'confidence');
  const confidenceNum = typeof confidenceRaw === 'number' ? confidenceRaw : confidenceRaw === undefined ? null : Number.parseFloat(String(confidenceRaw));
  const confidence = confidenceNum !== null && Number.isFinite(confidenceNum) ? Math.max(0, Math.min(1, confidenceNum > 1 ? confidenceNum / 100 : confidenceNum)) : null;
  const notes = str(pick(sources, 'notes')) ?? str(analysis['transcript_summary']);

  return {
    ok: true,
    value: {
      conversationId,
      agentId: str(data['agent_id'] ?? data['agentId']),
      homeId,
      calledAt,
      durationSecs: int(durationRaw),
      outcome,
      bedsAL: int(pick(sources, 'bedsAL')),
      bedsMC: int(pick(sources, 'bedsMC')),
      priceFromMonthly: int(pick(sources, 'priceFromMonthly')),
      priceUndisclosed: bool(pick(sources, 'priceUndisclosed')),
      waiverStatus: normalizeWaiver(pick(sources, 'waiverStatus')),
      medicaidPending: normalizePending(pick(sources, 'medicaidPending')),
      doNotCall: bool(pick(sources, 'doNotCall')) === true,
      contactRole: str(pick(sources, 'contactRole'))?.slice(0, 80) ?? null,
      notes: notes ? notes.slice(0, 2000) : null,
      transcriptUrl: str(pick(sources, 'transcriptUrl')) ?? urls.transcriptUrl,
      recordingUrl: str(pick(sources, 'recordingUrl')) ?? urls.recordingUrl,
      transcript,
      confidence,
    },
  };
}

/* ----------------------------------------------------------------------------
 * Persistence
 * -------------------------------------------------------------------------- */

export const OUTCOME_TO_ENUM: Record<CallOutcomeInput, CallOutcome> = {
  answered: 'ANSWERED',
  declined: 'DECLINED',
  no_answer: 'NO_ANSWER',
  wants_human: 'WANTS_HUMAN',
  wrong_number: 'WRONG_NUMBER',
};
export const WAIVER_TO_ENUM: Record<WaiverAnswerInput, CallWaiverStatus> = {
  accepting_new: 'ACCEPTING_NEW',
  current_only: 'CURRENT_ONLY',
  no: 'NO',
  unknown: 'UNKNOWN',
};
export const PENDING_TO_ENUM: Record<PendingAnswerInput, MedicaidPendingAnswer> = {
  yes: 'YES',
  no: 'NO',
  case_by_case: 'CASE_BY_CASE',
  unknown: 'UNKNOWN',
};

export type RecordCallResultOutcome =
  | { status: 'created'; observationId: string }
  | { status: 'duplicate'; observationId: string }
  | { status: 'unknown_home' };

/**
 * Idempotent on conversation_id: a redelivered webhook returns the existing
 * row and writes nothing. The observation and its history row commit together.
 */
export async function recordCallResult(parsed: ParsedCallResult): Promise<RecordCallResultOutcome> {
  const existing = await prisma.availabilityObservation.findUnique({ where: { conversationId: parsed.conversationId }, select: { id: true } });
  if (existing) return { status: 'duplicate', observationId: existing.id };
  const home = await prisma.assistedLivingHome.findUnique({ where: { id: parsed.homeId }, select: { id: true } });
  if (!home) return { status: 'unknown_home' };

  const data: Prisma.AvailabilityObservationUncheckedCreateInput = {
    homeId: parsed.homeId,
    source: 'AI_CALL',
    conversationId: parsed.conversationId,
    agentId: parsed.agentId,
    calledAt: parsed.calledAt,
    durationSecs: parsed.durationSecs,
    outcome: OUTCOME_TO_ENUM[parsed.outcome],
    bedsAL: parsed.bedsAL,
    bedsMC: parsed.bedsMC,
    priceFromMonthly: parsed.priceFromMonthly,
    priceUndisclosed: parsed.priceUndisclosed,
    waiverStatus: parsed.waiverStatus ? WAIVER_TO_ENUM[parsed.waiverStatus] : null,
    medicaidPending: parsed.medicaidPending ? PENDING_TO_ENUM[parsed.medicaidPending] : null,
    doNotCall: parsed.doNotCall,
    contactRole: parsed.contactRole,
    notes: parsed.notes,
    transcriptUrl: parsed.transcriptUrl,
    recordingUrl: parsed.recordingUrl,
    transcript: parsed.transcript === null ? undefined : (parsed.transcript as unknown as Prisma.InputJsonValue),
    confidence: parsed.confidence,
    qaStatus: 'PENDING',
  };

  try {
    const created = await prisma.$transaction(async (tx) => {
      const row = await tx.availabilityObservation.create({ data, select: { id: true } });
      await recordEvent(tx, {
        entityType: 'AVAILABILITY',
        entityId: parsed.homeId,
        eventType: 'call.observed',
        field: 'availabilityObservation',
        newValue: {
          observationId: row.id,
          conversationId: parsed.conversationId,
          outcome: parsed.outcome,
          bedsAL: parsed.bedsAL,
          bedsMC: parsed.bedsMC,
          priceFromMonthly: parsed.priceFromMonthly,
          priceUndisclosed: parsed.priceUndisclosed,
          waiverStatus: parsed.waiverStatus,
          medicaidPending: parsed.medicaidPending,
          doNotCall: parsed.doNotCall,
          confidence: parsed.confidence,
          calledAt: parsed.calledAt,
          qaStatus: 'pending',
        },
        source: 'AI_CALL',
        occurredAt: parsed.calledAt,
      });
      return row;
    });
    return { status: 'created', observationId: created.id };
  } catch (e) {
    // A concurrent redelivery can race the findUnique above: the unique index wins.
    if ((e as { code?: string })?.code === 'P2002') {
      const again = await prisma.availabilityObservation.findUnique({ where: { conversationId: parsed.conversationId }, select: { id: true } });
      if (again) return { status: 'duplicate', observationId: again.id };
    }
    throw e;
  }
}
