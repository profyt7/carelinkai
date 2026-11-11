/**
 * Test inquiries: a family inquiry whose contact email matches TEST_EMAIL_PATTERN is a
 * test (Inquiry.isTest). It is admin-only: no operator SMS/email, no claim drip or other
 * facility email, no automated follow-ups, never in operator queues or metrics. Admin can
 * see it in /admin (marked TEST), close it, or delete it.
 *
 * Use plus-addressing on an inbox you control, e.g. you+cltest@gmail.com.
 */
export const TEST_EMAIL_PATTERN = /\+cltest@/i;

export function isTestInquiryEmail(email: string | null | undefined): boolean {
  return typeof email === 'string' && TEST_EMAIL_PATTERN.test(email.trim());
}

/** Spread into any operator-facing or metrics `where` on Inquiry. */
export const REAL_INQUIRIES = { isTest: false } as const;

/**
 * Records with no isTest column of their own (TourRequest, Lead) are test when the family's account email
 * matches TEST_EMAIL_PATTERN. Prisma filter on that User: keeps only real (non-test) families.
 * Keep in sync with TEST_EMAIL_PATTERN (/\+cltest@/i).
 */
export const REAL_FAMILY_USER = { NOT: { email: { contains: '+cltest@', mode: 'insensitive' as const } } };
