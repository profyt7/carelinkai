/**
 * Ohio Medicaid Assisted Living Waiver + acceptance facts (sprint W5-2, G3 + G4).
 *
 * Pure helpers shared by the WRAAA import script, the public listing view, the
 * directory filter and the admin "Acceptance (from calls)" form. No Prisma here.
 *
 * Honesty rules (public copy):
 *   - the waiver line names its source and date and tells the family to confirm
 *     with the home; NOT_ON_LIST / UNKNOWN render nothing (absence of evidence
 *     is not "does not accept");
 *   - "pending accepted" is shown only once a human set it, with the verified date.
 */

import type { MedicaidWaiverStatus } from '@prisma/client';

/** Who said so. The WRAAA import may never overwrite a protected (human) source. */
export type AcceptanceSource = 'VA_CALL' | 'OPERATOR' | 'ADMIN' | 'IMPORT';
export const ACCEPTANCE_SOURCES: readonly AcceptanceSource[] = ['VA_CALL', 'OPERATOR', 'ADMIN', 'IMPORT'];
export const PROTECTED_SOURCES: ReadonlySet<string> = new Set(['VA_CALL', 'OPERATOR', 'ADMIN']);

export function isProtectedSource(source: string | null | undefined): boolean {
  return !!source && PROTECTED_SOURCES.has(source);
}

/** The WRAAA list we baseline from, verbatim as stored in medicaidWaiverSource. */
export const WRAAA_IMPORT_SOURCE = 'WRAAA Medicaid Waiver Facilities list (accessed 2026-10-16)';
export const WRAAA_ACCESSED_AT = new Date('2026-10-16T00:00:00.000Z');
/** Public attribution line under the waiver status. */
export const WAIVER_SOURCE_NOTE = 'Source: Western Reserve Area Agency on Aging, Oct 2026. Confirm with the home.';

/** WRAAA's five counties — a home there that is NOT on the list is NOT_ON_LIST. */
export const WRAAA_COUNTIES: readonly string[] = ['Cuyahoga', 'Lake', 'Geauga', 'Lorain', 'Medina'];

/** Precedence when one license appears on several rows: most permissive wins. */
const PERMISSIVENESS: Record<MedicaidWaiverStatus, number> = {
  ACCEPTING_NEW: 4,
  CURRENT_RESIDENTS_ONLY: 3,
  NOT_ACCEPTING_REFERRALS: 2,
  NOT_ON_LIST: 1,
  UNKNOWN: 0,
};

export function mostPermissiveWaiverStatus(statuses: readonly MedicaidWaiverStatus[]): MedicaidWaiverStatus {
  let best: MedicaidWaiverStatus = 'UNKNOWN';
  for (const s of statuses) if (PERMISSIVENESS[s] > PERMISSIVENESS[best]) best = s;
  return best;
}

