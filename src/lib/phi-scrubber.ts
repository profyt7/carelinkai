/**
 * PHI/PII key denylist for Sentry scrubbing and log redaction.
 * Any object field whose key matches this set gets its value replaced with '[REDACTED]'.
 * The set is intentionally broad — prefer over-redaction to under-redaction.
 */
const PHI_KEYS = new Set([
  'firstName',
  'lastName',
  'dateOfBirth',
  'ssn',
  'medicalConditions',
  'medications',
  'allergies',
  'diagnosis',
  'primaryDiagnosis',
  'careNotes',
  'notes',
  'content',
  'description',
  'email',
  'phone',
  'contactEmail',
  'contactPhone',
  'contactName',
  'emergencyContact',
  'emergencyPhone',
  'address',
  'patientInfo',
  'fileUrl',
]);

/**
 * Recursively scrub PHI/PII fields from any serializable payload.
 * Pure function — no side effects, deterministic output.
 *
 * - Objects: replace values whose keys are in PHI_KEYS with '[REDACTED]'; recurse into non-PHI values
 * - Arrays: recurse into each element
 * - Primitives / null: return as-is
 */
export function scrubPhi(payload: unknown): unknown {
  if (payload === null || payload === undefined) return payload;

  if (Array.isArray(payload)) {
    return payload.map((item) => scrubPhi(item));
  }

  if (typeof payload === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
      result[key] = PHI_KEYS.has(key) ? '[REDACTED]' : scrubPhi(value);
    }
    return result;
  }

  return payload;
}
