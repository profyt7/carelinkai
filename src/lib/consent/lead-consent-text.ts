/**
 * Versioned TCPA/marketing lead-consent copy (feat/lead-consent-capture).
 *
 * Client-safe module (no server imports) — rendered by LeadConsentCheckbox and
 * validated server-side by recordLeadConsent. The text is versioned, never
 * hardcoded per-form: forms render leadConsentText(), the submit payload
 * carries the version key, and the LeadConsent row stamps which exact wording
 * the user saw. NEVER edit a published version's text — add a new version and
 * move CURRENT_LEAD_CONSENT_VERSION forward, or stored records stop being
 * provable evidence of what was displayed.
 *
 * ⚠️ v1 wording is PENDING ATTORNEY REVIEW (Haran engagement) — same gate as
 * the BAA/DPA drafts (OL-052). Structure is final; copy may change → v2.
 */

export const LEAD_CONSENT_VERSIONS: Record<string, string> = {
  'v1-2026-07-04':
    "I agree that CareLinkAI and the care providers or service partners I'm matched with may contact me about my inquiry by phone, text message, or email, including via automated technology. Consent is not a condition of receiving services. Message/data rates may apply. See our Privacy Policy.",
};

export const CURRENT_LEAD_CONSENT_VERSION = 'v1-2026-07-04';

/** The consent copy for a version (defaults to current). Unknown version → current text. */
export function leadConsentText(version: string = CURRENT_LEAD_CONSENT_VERSION): string {
  return LEAD_CONSENT_VERSIONS[version] ?? LEAD_CONSENT_VERSIONS[CURRENT_LEAD_CONSENT_VERSION];
}

export function isKnownLeadConsentVersion(version: unknown): version is string {
  return typeof version === 'string' && version in LEAD_CONSENT_VERSIONS;
}

/** Shape each form submits alongside its own payload. */
export interface LeadConsentPayload {
  given: boolean;
  textVersion: string;
}

/** Stable source-form ids (stored on LeadConsent.sourceForm). */
export const LEAD_CONSENT_FORMS = {
  HOME_INQUIRY: 'home_inquiry',
  TOUR_REQUEST: 'tour_request',
  MARKETPLACE_LEAD: 'marketplace_lead',
  DEMO_REQUEST: 'demo_request',
} as const;
