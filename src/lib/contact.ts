/**
 * The published CareLinkAI phone line (OL-167d). One place for the number so
 * the footer, /contact, /concierge, /llms.txt and the Organization JSON-LD
 * never drift. The line is answered by the front desk around the clock; a
 * person calls back. No patient details by phone — those go through
 * /concierge, which is encrypted and visible only to the people the family chooses.
 */

export const CONTACT_PHONE_DISPLAY = '(216) 245-9482';
export const CONTACT_PHONE_E164 = '+12162459482';
export const CONTACT_PHONE_TEL = `tel:${CONTACT_PHONE_E164}`;
export const CONTACT_HOURS_LINE = 'Front desk answers around the clock; a person calls back within one business hour Mon–Fri 8–6 ET, or first thing the next morning.';
export const CONTACT_NO_PHI_LINE = 'Please don’t share patient details on the line — share them securely at getcarelinkai.com/concierge.';
