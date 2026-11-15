/**
 * One admin email per listing claim, for both claim paths:
 *   - self-serve: /homes/[id]/claim → HomeClaim PENDING_REVIEW (submitSelfServeClaim) — needs approval;
 *   - token: an emailed /claim?token= link, completed at onboarding step 2 (POST /api/operator/homes/[id]/claim).
 *
 * Sent to ADMIN_NOTIFY_EMAIL (existing env; falls back like the other admin notices) through the shared
 * Resend helper. Test claimants (+cltest@, *.test, carelinkai.com — the inquiry / recipient-guard rules)
 * get no email, but the event is still logged. Idempotent per claim: a `claim.admin_notified` EntityEvent
 * keyed by the claim is written before sending, and a second call for the same claim does nothing.
 * No PHI: facility, city, the claimant's own name/email (the operator), the claim type and the time.
 */
import { prisma } from '@/lib/prisma';
import { recordEvent } from '@/lib/events/record-event';
import { guardedResendSend } from '@/lib/email';
import { emailButton } from '@/lib/email/layout';
import { isBlockedRecipient } from '@/lib/email/recipient-guard';
import { isTestInquiryEmail } from '@/lib/inquiries/test-inquiry';
import { captureError } from '@/lib/sentry';

export type ListingClaimKind = 'self_serve' | 'token';

export type ListingClaimNotice = {
  /** HomeClaim id (self-serve) or a stable key for a token claim (`token:<homeId>:<operatorId>`). */
  claimKey: string;
  kind: ListingClaimKind;
  homeId: string;
  facility: string;
  city: string | null | undefined;
  claimantName: string | null | undefined;
  claimantEmail: string | null | undefined;
  actor: { userId: string; role: string };
  /** For tests. */
  now?: Date;
};

export type ListingClaimNoticeResult = 'sent' | 'skipped_test' | 'duplicate' | 'failed';

export const CLAIM_NOTICE_EVENT = 'claim.admin_notified';

/** A test claimant: +cltest@ plus-addressing, or a seed/demo domain we never email (*.test, carelinkai.com). */
export function isTestClaimant(email: string | null | undefined): boolean {
  return isTestInquiryEmail(email) || isBlockedRecipient(email);
}

export function listingClaimSubject(facility: string, city: string | null | undefined): string {
  return `New listing claim: ${facility} (${city?.trim() || 'city unknown'})`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

export async function notifyAdminOfListingClaim(n: ListingClaimNotice): Promise<ListingClaimNoticeResult> {
  try {
    const already = await prisma.entityEvent.findFirst({
      where: { entityType: 'LISTING_CLAIM', entityId: n.homeId, eventType: CLAIM_NOTICE_EVENT, newValue: { path: ['id'], equals: n.claimKey } },
      select: { id: true },
    });
    if (already) return 'duplicate';

    const test = isTestClaimant(n.claimantEmail);
    // Logged for every claim, test or not (ids and status only; recordEvent strips anything else).
    await recordEvent(prisma, {
      entityType: 'LISTING_CLAIM', entityId: n.homeId, eventType: CLAIM_NOTICE_EVENT, field: 'status',
      oldValue: null, newValue: { id: n.claimKey, status: n.kind === 'self_serve' ? 'PENDING_REVIEW' : 'CLAIMED', delivery: test ? 'skipped_test' : 'email' },
      source: 'SYSTEM', actor: n.actor,
    });
    if (test) return 'skipped_test';

    const to = process.env.ADMIN_NOTIFY_EMAIL || process.env.CLAIM_NOTIFY_EMAIL || 'chris@getcarelinkai.com';
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://getcarelinkai.com').replace(/\/$/, '');
    // Self-serve claims wait in the approval queue; a token claim is already complete, so link the listing's admin page.
    const link = n.kind === 'self_serve' ? `${appUrl}/admin/home-claims` : `${appUrl}/admin/homes/${n.homeId}`;
    const type = n.kind === 'self_serve' ? 'Self-serve claim — needs your approval' : 'Emailed claim link — claim completed';
    const when = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', dateStyle: 'full', timeStyle: 'short' }).format(n.now ?? new Date()) + ' ET';
    const subject = listingClaimSubject(n.facility, n.city);
    const rows: Array<[string, string]> = [
      ['Facility', n.facility],
      ['City', n.city?.trim() || '(unknown)'],
      ['Claimant', [n.claimantName?.trim(), n.claimantEmail].filter(Boolean).join(' — ') || '(unknown)'],
      ['Claim type', type],
      ['Time', when],
    ];
    const cta = n.kind === 'self_serve' ? 'Review claim' : 'Open listing in admin';

    const { error } = await guardedResendSend({
      from: `CareLinkAI <${process.env.EMAIL_FROM || 'noreply@getcarelinkai.com'}>`,
      to: [to],
      subject,
      text: `${subject}\n\n${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${cta}: ${link}\n`,
      html:
        `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 16px">` +
        rows.map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;vertical-align:top">${escapeHtml(k)}</td><td style="padding:4px 0">${escapeHtml(v)}</td></tr>`).join('') +
        `</table>` +
        emailButton(cta, link, n.kind === 'self_serve' ? 'Open the claim queue' : 'Open the listing'),
      tags: [{ name: 'category', value: 'listing-claim-admin' }],
    });
    if (error) throw error instanceof Error ? error : new Error(String((error as { message?: string })?.message ?? error));
    return 'sent';
  } catch (e) {
    captureError(e instanceof Error ? e : new Error(String(e)), { tags: { feature: 'listing-claim-notice' }, extra: { homeId: n.homeId, kind: n.kind } });
    return 'failed';
  }
}