/** WRAAA's CSV vocabulary → our enum. Unknown words → null (row is reported, never guessed). */
export function wraaaStatusToEnum(raw: string | null | undefined): MedicaidWaiverStatus | null {
  const s = (raw ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  switch (s) {
    case 'accepting':
    case 'accepting_new':
      return 'ACCEPTING_NEW';
    case 'current_residents_only':
    case 'current_residents':
      return 'CURRENT_RESIDENTS_ONLY';
    case 'not_accepting_referrals':
    case 'not_accepting':
      return 'NOT_ACCEPTING_REFERRALS';
    default:
      return null;
  }
}

/** Public line per status; null → render nothing. */
export const WAIVER_PUBLIC_LABEL: Record<MedicaidWaiverStatus, string | null> = {
  ACCEPTING_NEW: 'Accepting new waiver residents',
  CURRENT_RESIDENTS_ONLY: 'Waiver — current residents only',
  NOT_ACCEPTING_REFERRALS: 'Not taking new waiver referrals',
  NOT_ON_LIST: null,
  UNKNOWN: null,
};

/** Admin-facing labels (every status, incl. the two silent ones). */
export const WAIVER_ADMIN_LABEL: Record<MedicaidWaiverStatus, string> = {
  ACCEPTING_NEW: 'Accepting new waiver residents',
  CURRENT_RESIDENTS_ONLY: 'Current residents only',
  NOT_ACCEPTING_REFERRALS: 'Not taking new waiver referrals',
  NOT_ON_LIST: 'Not on the WRAAA list',
  UNKNOWN: 'Unknown',
};

export const MEDICAID_WAIVER_STATUSES: readonly MedicaidWaiverStatus[] = [
  'ACCEPTING_NEW',
  'CURRENT_RESIDENTS_ONLY',
  'NOT_ACCEPTING_REFERRALS',
  'NOT_ON_LIST',
  'UNKNOWN',
];

export function isMedicaidWaiverStatus(v: unknown): v is MedicaidWaiverStatus {
  return typeof v === 'string' && (MEDICAID_WAIVER_STATUSES as readonly string[]).includes(v);
}

/** Acuity ceiling keys — each true / false / null (unknown). */
export const ACUITY_KEYS = ['twoPersonAssist', 'wandering', 'oxygen', 'insulin', 'bariatric', 'behavioral', 'hospiceInPlace'] as const;
export type AcuityKey = (typeof ACUITY_KEYS)[number];
export type AcuityCeiling = Record<AcuityKey, boolean | null>;

export const ACUITY_LABEL: Record<AcuityKey, string> = {
  twoPersonAssist: 'Two-person assist',
  wandering: 'Wandering / exit-seeking',
  oxygen: 'Oxygen',
  insulin: 'Insulin management',
  bariatric: 'Bariatric',
  behavioral: 'Behavioral needs',
  hospiceInPlace: 'Hospice in place',
};

/** Coerce arbitrary JSON into a full AcuityCeiling (unknown keys dropped, missing → null). */
export function normalizeAcuityCeiling(input: unknown): AcuityCeiling {
  const src = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const out = {} as AcuityCeiling;
  for (const k of ACUITY_KEYS) {
    const v = src[k];
    out[k] = typeof v === 'boolean' ? v : null;
  }
  return out;
}

export const ADMISSIONS_CRM_OPTIONS: readonly string[] = ['Eldermark', 'WelcomeHome', 'Yardi Senior', 'PointClickCare', 'spreadsheet', 'other'];

export type WaiverHomeFacts = {
  medicaidWaiverStatus?: MedicaidWaiverStatus | null;
  medicaidWaiverSource?: string | null;
  medicaidWaiverVerifiedAt?: Date | string | null;
  medicaidPendingAccepted?: boolean | null;
  medicaidPendingAcceptedVerifiedAt?: Date | string | null;
};

export type MedicaidWaiverPublicView = {
  status: MedicaidWaiverStatus;
  /** 'Accepting new waiver residents' etc., or null when nothing should render. */
  line: string | null;
  /** Attribution shown under `line` (only when `line` is set). */
  note: string | null;
  /** 'Accepts residents while the Medicaid application is pending: yes — verified Oct 16, 2026', or null. */
  pendingLine: string | null;
  pendingAccepted: boolean | null;
};

function fmtDate(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return null;
  return t.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/** Pure: what the public listing page and /api/homes/:id JSON may say. */
export function medicaidWaiverPublicView(home: WaiverHomeFacts): MedicaidWaiverPublicView {
  const status: MedicaidWaiverStatus = home.medicaidWaiverStatus ?? 'UNKNOWN';
  const line = WAIVER_PUBLIC_LABEL[status];
  const pending = typeof home.medicaidPendingAccepted === 'boolean' ? home.medicaidPendingAccepted : null;
  const pendingDate = fmtDate(home.medicaidPendingAcceptedVerifiedAt);
  const pendingLine =
    pending === null
      ? null
      : `Accepts residents while the Medicaid application is pending: ${pending ? 'yes' : 'no'}${pendingDate ? ` — verified ${pendingDate}` : ''}`;
  return {
    status,
    line,
    note: line ? WAIVER_SOURCE_NOTE : null,
    pendingLine,
    pendingAccepted: pending,
  };
}
