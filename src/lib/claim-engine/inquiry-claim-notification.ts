/**
 * Inquiry → Claim "pull" engine (OL-083) — sibling of the OL-079 claim email.
 *
 * When a family/caregiver inquires on an UNCLAIMED (directory-owned) listing, the
 * inquiry is ALWAYS captured (the `Inquiry` row) regardless of this function —
 * leads are never lost and surface on the operator dashboard the moment the home
 * is claimed (inquiries are keyed by `homeId`, which reassigns on claim).
 *
 * This function is the BEST-EFFORT notify layer on top of that capture: if we
 * know the operator's outreach email, mint a 45-day founder claim link and send
 * a Resend email (+ Twilio SMS when a phone is known). The notification IS the
 * claim CTA. When no contact is known, this no-ops and the public waiting-leads
 * counter on the listing is the organic claim driver instead.
 *
 * HIPAA: an inquiry may contain PHI (care needs). This path sends GENERIC copy
 * only — facility name + "a family is trying to reach you" — never inquiry/health
 * details. Actual content stays behind auth and is revealed only after claim.
 *
 * Idempotent (24h throttle via `claimNudgeLastSentAt`), non-blocking (callers
 * fire-and-forget), and Sentry-logged on failure — never throws.
 */

import { prisma } from '@/lib/prisma';
import { signClaimToken, DEFAULT_CLAIM_TOKEN_TTL_HOURS } from '@/lib/claim-token';
import { sendInquiryClaimNudgeEmail } from '@/lib/email';
import { smsService } from '@/lib/sms/sms-service';
import { captureError } from '@/lib/sentry';

/** Sentinel operator that owns unclaimed/directory listings (see seed scripts). */
export const DIRECTORY_UNCLAIMED_EMAIL = 'directory-unclaimed@carelinkai.system';

/** Don't nudge the same listing more than once per this window. */
export const NUDGE_THROTTLE_HOURS = 24;

/**
 * A listing is "unclaimed" when it is still owned by the directory sentinel
 * operator. (A DRAFT home owned by a real operator is NOT unclaimed.)
 */
export function isUnclaimedHome(operatorUserEmail: string | null | undefined): boolean {
  return (operatorUserEmail ?? '').toLowerCase() === DIRECTORY_UNCLAIMED_EMAIL;
}

function buildClaimUrl(homeId: string, operatorEmail: string, secret: string): string {
  const now = Math.floor(Date.now() / 1000);
  const token = signClaimToken(
    {
      operatorEmail: operatorEmail.toLowerCase(),
      homeId,
      clevelandFounder: true,
      iat: now,
      exp: now + DEFAULT_CLAIM_TOKEN_TTL_HOURS * 3600,
    },
    secret,
  );
  const appUrl =
    process.env['NEXT_PUBLIC_APP_URL'] || process.env['NEXTAUTH_URL'] || 'https://getcarelinkai.com';
  return `${appUrl.replace(/\/$/, '')}/auth/register?role=OPERATOR&claimToken=${encodeURIComponent(token)}`;
}

/**
 * Best-effort: nudge the operator of an unclaimed listing to claim, off the back
 * of a real inquiry. Safe to call on ANY inquiry — it self-filters to unclaimed
 * homes with a known outreach email.
 */
export async function notifyUnclaimedHomeInquiry(params: {
  homeId: string;
  inquiryId: string;
  /** What triggered the nudge. A tour is the hottest lead → more urgent copy. */
  trigger?: 'inquiry' | 'tour';
}): Promise<void> {
  const { homeId, inquiryId, trigger = 'inquiry' } = params;
  try {
    const home = await prisma.assistedLivingHome.findUnique({
      where: { id: homeId },
      select: {
        id: true,
        name: true,
        outreachEmail: true,
        outreachPhone: true,
        claimNudgeLastSentAt: true,
        operator: { select: { user: { select: { email: true } } } },
      },
    });

    if (!home) return;
    // Claimed homes are handled by the existing operator-alert path — skip.
    if (!isUnclaimedHome(home.operator?.user?.email)) return;

    const outreachEmail = home.outreachEmail?.trim();
    const outreachPhone = home.outreachPhone?.trim();
    // No bound email → nothing to send; the public waiting-leads counter drives
    // the claim instead. (A phone alone can't bind a claim token to an account.)
    if (!outreachEmail) return;

    // Idempotency: don't re-nudge within the throttle window.
    if (
      home.claimNudgeLastSentAt &&
      Date.now() - home.claimNudgeLastSentAt.getTime() < NUDGE_THROTTLE_HOURS * 3600 * 1000
    ) {
      return;
    }

    const secret = process.env['NEXTAUTH_SECRET'] || '';
    if (!secret) {
      console.error('[claim-engine] NEXTAUTH_SECRET not set — cannot mint claim link for nudge');
      return;
    }

    const waitingCount = await prisma.inquiry.count({ where: { homeId, status: 'NEW' } });
    const claimUrl = buildClaimUrl(home.id, outreachEmail, secret);

    await sendInquiryClaimNudgeEmail({
      facilityName: home.name,
      toEmail: outreachEmail,
      claimUrl,
      waitingCount,
      trigger,
    });

    if (outreachPhone) {
      if (trigger === 'tour') {
        await smsService.sendTourClaimNudge(outreachPhone, home.name, claimUrl);
      } else {
        await smsService.sendInquiryClaimNudge(outreachPhone, home.name, claimUrl);
      }
    }

    await prisma.assistedLivingHome.update({
      where: { id: home.id },
      data: { claimNudgeLastSentAt: new Date() },
    });

    console.log(`[claim-engine] Sent inquiry→claim nudge for "${home.name}" (${home.id})`);
  } catch (error) {
    captureError(error instanceof Error ? error : new Error(String(error)), {
      tags: { feature: 'inquiry-claim-notification' },
      extra: { homeId, inquiryId },
    });
  }
}
