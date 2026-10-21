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
