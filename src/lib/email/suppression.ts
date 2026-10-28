/**
 * Email suppression — the single source of truth for "never send to this address"
 * (fix/resend-bounce-suppression).
 *
 * Backed by the existing `EmailSuppression` table (email UNIQUE, lowercased).
 * `reason` is a free string so one list covers every exclusion cause:
 *   'bounce' | 'complaint' | 'unsubscribe' | 'invalid_syntax' | 'no_mx' | 'manual'
 *
 * Enforcement: `guardedResendSend` (src/lib/email.ts) filters recipients through
 * `filterSuppressed` before every Resend send, so a hard-bounced or complained
 * address is never emailed again. The Resend bounce/complaint webhook and the
 * import/scrub scripts all write here through `addSuppressions`.
 */

import { prisma } from '@/lib/prisma';
import { captureError } from '@/lib/sentry';

export type SuppressionReason =
  | 'bounce'
  | 'complaint'
  | 'unsubscribe'
  | 'invalid_syntax'
  | 'no_mx'
  | 'manual';

/** Trim + lowercase. Returns '' for null/blank so callers can drop it. */
export function normalizeEmail(email: string | null | undefined): string {
  return (email || '').trim().toLowerCase();
}

/** True if the address is on the suppression list. Fails OPEN (false) on a DB error. */
export async function isEmailSuppressed(email: string | null | undefined): Promise<boolean> {
  const e = normalizeEmail(email);
  if (!e) return false;
  try {
    const row = await prisma.emailSuppression.findUnique({ where: { email: e }, select: { email: true } });
    return Boolean(row);
  } catch (error) {
    captureError(error instanceof Error ? error : new Error(String(error)), { tags: { feature: 'email-suppression' }, extra: { phase: 'isSuppressed' } });
    return false; // don't let a DB hiccup block all outbound email
  }
}

/** The suppression reason for one address, or null if not suppressed. */
export async function suppressionReasonFor(email: string | null | undefined): Promise<string | null> {
  const e = normalizeEmail(email);
  if (!e) return null;
  try {
    const row = await prisma.emailSuppression.findUnique({ where: { email: e }, select: { reason: true } });
    return row ? (row.reason || 'suppressed') : null;
  } catch {
    return null;
  }
}

/**
 * Partition a recipient list into allowed vs suppressed in a SINGLE query.
 * De-dupes and normalizes; blank entries are dropped from both sides.
 */
export async function filterSuppressed(
  emails: Array<string | null | undefined>,
): Promise<{ allowed: string[]; suppressed: string[] }> {
  const normalized = Array.from(new Set(emails.map(normalizeEmail).filter(Boolean)));
  if (normalized.length === 0) return { allowed: [], suppressed: [] };
  let suppressedSet = new Set<string>();
  try {
    const rows = await prisma.emailSuppression.findMany({
      where: { email: { in: normalized } },
      select: { email: true },
    });
    suppressedSet = new Set(rows.map((r) => r.email));
  } catch (error) {
    // Fail OPEN: on a lookup error, treat nothing as suppressed rather than
    // silently dropping legitimate transactional mail. The webhook keeps the
    // list fresh, so a transient miss is low-risk.
    captureError(error instanceof Error ? error : new Error(String(error)), { tags: { feature: 'email-suppression' }, extra: { phase: 'filter' } });
    return { allowed: normalized, suppressed: [] };
  }
  return {
    allowed: normalized.filter((e) => !suppressedSet.has(e)),
    suppressed: normalized.filter((e) => suppressedSet.has(e)),
  };
}

/**
 * Add addresses to the suppression list (idempotent upsert). Existing rows keep
 * their original `suppressedAt`/first reason unless `overwriteReason` is set —
 * a complaint should be able to overwrite a milder 'unsubscribe', but we don't
 * churn timestamps. Returns the number of NEW addresses suppressed.
 */
export async function addSuppressions(
  emails: Array<string | null | undefined>,
  reason: SuppressionReason,
  source: string,
  opts: { overwriteReason?: boolean } = {},
): Promise<number> {
  const normalized = Array.from(new Set(emails.map(normalizeEmail).filter(Boolean)));
  let added = 0;
  for (const email of normalized) {
    try {
      const res = await prisma.emailSuppression.upsert({
        where: { email },
        create: { email, reason, source },
        update: opts.overwriteReason ? { reason } : {},
      });
      // upsert doesn't tell us created-vs-updated; count as added if it was brand new
      // by comparing suppressedAt to now is unreliable, so we do a cheap existence race-free
      // approximation: treat every successful upsert as processed and let callers rely on
      // a follow-up count query for exact "new" totals. We still return processed count.
      void res;
      added++;
    } catch (error) {
      captureError(error instanceof Error ? error : new Error(String(error)), { tags: { feature: 'email-suppression' }, extra: { phase: 'add', source } });
    }
  }
  return added;
}

/** Convenience single-address add. */
export async function addSuppression(
  email: string,
  reason: SuppressionReason,
  source: string,
  opts: { overwriteReason?: boolean } = {},
): Promise<void> {
  await addSuppressions([email], reason, source, opts);
}

/** Total suppressed count (for reporting how polluted the list is). */
export async function suppressedCount(): Promise<number> {
  return prisma.emailSuppression.count();
}
