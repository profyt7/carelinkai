/**
 * ODH inspection-record → directory-listing matcher (OL-113).
 *
 * Policy (false-positive prevention is the point — a survey history attached to
 * the wrong facility is worse than none):
 *   1. License-number match (normalized) → CONFIRMED.
 *   2. Fallback: normalized facility name + same city, and only when exactly ONE
 *      candidate home matches → CONFIRMED (and the caller should backfill
 *      odhLicenseNumber so future runs match by license).
 *   3. Everything else — multiple candidates, name hit in a different city,
 *      city missing on either side — → REVIEW. Review rows are reported for a
 *      human; they are NEVER written.
 *
 * Demo/test listings must be excluded from the candidate set by the caller
 * (see isExcludedDemoHome), so ODH data can never attach to a fake facility.
 */

export interface OdhCitation {
  /** OAC rule cited, e.g. "3701-16-09". */
  rule?: string | null;
  /** Scope/severity if the source provides it. */
  scopeSeverity?: string | null;
  /** Plain-language description from the survey report. Facts only. */
  summary?: string | null;
}

export interface OdhSurveyRecord {
  licenseNumber?: string | null;
  facilityName: string;
  city?: string | null;
  county?: string | null;
  /** ISO date (YYYY-MM-DD or full ISO). */
  surveyDate: string;
  surveyType?: string | null;
  citationCount?: number | null;
  citations?: OdhCitation[] | null;
  sourceUrl?: string | null;
}

export interface CandidateHome {
  id: string;
  name: string;
  odhLicenseNumber?: string | null;
  city?: string | null;
  description?: string | null;
  operatorEmail?: string | null;
}

export type MatchOutcome =
  | { status: 'MATCHED'; home: CandidateHome; via: 'LICENSE' | 'NAME_CITY' }
  | { status: 'REVIEW'; reason: string; candidateIds: string[] }
  | { status: 'NO_MATCH' };

/**
 * Normalize an ODH license number: uppercase, alphanumerics only, strip leading
 * zeros ("0592R" ≡ "592R"). Returns null for empty/garbage input.
 */
export function normalizeLicense(lic: string | null | undefined): string | null {
  if (!lic) return null;
  const cleaned = lic.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^0+/, '');
  return cleaned.length >= 2 ? cleaned : null;
}

/**
 * True iff the token is a well-formed Ohio RCF license: exactly four digits +
 * "R" (e.g. "2318R", "0592R"). Six-digit numerics like "365810" are nursing-
 * home CCNs, NOT RCF licenses — writing one poisons matching AND signals the
 * facility may be NH-licensed rather than an RCF (see the Park East incident,
 * 2026-07-06). Every code path that WRITES odhLicenseNumber must gate on this;
 * matching/comparison still uses normalizeLicense on whatever is stored.
 */
export function isValidRcfLicense(lic: string | null | undefined): boolean {
  return typeof lic === 'string' && /^\d{4}R$/i.test(lic.trim());
}

// Generic corporate/legal noise that differs between ODH's licensee name and our
// display name without changing facility identity. Deliberately does NOT include
// care-type words ("assisted living", "memory care") — stripping those would
// collapse distinct sister facilities ("X Assisted Living" vs "X Memory Care").
const NAME_NOISE = /\b(llc|inc|ltd|co|corp|corporation|company|the)\b/g;

/** Normalize a facility name for exact comparison. */
export function normalizeName(name: string | null | undefined): string {
  return (name ?? '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(NAME_NOISE, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeCity(city: string | null | undefined): string {
  return (city ?? '').toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
}

// Mirrors scripts/pre-publish-test-demo-sweep.ts — the repo's canonical
// test/demo signature (no isDemo column exists on AssistedLivingHome).
const DEMO_NAME_SIGNATURE = /\b(test|demo|sample|example|dummy|fixture|founder co|chris senior care)\b/i;
const DEMO_DESC_SIGNATURE = /e2e|lorem ipsum|dev home for|test home/i;
const DEMO_OPERATOR_EMAIL = /@(carelinkai\.test|test\.carelinkai\.com)$/i;

/** Demo/test listings are excluded from ingestion entirely (OL-113 guardrail). */
export function isExcludedDemoHome(home: {
  name: string;
  description?: string | null;
  operatorEmail?: string | null;
}): boolean {
  return (
    DEMO_NAME_SIGNATURE.test(home.name) ||
    DEMO_DESC_SIGNATURE.test(home.description ?? '') ||
    DEMO_OPERATOR_EMAIL.test(home.operatorEmail ?? '')
  );
}

/**
 * Match one ODH record against the candidate homes. Candidates must already be
 * demo-filtered (matchOdhRecord double-checks as defense in depth).
 */
export function matchOdhRecord(record: OdhSurveyRecord, homes: CandidateHome[]): MatchOutcome {
  const candidates = homes.filter((h) => !isExcludedDemoHome(h));

  // 1. License number — the stable key.
  const recLic = normalizeLicense(record.licenseNumber);
  if (recLic) {
    const byLicense = candidates.filter((h) => normalizeLicense(h.odhLicenseNumber) === recLic);
    if (byLicense.length === 1) {
      return { status: 'MATCHED', home: byLicense[0], via: 'LICENSE' };
    }
    if (byLicense.length > 1) {
      // Duplicate license numbers in our directory — a data bug worth a human look.
      return {
        status: 'REVIEW',
        reason: `license ${record.licenseNumber} matches ${byLicense.length} homes`,
        candidateIds: byLicense.map((h) => h.id),
      };
    }
    // License present but unknown to us → fall through to name+city; a single
    // exact name+city hit lets us learn the license.
  }

  // 2. Exact normalized name + same city, unique candidate only.
  const recName = normalizeName(record.facilityName);
  const recCity = normalizeCity(record.city);
  if (!recName) return { status: 'NO_MATCH' };

  const byName = candidates.filter((h) => normalizeName(h.name) === recName);
  if (byName.length === 0) return { status: 'NO_MATCH' };

  if (!recCity) {
    // Never auto-match on name alone — same-brand facilities exist in many cities.
    return {
      status: 'REVIEW',
      reason: 'name matches but ODH record has no city to confirm against',
      candidateIds: byName.map((h) => h.id),
    };
  }

  const byNameCity = byName.filter((h) => normalizeCity(h.city) === recCity);
  if (byNameCity.length === 1) {
    return { status: 'MATCHED', home: byNameCity[0], via: 'NAME_CITY' };
  }
  if (byNameCity.length > 1) {
    return {
      status: 'REVIEW',
      reason: `name+city matches ${byNameCity.length} homes`,
      candidateIds: byNameCity.map((h) => h.id),
    };
  }
  // Name hit, city mismatch (or our home has no city) — plausibly a sister
  // facility elsewhere. Human decides.
  return {
    status: 'REVIEW',
    reason: `name matches ${byName.length} home(s) but city does not ("${record.city ?? ''}")`,
    candidateIds: byName.map((h) => h.id),
  };
}
