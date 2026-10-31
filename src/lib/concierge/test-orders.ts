/**
 * Test concierge requests/orders (fix/concierge-outbound-safety). A test order NEVER contacts a facility:
 * facility emails/SMS are skipped and logged as "suppressed (test)". Family/admin emails still go out (to the
 * test inbox). Test orders are excluded from metrics and the monthly cap.
 * Set automatically when the family email's "+tag" contains "test" (profyt7+test@…, profyt7+cl-test-a@…) or
 * the contact name starts with "TEST"; an admin can toggle it on the request.
 */
const PLUS_TAG_TEST = /\+[^@]*test[^@]*@/i;

export function isTestContact(c: { email?: string | null; name?: string | null }): boolean {
  const email = (c.email ?? '').trim();
  const name = (c.name ?? '').trim();
  return PLUS_TAG_TEST.test(email) || /^test\b/i.test(name);
}

/** Logged / stored for every facility contact skipped because the request is a test. */
export const SUPPRESSED_TEST = 'suppressed (test)';
