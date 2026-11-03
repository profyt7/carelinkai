/**
 * PHI guard for free-text that arrives from outside (OL-167a: the "reason" a
 * caller gave the phone front desk). We never want patient detail in our
 * tables: if the text looks like it carries any, the WHOLE field is replaced
 * with a marker and the row is flagged for a person to handle by phone.
 *
 * Deliberately small and dumb — a keyword / pattern list, not a classifier.
 * False positives cost a redacted reason; false negatives cost a HIPAA
 * conversation. Err toward redacting.
 */

export const PHI_REDACTED = '[redacted — possible PHI]';

/** Keywords and patterns that mark text as possible patient detail. */
export const PHI_PATTERNS: ReadonlyArray<RegExp> = [
  /\bdob\b/i,
  /\bdate\s+of\s+birth\b/i,
  /\bmrn\b/i,
  /\bmedical\s+record\s+(number|no\.?|#)/i,
  /diagnos/i, // diagnosis, diagnosed, diagnoses
  /\bmedicaid\s*(id|number|no\.?|#)\b/i,
  /\bmedicare\s*(id|number|no\.?|#)\b/i,
  /\bssn\b/i,
  /\bsocial\s+security\b/i,
  /\b\d{3}-\d{2}-\d{4}\b/, // SSN with dashes
  /\b\d{9}\b/, // any bare 9-digit number (SSN / MRN shaped)
  /\b(icd|dx)[-\s:]?[a-z]?\d/i, // ICD-10 style codes (F03.90)
];

export type PhiGuardResult = { text: string | null; flagged: boolean; matched: string[] };

/** True when the text trips any PHI pattern. */
export function looksLikePhi(text: string | null | undefined): boolean {
  if (!text) return false;
  return PHI_PATTERNS.some((re) => re.test(text));
}

/**
 * Replace the text with the redaction marker when it looks like PHI.
 * Always returns the (possibly redacted) text and whether it was flagged.
 */
export function guardFreeText(text: string | null | undefined, maxLen = 280): PhiGuardResult {
  const t = typeof text === 'string' ? text.trim() : '';
  if (!t) return { text: null, flagged: false, matched: [] };
  const matched = PHI_PATTERNS.filter((re) => re.test(t)).map((re) => re.source);
  if (matched.length > 0) return { text: PHI_REDACTED, flagged: true, matched };
  return { text: t.slice(0, maxLen), flagged: false, matched: [] };
}

/**
 * fix/public-api-truth-privacy: extra patterns for a facility's free-text decline note
 * (FacilityResponse.declineText). The structured declineReason enum already carries the
 * business fact; this note must never hold who the patient is or what they have.
 * Names are matched heuristically (honorific or relation word + a Capitalized word,
 * "name is X"), so these patterns are case-sensitive where capitalization matters.
 */
const MONTHS = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?';
export const DECLINE_TEXT_PHI_PATTERNS: ReadonlyArray<RegExp> = [
  // contact details
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, // email
  /(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/, // US phone
  // dates of birth / any calendar date
  /\bborn\b/i,
  /\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b/, // 3/14/1941, 03-14-41
  /\b\d{4}-\d{1,2}-\d{1,2}\b/, // 1941-03-14
  new RegExp(`\\b${MONTHS}\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4}\\b`, 'i'), // March 14, 1941
  // age
  /\b\d{2,3}\s*-?\s*(?:y\/?o|yrs?\.?\s*old|years?[\s-]*old)\b/i,
  /\baged?\s*:?\s*\d{2,3}\b/i,
  // diagnoses and conditions
  /\b(?:dementia|alzheimer|parkinson|stroke|cva|diabet|cancer|copd|chf|heart\s+failure|schizophren|bipolar|psychos|depress|dialysis|seizure|epilep|hiv|hepatitis|ms\b|als\b|tbi\b|amputat|fracture|wound|ulcer|catheter|feeding\s+tube|g-?tube|trach|ventilat|mrsa|c\.?\s?diff|covid|infection)/i,
  // names
  /\b(?:Mr|Mrs|Ms|Miss|Dr)\.?\s+[A-Z][a-z]+/,
  /\b(?:[Pp]atient|[Rr]esident|[Cc]lient|[Rr]eferral|[Mm]other|[Ff]ather|[Mm]om|[Dd]ad|[Hh]usband|[Ww]ife|[Ss]on|[Dd]aughter|[Gg]randmother|[Gg]randfather|[Gg]randma|[Gg]randpa)\s+(?:named\s+)?[A-Z][a-z]+/,
  /\b(?:[Nn]ame\s+is|[Nn]amed|[Cc]alled)\s+[A-Z][a-z]+/,
];

/**
 * Screen a facility's decline note. Anything that looks like a name, DOB/date, age,
 * diagnosis, phone or email (or trips the base PHI list) replaces the WHOLE note with
 * PHI_REDACTED. Clean notes are trimmed and capped at maxLen.
 */
export function guardDeclineText(text: string | null | undefined, maxLen = 500): PhiGuardResult {
  const t = typeof text === 'string' ? text.trim() : '';
  if (!t) return { text: null, flagged: false, matched: [] };
  const matched = [...PHI_PATTERNS, ...DECLINE_TEXT_PHI_PATTERNS].filter((re) => re.test(t)).map((re) => re.source);
  if (matched.length > 0) return { text: PHI_REDACTED, flagged: true, matched };
  return { text: t.slice(0, maxLen), flagged: false, matched: [] };
}
