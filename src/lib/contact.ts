/**
 * The published CareLinkAI phone line (OL-167d). One place for the number so
 * the footer, /contact, /concierge, /llms.txt and the Organization JSON-LD
 * never drift. The line is answered by an automated front desk 24/7 (ElevenLabs voice agent), which takes the caller's
 * message; a person calls back within one business day. No patient details by phone — those go through
 * /concierge, which is encrypted and visible only to the people the family chooses.
 */

export const CONTACT_PHONE_DISPLAY = '(216) 245-9482';
export const CONTACT_PHONE_E164 = '+12162459482';
export const CONTACT_PHONE_TEL = `tel:${CONTACT_PHONE_E164}`;
/** The line is an automated front desk; say so wherever the phone line is described. */
export const CONTACT_HOURS_LINE = 'Our automated front desk answers 24/7 and takes your message. A person calls you back within one business day.';
/** Footer copy: "Call (216) 245-9482 — our automated front desk answers 24/7 and takes your message. A person calls you back within one business day." */
export const CONTACT_FOOTER_LINE = '— our automated front desk answers 24/7 and takes your message. A person calls you back within one business day.';
export const CONTACT_NO_PHI_LINE = 'Please don’t share patient details on the line — share them securely at getcarelinkai.com/concierge.';

/** Company mailing address and contact email for legal notices (/privacy, /terms) — OL-192. */
export const COMPANY_STREET = '6545 Market Ave North, STE 100';
export const COMPANY_CITY = 'Canton';
export const COMPANY_REGION = 'OH';
export const COMPANY_POSTAL_CODE = '44721';
export const COMPANY_ADDRESS_LINE_1 = COMPANY_STREET;
export const COMPANY_ADDRESS_LINE_2 = `${COMPANY_CITY}, ${COMPANY_REGION} ${COMPANY_POSTAL_CODE}`;
export const COMPANY_ADDRESS = `${COMPANY_ADDRESS_LINE_1}, ${COMPANY_ADDRESS_LINE_2}`;
export const COMPANY_EMAIL = 'chris@getcarelinkai.com';
export const COMPANY_MAILTO = `mailto:${COMPANY_EMAIL}`;
