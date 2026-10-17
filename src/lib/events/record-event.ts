/**
 * Append-only entity history (sprint W5-1, Δ14 / G2).
 *
 * One helper, `recordEvent`, writes an EntityEvent row. Callers pass the
 * transaction client they are already writing with, so the data change and
 * its history row commit together (`withEvents` wraps the common case). There
 * is no update or delete path for EntityEvent anywhere in the app — a unit test
 * greps the codebase for `entityEvent.update` / `.delete` and fails if found.
 *
 * PHI RULE (enforced here, not trusted to callers): oldValue / newValue only
 * ever carry IDs, statuses, counts, payer lane, care level, ZIP and similar
 * business facts. `sanitizeEventValue` strips everything else — a key that
 * looks like a name, DOB, diagnosis, note, contact detail or free text is
 * dropped, long strings are replaced by a length marker, nesting is capped.
 */

import type { EntityType, EventSource, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/** Anything with the Prisma delegate for EntityEvent — the client or a $transaction client. */
export type EventWriter = Pick<Prisma.TransactionClient, 'entityEvent'>;

export type EventActor = { userId?: string | null; role?: string | null };

export type RecordEventInput = {
  entityType: EntityType;
  entityId: string;
  eventType: string;
  field?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  source: EventSource;
  actor?: EventActor | null;
  occurredAt?: Date;
};

/** Keys allowed inside an object value. Everything else is dropped. */
export const ALLOWED_VALUE_KEYS: ReadonlySet<string> = new Set([
  'id', 'homeId', 'searchId', 'responseId', 'pingId', 'contactId', 'operatorId', 'orderId', 'userId',
  'status', 'from', 'to', 'count', 'total', 'outcome', 'delivery', 'reason', 'declineReason',
  'payerLane', 'payerSource', 'feeLane', 'careLevel', 'zip', 'intakeZip', 'zipCode', 'city', 'state',
  'source', 'verifiedAt', 'occurredAt', 'sentAt', 'openedAt', 'respondedAt', 'acceptedAt', 'declinedAt', 'admittedAt',
  'optedIn', 'optedInSource', 'optedInAt', 'optedOutAt', 'preferredChannel', 'amountCents', 'currency',
  'capacity', 'currentOccupancy', 'priceMin', 'priceMax', 'startingPriceMonthly', 'priceSource',
  'genderRestriction', 'amenities', 'careLevels', 'acceptsMedicaid',
  'medicaidWaiverStatus', 'medicaidWaiverSource', 'medicaidWaiverVerifiedAt',
  'medicaidPendingAccepted', 'medicaidPendingAcceptedSource', 'medicaidPendingAcceptedVerifiedAt',
  'acuityCeiling', 'acuityCeilingSource', 'acuityCeilingVerifiedAt',
  'admissionsCrm', 'admissionsCrmSource', 'admissionsCrmVerifiedAt',
  'twoPersonAssist', 'wandering', 'oxygen', 'insulin', 'bariatric', 'behavioral', 'hospiceInPlace',
  'changed', 'length', 'redactedKeys',
]);

/** Key names that are never allowed even if someone adds them to the allowlist by mistake. */
const FORBIDDEN_KEY_RE =
  /(name|dob|birth|diagnos|note|medical|needs|phone|email|street|address|ssn|patient|contact|message|query|description|text|poa)/i;

const MAX_STRING = 80;
const MAX_ARRAY = 50;
const MAX_DEPTH = 3;

/**
 * Reduce an arbitrary value to the PHI-safe subset that may be stored on an
 * event. Primitives pass (strings capped), objects keep allowlisted keys only,
 * arrays are sanitized element-wise. Returns null for anything unusable.
 */
export function sanitizeEventValue(value: unknown, depth = 0): Prisma.InputJsonValue | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const t = value.trim();
    if (t.length === 0) return '';
    return t.length <= MAX_STRING ? t : { redacted: true, length: t.length };
  }
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (depth >= MAX_DEPTH) return null;
  if (Array.isArray(value)) {
    const out: Prisma.InputJsonValue[] = [];
    for (const item of value.slice(0, MAX_ARRAY)) {
      const s = sanitizeEventValue(item, depth + 1);
      if (s !== null) out.push(s);
    }
    return out;
  }
  if (typeof value === 'object') {
    const out: Record<string, Prisma.InputJsonValue> = {};
    let redacted = 0;
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (!ALLOWED_VALUE_KEYS.has(k) || FORBIDDEN_KEY_RE.test(k)) {
        redacted += 1;
        continue;
      }
      // Inside an object a null is meaningful ("from null to 3"), so keep it.
      const s = v === null || v === undefined ? null : sanitizeEventValue(v, depth + 1);
      out[k] = s === null ? (null as unknown as Prisma.InputJsonValue) : s;
    }
    if (redacted > 0) out.redactedKeys = redacted;
    return out;
  }
  return null;
}

/**
 * Write one history row with the given client. Pass the `$transaction` client
 * when the event accompanies a data write so both commit or neither does.
 */
export async function recordEvent(tx: EventWriter, input: RecordEventInput): Promise<{ id: string }> {
  const oldValue = sanitizeEventValue(input.oldValue);
  const newValue = sanitizeEventValue(input.newValue);
  const row = await tx.entityEvent.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      eventType: input.eventType,
      field: input.field ?? null,
      oldValue: oldValue === null ? undefined : oldValue,
      newValue: newValue === null ? undefined : newValue,
      source: input.source,
      actorUserId: input.actor?.userId ?? null,
      actorRole: input.actor?.role ?? null,
      ...(input.occurredAt ? { occurredAt: input.occurredAt } : {}),
    },
    select: { id: true },
  });
  return row;
}

/**
 * Run `fn` inside one Prisma transaction. The callback receives the
 * transaction client to use for BOTH the data write and `recordEvent`.
 */
export function withEvents<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn);
}

export type FieldDiff = { field: string; oldValue: unknown; newValue: unknown };

/**
 * Field-level diff of two records restricted to `fields`, comparing by JSON
 * value so arrays / Decimals / Dates compare sensibly. Unchanged fields are
 * skipped so a no-op save records nothing.
 */
export function diffFields<T extends Record<string, unknown>>(
  before: T | null | undefined,
  after: Partial<T> | null | undefined,
  fields: readonly string[],
): FieldDiff[] {
  const out: FieldDiff[] = [];
  for (const f of fields) {
    if (!after || !(f in after) || (after as Record<string, unknown>)[f] === undefined) continue;
    const a = normalize((before as Record<string, unknown> | null | undefined)?.[f]);
    const b = normalize((after as Record<string, unknown>)[f]);
    if (JSON.stringify(a) !== JSON.stringify(b)) out.push({ field: f, oldValue: a, newValue: b });
  }
  return out;
}

function normalize(v: unknown): unknown {
  if (v === undefined) return null;
  if (v instanceof Date) return v.toISOString();
  if (v && typeof v === 'object' && 'toNumber' in (v as object) && typeof (v as { toNumber: unknown }).toNumber === 'function') {
    return (v as { toNumber: () => number }).toNumber();
  }
  return v;
}

/** Map an availability channel to the history source. */
export function eventSourceForAvailability(source: string): EventSource {
  switch (source) {
    case 'PING':
      return 'PING';
    case 'VOICE':
      return 'VA_CALL';
    case 'CONCIERGE':
      return 'ADMIN';
    case 'OPERATOR':
    case 'SMS':
    case 'EMAIL':
    default:
      return 'OPERATOR';
  }
}
