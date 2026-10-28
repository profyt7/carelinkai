/**
 * OL-184 — 10DLC SMS opt-in copy. Client-safe (no server imports).
 *
 * One sentence, used verbatim by every SMS phone field (SmsConsentCheckbox),
 * the /privacy and /terms "SMS program" sections, and the stored LeadConsent
 * row (consentTextVersion = the key below). Never edit a published version:
 * add a new key and move CURRENT_SMS_CONSENT_VERSION, or stored rows stop
 * proving what the user saw. Keys start with "sms-" so they never collide with
 * the TCPA lead-consent versions in lead-consent-text.ts.
 */

export const SMS_CONSENT_VERSIONS: Record<string, string> = {
  'sms-v1-2026-10-25':
    'Send me SMS alerts from CareLinkAI about callback requests and listing updates. Message frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help.',
};

export const CURRENT_SMS_CONSENT_VERSION = 'sms-v1-2026-10-25';

/** The exact opt-in sentence currently shown. */
export const SMS_CONSENT_TEXT = SMS_CONSENT_VERSIONS[CURRENT_SMS_CONSENT_VERSION];

export function smsConsentText(version: string = CURRENT_SMS_CONSENT_VERSION): string {
  return SMS_CONSENT_VERSIONS[version] ?? SMS_CONSENT_TEXT;
}

export function isKnownSmsConsentVersion(version: unknown): version is string {
  return typeof version === 'string' && version in SMS_CONSENT_VERSIONS;
}

/** Shape each form submits as `smsConsent` alongside its own payload. */
export interface SmsConsentPayload {
  given: boolean;
  textVersion: string;
}

export function emptySmsConsent(): SmsConsentPayload {
  return { given: false, textVersion: CURRENT_SMS_CONSENT_VERSION };
}

/** Stable source-form ids (stored on LeadConsent.sourceForm). */
export const SMS_CONSENT_FORMS = {
  HOME_INQUIRY: 'sms_home_inquiry',
  CONCIERGE_REQUEST: 'sms_concierge_request',
  REGISTER: 'sms_register',
  OPERATOR_SETTINGS: 'sms_operator_settings',
  OPERATOR_ONBOARDING: 'sms_operator_onboarding',
  PROFILE_SETTINGS: 'sms_profile_settings',
  PROVIDER_SETTINGS: 'sms_provider_settings',
  FAMILY_SETTINGS: 'sms_family_settings',
} as const;
